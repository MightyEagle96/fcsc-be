import { Request, Response } from "express";
import {
  AuthenticatedCandidate,
  Candidate,
  ICandidate,
} from "../models/candidateModel";
import generateRandomPassword from "../utils/generateRandomPassword";
import bcrypt from "bcrypt";
import { generateRefreshToken, generateToken, tokens } from "./jwtController";
import jwt from "jsonwebtoken";
import { documentsToUpload } from "../utils/documents";
import { rename, unlink } from "fs";
import { AsyncQueue, ConcurrentJobQueue } from "../utils/DataQueue";
import path from "path";
import { uploadFileToB2 } from "../utils/uploadToB2";

export const batchUploadCandidates = async (req: Request, res: Response) => {
  //res.send("Hello");

  try {
    const candidates = req.body; // expect array of candidate objects
    const saltRounds = 10;

    const processedCandidates = await Promise.all(
      candidates.map(async (candidate: Partial<ICandidate>) => {
        const plainPassword = generateRandomPassword(10);
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        return {
          ...candidate,
          passwords: [plainPassword],
          password: hashedPassword, // store only hashed password
          // if you want to track that it’s system-generated
          isDefaultPassword: true,
          uploadedDocuments: documentsToUpload,
        };
      })
    );
    // Bulk insert
    const result = await Candidate.insertMany(processedCandidates, {
      ordered: false,
    });

    res.status(201).json({
      message: "Bulk upload successful",
      insertedCount: result.length,
    });
  } catch (err) {
    console.error("Bulk insert error:", err);
    res.status(500).json({ message: "Error uploading candidates" });
  }
};

export const loginCandidate = async (req: Request, res: Response) => {
  const candidate = await Candidate.findOne({ email: req.body.email });

  if (!candidate) {
    return res.status(404).send("Candidate not found");
  }

  const isPasswordValid = await bcrypt.compare(
    req.body.password,
    candidate.password
  );

  if (isPasswordValid) {
    const accessToken = generateToken({ _id: candidate._id });

    const refreshToken = generateRefreshToken({ _id: candidate._id });

    res
      .cookie(tokens.auth_token, accessToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60, // 1h
      })
      .cookie(tokens.refresh_token, refreshToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
      })
      .send("Logged In");
  } else {
    res.status(401).send("Invalid password");
  }
};

export const myProfile = async (req: AuthenticatedCandidate, res: Response) => {
  const candidate: Partial<ICandidate> = req.candidate as ICandidate;
  res.send({
    _id: candidate._id,
    name: candidate.fullName,
    email: candidate.email,
    ippisNumber: candidate.ippisNumber,
    phoneNumber: candidate.phoneNumber,
    passport:
      candidate.uploadedDocuments?.find(
        (c) => c.fileType === "Passport Photograph"
      )?.fileUrl || "",
  });
};

export const logoutCandidate = async (req: Request, res: Response) => {
  res
    .clearCookie(tokens.auth_token)
    .clearCookie(tokens.refresh_token)
    .send("Logged Out");
};

export const getRefreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies[tokens.refresh_token];

  if (!refreshToken) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN as string
    );

    const candidate = await Candidate.findById(decoded._id);

    if (!candidate) {
      return res.status(401).send("Invalid refresh token");
    }

    const accessToken = generateToken({ _id: candidate._id });

    const newRefreshToken = generateRefreshToken({ _id: candidate._id });
    res
      .cookie(tokens.auth_token, accessToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60, // 1h
      })
      .cookie(tokens.refresh_token, newRefreshToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
      })
      .send("Logged In");
  } catch (error) {
    console.error(error);
    res.status(401).send("Invalid refresh token");
  }
  //  res.send(req.cookies[tokens.refresh_token]);
};

export const viewMyDocuments = async (
  req: AuthenticatedCandidate,
  res: Response
) => {
  const uploadedDocuments = req.candidate?.uploadedDocuments.filter(
    (c) => c.fileUrl
  ).length;

  res.send({ documents: req.candidate?.uploadedDocuments, uploadedDocuments });
};

const uploadQueue = new ConcurrentJobQueue({
  concurrency: 10,
  maxQueueSize: 100,
  retries: 3,
  retryDelay: 1000,
  shutdownTimeout: 20000,
});
export const uploadDocument = async (
  req: AuthenticatedCandidate,
  res: Response
) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const extension = path.extname(req.file.originalname);
  const fileData = {
    oldName: `./uploads/${req.file.filename}`,
    newName: `./uploads/${req.headers.documentid}${extension}`,
    path: req.file.path,
    candidate: req.candidate?._id,
    documentId: req.headers.documentid,
    mimetype: req.file.mimetype,
  };

  uploadQueue.enqueue(async () => {
    rename(fileData.oldName, fileData.newName, (err) => {
      if (err) {
        console.error("Error renaming file:", err);
      }

      uploadFileToB2(fileData.newName, fileData.mimetype)
        .then(async (result) => {
          if (result) {
            await Candidate.updateOne(
              {
                _id: fileData.candidate,
                "uploadedDocuments._id": fileData.documentId,
              },
              {
                $set: {
                  "uploadedDocuments.$.fileUrl": result.fileUrl,
                  "uploadedDocuments.$.fileName": result.fileName,
                  "uploadedDocuments.$.fileId": result.fileId,
                  "uploadedDocuments.$.updatedAt": new Date(),
                },
              }
            );
            console.log(`File uploaded successfully ✅`);
          }
        })
        .catch((error) => {
          console.error("Error uploading file to B2:", error);
        })
        .finally(() => {
          unlink(fileData.newName, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            }
          });
        });
    });
  });

  res.send("File uploaded successfully");
};
