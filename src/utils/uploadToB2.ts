import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { b2 } from "../b2";

type IResult = {
  fileId: string;
  fileName: string;
  fileUrl: string;
};

/**
 * Wrapper to retry B2 calls if token expired (401 Unauthorized).
 */
export async function safeB2Call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.response?.status === 401) {
      console.warn("⚠️ Token expired, re-authorizing...");
      await b2.authorize();
      return fn(); // retry once
    }
    throw err;
  }
}

export const uploadFileToB2 = async (
  localFilePath: string,
  mimeType: string
): Promise<IResult | null> => {
  try {
    //await b2.authorize();
    const buffer = await fsPromises.readFile(localFilePath);
    // const mimeType = "application/pdf"; // for Puppeteer PDFs

    const uploadName = path.basename(localFilePath);

    // // Get upload URL
    // const { data } = await b2.getUploadUrl({
    //   bucketId: process.env.B2_BUCKET_ID as string,
    // });

    const existing = await b2.listFileNames({
      bucketId: process.env.B2_BUCKET_ID as string,
      prefix: uploadName, // or full file name
      maxFileCount: 1,
      startFileName: "",
      delimiter: "",
    });

    if (existing.data.files.length > 0) {
      const oldFile = existing.data.files[0];

      console.log(`🔄 File exists (${oldFile.fileName}), deleting...`);

      // delete old file version
      await safeB2Call(() =>
        b2.deleteFileVersion({
          fileId: oldFile.fileId,
          fileName: oldFile.fileName,
        })
      );
    }

    // 2. Get upload URL
    const { data } = await safeB2Call(() =>
      b2.getUploadUrl({
        bucketId: process.env.B2_BUCKET_ID as string,
      })
    );

    let fileUrl = "";
    console.log(`📤 Uploading ${uploadName} to B2...`);

    const result = await safeB2Call(() =>
      b2.uploadFile({
        uploadUrl: data.uploadUrl,
        uploadAuthToken: data.authorizationToken,
        fileName: uploadName,
        data: buffer,
        mime: mimeType,
      })
    );
    if (result) {
      fileUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${uploadName}`;

      return {
        fileUrl,
        fileName: result.data.fileName,
        fileId: result.data.fileId,
      };
    }
    return null;
  } catch (err) {
    console.error("Failed to upload PDF to B2:", err);
    // throw err;
    return null;
  }
};

export const uploadFileToB2WithFolder = async (
  localFilePath: string,
  mimeType: string,
  folder: string // e.g. "examcards"
): Promise<IResult | null> => {
  try {
    const buffer = await fsPromises.readFile(localFilePath);
    const baseName = path.basename(localFilePath);
    const uploadName = `${folder}/${baseName}`; // Put file in folder inside bucket

    console.log(`📁 Preparing upload to folder: ${folder}`);

    // 🔍 Check if a file with same name exists in the folder
    const existing = await safeB2Call(() =>
      b2.listFileNames({
        bucketId: process.env.B2_BUCKET_ID as string,
        prefix: uploadName,
        maxFileCount: 1,
        startFileName: "",
        delimiter: "",
      })
    );

    if (existing?.data?.files?.length > 0) {
      const oldFile = existing.data.files[0];
      console.log(`🔄 File already exists (${oldFile.fileName}), deleting...`);

      await safeB2Call(() =>
        b2.deleteFileVersion({
          fileId: oldFile.fileId,
          fileName: oldFile.fileName,
        })
      );
    }

    // ⚙️ Get new upload URL
    const { data } = await safeB2Call(() =>
      b2.getUploadUrl({
        bucketId: process.env.B2_BUCKET_ID as string,
      })
    );

    console.log(`📤 Uploading ${uploadName} to B2...`);

    // 🚀 Upload file
    const result = await safeB2Call(() =>
      b2.uploadFile({
        uploadUrl: data.uploadUrl,
        uploadAuthToken: data.authorizationToken,
        fileName: uploadName, // includes folder
        data: buffer,
        mime: mimeType,
      })
    );

    if (result) {
      const fileUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${uploadName}`;

      return {
        fileUrl,
        fileName: result.data.fileName,
        fileId: result.data.fileId,
      };
    }

    return null;
  } catch (err) {
    console.error("❌ Failed to upload file to B2 folder:", err);
    return null;
  }
};

export function scheduleB2Reauth() {
  const TWENTY_THREE_HOURS = 23 * 60 * 60 * 1000;

  setInterval(async () => {
    try {
      console.log("🔄 Refreshing B2 token...");
      await b2.authorize();
      console.log("✅ B2 token refreshed successfully");
    } catch (err) {
      console.error("❌ Failed to refresh B2 token:", err);
    }
  }, TWENTY_THREE_HOURS);
}
