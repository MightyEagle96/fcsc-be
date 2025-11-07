import { Request, Response } from "express";
import { AuthenticatedCandidate, Candidate } from "../models/candidateModel";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { uploadFileToB2, uploadFileToB2WithFolder } from "../utils/uploadToB2";
import { SendSms } from "../utils/smsHandler";
import { AuthenticatedAdmin } from "../models/adminLogin";
import axios from "axios";
import pdf from "pdf-poppler";
import { fromPath } from "pdf2pic";
import os from "os";

export async function generateLetterFunc(data: any): Promise<string> {
  try {
    const htmlPath = path.resolve(__dirname, "../assets/examcardTemplate.html");

    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Template file not found: ${htmlPath}`);
    }

    const logoBase64 = fs
      .readFileSync(path.resolve(__dirname, "../assets/logo.png"))
      .toString("base64");

    // Ensure the file exists before reading
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Template file not found: ${htmlPath}`);
    }

    const qrCodeBase64 = await QRCode.toDataURL(data._id.toString());

    let htmlTemplate = fs.readFileSync(htmlPath, "utf8");

    htmlTemplate = htmlTemplate
      .replace(/{{year}}/g, new Date().getFullYear().toString())
      .replace(/{{passport}}/g, data.passport ? data.passport : "")
      .replace(/{{logo}}/g, `data:image/png;base64,${logoBase64}`)
      .replace(/{{qrCode}}/g, qrCodeBase64)
      .replace(/{{ippisNumber}}/g, data.ippisNumber)
      .replace(/{{name}}/g, data.fullName)
      .replace(/{{emailAddress}}/g, data.email)
      .replace(/{{gradeLevel}}/g, data.gradeLevel)
      .replace(/{{cadre}}/g, data.cadre)
      .replace(/{{phoneNumber}}/g, data.phoneNumber)
      .replace(/{{examCentre}}/g, data.examCentreAddress)
      .replace(/{{examDate}}/g, data.examDate)
      .replace(/{{examTime}}/g, data.examTime)
      .replace(/{{examNumber}}/g, data.examNumber)
      .replace(/{{seatNumber}}/g, data.seatNumber);

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlTemplate);

    const outputPath = path.join(
      __dirname,
      `examcards/${data.ippisNumber}.pdf`
    );

    //ensure the directory exists
    //ensure the directory exists
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await page.pdf({
      path: outputPath,
      height: "1450px",
      width: "800px",
      printBackground: true,
    });

    await browser.close();

    console.log(`✅ Letter generated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("❌ Error generating certificate:", error);
    return "";
  }
}

const BATCH_SIZE = 5; // process 5 candidates in parallel

export const generateLetter = async (req: Request, res: Response) => {
  try {
    const candidates = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).send("No candidates provided");
    }

    console.log(`📄 Generating letters for ${candidates.length} candidates...`);

    // Split candidates into chunks of 5
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (payload) => {
          try {
            const candidate = await Candidate.findOne({
              ippisNumber: payload.ippisNumber,
            }).lean();

            if (!candidate) {
              console.warn(`⚠️ Candidate not found: ${payload.ippisNumber}`);
              return;
            }

            // 🔄 Update candidate info before letter generation
            await Candidate.updateOne(
              { _id: candidate._id },
              { $set: { ...payload } }
            );

            // 🧾 Generate PDF letter
            const outputPath = await generateLetterFunc({
              ...candidate,
              ...payload,
              passport:
                candidate.uploadedDocuments?.find(
                  (c) => c.fileType === "Passport Photograph"
                )?.fileUrl || "",
            });

            // ☁️ Upload to Backblaze B2
            const result = await uploadFileToB2WithFolder(
              outputPath,
              "application/pdf",
              "examcards"
            );

            if (result) {
              // 🗃️ Update candidate record with uploaded file metadata
              await Candidate.updateOne(
                { _id: candidate._id },
                {
                  $set: {
                    fileId: result.fileId,
                    fileName: result.fileName,
                    fileUrl: result.fileUrl,
                  },
                }
              );
            }

            // 🧹 Cleanup local file
            try {
              await fs.promises.unlink(outputPath);
            } catch (unlinkErr) {
              console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
            }

            console.log(`✅ Processed: ${payload.ippisNumber}`);
          } catch (err) {
            console.error(`❌ Error processing ${payload.ippisNumber}:`, err);
          }
        })
      );
    }

    res.send("✅ Letters generated and uploaded successfully");
  } catch (err) {
    console.error("❌ Error generating letters:", err);
    res.status(500).send("Error generating letters");
  }
};
export const viewCandidate = async (req: Request, res: Response) => {
  const candidate = await Candidate.findById(req.query.id).lean();

  if (!candidate) {
    return res.status(404).send("Candidate not found");
  }
  res.send(candidate);
};

export const viewMySlip = async (
  req: AuthenticatedCandidate,
  res: Response
) => {
  const candidate = await Candidate.findOne({
    _id: req.candidate?._id,
    fileUrl: { $exists: true },
  }).lean();

  if (!candidate) {
    return res.status(404).send("Candidate not found");
  }

  res.send(candidate.fileUrl);
};

export const printSlip = async (req: AuthenticatedCandidate, res: Response) => {
  const candidate = await Candidate.findById(req.candidate?._id);

  if (!candidate) {
    return res.status(404).send("Candidate not found");
  }

  await Candidate.updateOne(
    { _id: candidate._id },
    {
      $set: {
        hasViewedSlip: true,
        timeViewedSlip: new Date(),
        printCount: candidate.printCount + 1,
      },
    }
  );

  res.send("Slip printed");
};

export const adminEmail = "mightyeaglecorp@gmail.com";
export const notifyParticipants = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    if (req.admin?.email !== adminEmail) {
      return res.status(403).send("You are forbidden from doing this");
    }
    res.send("📢 Sending out notifications...");

    const candidates = await Candidate.find({
      examCentreAddress: { $exists: true },
      fileId: { $exists: true },
      //printCount: { $lt: 1 },
    }).lean();

    if (!candidates.length) {
      console.log("No candidates to notify");
      return;
    }

    console.log(`📨 Found ${candidates.length} candidates to notify.`);

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (candidate) => {
          try {
            const phoneNumber = `234${candidate.phoneNumber.slice(1)}`;
            const message = smsMessage(
              candidate.fullName.toUpperCase(),
              candidate.examCentreAddress.toUpperCase()
            );

            console.log({ message, phoneNumber });

            await SendSms(message, phoneNumber);

            console.log(`✅ Notified ${candidate.fullName}`);

            // optional: update printCount or add a log
            // await Candidate.updateOne(
            //   { _id: candidate._id },
            //   { $inc: { printCount: 1 } }
            // );
          } catch (err) {
            console.error(`❌ Error notifying ${candidate.fullName}:`, err);
          }
        })
      );

      console.log(`🚀 Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
    }

    console.log("✅ All notifications sent successfully.");
  } catch (err) {
    console.error("❌ Error sending notifications:", err);
  }
};

const smsMessage = (name: string, centre: string) =>
  `Dear ${name}, your exam card is ready. Your centre is ${centre}. Kindly log on to https://promotion.fedcivilservice.gov.ng to print your card and ensure you present same at your centre.`;

export const generateSlipForACandidate = async (
  req: Request,
  res: Response
) => {
  try {
    const candidate = await Candidate.findOne({
      ippisNumber: req.body.ippisNumber,
    }).lean();

    if (!candidate) {
      return res.status(404).send("Candidate not found");
    }

    if (!candidate.examCentreAddress) {
      return res
        .status(400)
        .send("This candidate was not selected for this exam");
    }

    const outputPath = await generateLetterFunc({
      ...candidate,
      passport:
        candidate.uploadedDocuments?.find(
          (c) => c.fileType === "Passport Photograph"
        )?.fileUrl || "",
    });

    // ☁️ Upload to Backblaze B2
    const result = await uploadFileToB2WithFolder(
      outputPath,
      "application/pdf",
      "examcards"
    );

    if (result) {
      // 🗃️ Update candidate record with uploaded file metadata
      await Candidate.updateOne(
        { _id: candidate._id },
        {
          $set: {
            fileId: result.fileId,
            fileName: result.fileName,
            fileUrl: result.fileUrl,
          },
        }
      );
    }
    // 🧹 Cleanup local file
    try {
      await fs.promises.unlink(outputPath);
    } catch (unlinkErr) {
      console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
    }

    res.send("File generated");
  } catch (error) {
    res.status(500).send("Server error");
  }
};

export const candidatesWithPdfAsPassport = async (
  req: Request,
  res: Response
) => {
  const candidates = await Candidate.aggregate([
    // 1️⃣ Only candidates who have an examCentreAddress
    { $match: { examCentreAddress: { $exists: true, $ne: "" } } },

    // 2️⃣ Unwind the uploadedDocuments array to inspect each item individually
    { $unwind: "$uploadedDocuments" },

    // 3️⃣ Filter to only "Passport Photograph" PDFs
    {
      $match: {
        "uploadedDocuments.fileType": "Passport Photograph",
        $or: [
          { "uploadedDocuments.fileUrl": { $regex: /\.pdf$/i } },
          { "uploadedDocuments.fileName": { $regex: /\.pdf$/i } },
        ],
      },
    },

    // 4️⃣ Project just the info you want
    {
      $project: {
        _id: 1,
        fullName: 1,
        ippisNumber: 1,
        email: 1,
        phoneNumber: 1,
        examCentreAddress: 1,
        "uploadedDocuments.fileName": 1,
        "uploadedDocuments.fileUrl": 1,
        "uploadedDocuments.fileType": 1,
      },
    },
  ]);

  res.send(candidates);
};

export const convertAndReuploadPassportPdfs = async (
  req: Request,
  res: Response
) => {
  res.send("Conversion started!");
  await convertAndUploadPassportPdfs();
};

const TEMP_DIR = path.join(os.tmpdir(), "pdf_conversion");

export const convertAndUploadPassportPdfs = async () => {
  // ensure temp dir exists
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });

  // Step 1: Find all candidates with PDF passport uploads
  const candidates = await Candidate.aggregate([
    { $match: { examCentreAddress: { $exists: true, $ne: "" } } },
    { $unwind: "$uploadedDocuments" },
    {
      $match: {
        "uploadedDocuments.fileType": "Passport Photograph",
        $or: [
          { "uploadedDocuments.fileUrl": { $regex: /\.pdf$/i } },
          { "uploadedDocuments.fileName": { $regex: /\.pdf$/i } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        "uploadedDocuments.fileUrl": 1,
        "uploadedDocuments.fileName": 1,
      },
    },
  ]);

  console.log(`📄 Found ${candidates.length} PDF passport photos.`);

  for (const cand of candidates) {
    const { fileUrl, fileName } = cand.uploadedDocuments;
    const safeName = fileName || `${cand._id}.pdf`;
    const pdfPath = path.join(TEMP_DIR, safeName);
    const jpgBaseName = path.basename(safeName, ".pdf");

    try {
      // Step 2: Download PDF
      console.log(`⬇️ Downloading PDF for ${cand._id}`);
      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer",
      });
      await fs.promises.writeFile(pdfPath, response.data);

      // Step 3: Convert PDF → JPG using pdf2pic
      console.log(`🖼️ Converting ${safeName} to JPG...`);
      const convert = fromPath(pdfPath, {
        density: 150,
        saveFilename: jpgBaseName,
        savePath: TEMP_DIR,
        format: "jpg",
        width: 600,
        height: 800,
      });

      const result = await convert(1); // convert only first page
      const jpgPath = result.path as string;

      // Step 4: Upload JPG to Backblaze
      console.log(`☁️ Uploading JPG for ${cand._id}...`);
      const uploadResult = await uploadFileToB2(jpgPath, "image/jpeg");
      if (!uploadResult) {
        console.error(`⚠️ Upload failed for ${cand._id}`);
        continue;
      }

      // Step 5: Update MongoDB record
      await Candidate.updateOne(
        { _id: cand._id, "uploadedDocuments.fileUrl": fileUrl },
        {
          $set: {
            "uploadedDocuments.$.fileUrl": uploadResult.fileUrl,
            "uploadedDocuments.$.fileName": uploadResult.fileName,
            "uploadedDocuments.$.fileId": uploadResult.fileId,
            "uploadedDocuments.$.updatedAt": new Date(),
          },
        }
      );

      console.log(`✅ Converted and updated candidate: ${cand._id}`);

      // Step 6: Cleanup temp files
      await fs.promises.unlink(pdfPath);
      await fs.promises.unlink(jpgPath);
    } catch (err: any) {
      console.error(`❌ Error processing ${cand._id}:`, err.message);
    }
  }

  console.log("🎯 Conversion complete!");
  process.exit();
};

export const generateSlipForCandidates = async (
  req: Request,
  res: Response
) => {
  const ippisObjects = req.body;
  const BATCH_SIZE = 5;

  // Validate input
  if (!Array.isArray(ippisObjects) || ippisObjects.length === 0) {
    return res.status(400).send("Array of { ippisNumber } objects required");
  }

  // Extract ippisNumbers into a simple array
  const ippisNumbers = ippisObjects
    .map((obj) => obj.ippisNumber)
    .filter(Boolean);
  if (ippisNumbers.length === 0) {
    return res.status(400).send("No valid ippisNumbers provided");
  }

  const results = [];

  try {
    // Split into batches of 5
    for (let i = 0; i < ippisNumbers.length; i += BATCH_SIZE) {
      const batch = ippisNumbers.slice(i, i + BATCH_SIZE);
      console.log(`🚀 Processing batch ${i / BATCH_SIZE + 1}:`, batch);

      // Process each batch concurrently
      const batchResults = await Promise.all(
        batch.map(async (ippisNumber) => {
          try {
            const candidate = await Candidate.findOne({ ippisNumber }).lean();
            if (!candidate) return { ippisNumber, status: "not_found" };

            if (!candidate.examCentreAddress)
              return { ippisNumber, status: "not_selected" };

            const passport =
              candidate.uploadedDocuments?.find(
                (c) => c.fileType === "Passport Photograph"
              )?.fileUrl || "";

            console.log(`📄 Generating slip for ${ippisNumber}`);
            const outputPath = await generateLetterFunc({
              ...candidate,
              passport,
            });

            const result = await uploadFileToB2WithFolder(
              outputPath,
              "application/pdf",
              "examcards"
            );

            if (result) {
              await Candidate.updateOne(
                { _id: candidate._id },
                {
                  $set: {
                    fileId: result.fileId,
                    fileName: result.fileName,
                    fileUrl: result.fileUrl,
                  },
                }
              );
            }

            // 🧹 Cleanup local file
            try {
              await fs.promises.unlink(outputPath);
            } catch (unlinkErr) {
              console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
            }

            console.log(`✅ Done for ${ippisNumber}`);
            return { ippisNumber, status: "success", fileUrl: result?.fileUrl };
          } catch (err: any) {
            console.error(`❌ Error processing ${ippisNumber}:`, err.message);
            return { ippisNumber, status: "error", message: err.message };
          }
        })
      );

      results.push(...batchResults);
      console.log(`✅ Batch ${i / BATCH_SIZE + 1} completed`);
    }

    // Summary
    const summary = {
      total: ippisNumbers.length,
      success: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      notFound: results.filter((r) => r.status === "not_found").length,
      notSelected: results.filter((r) => r.status === "not_selected").length,
    };

    res.json({ summary, results });
  } catch (err) {
    console.error("❌ Fatal error:", err);
    res.status(500).send("Server error");
  }
};
