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
    name: candidate.firstName + " " + candidate.lastName,
    email: candidate.email,
    fileNumber: candidate.fileNumber,
    phoneNumber: candidate.phone,
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
