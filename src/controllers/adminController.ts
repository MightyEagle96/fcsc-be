import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { AdminModel } from "../models/adminLogin";
import { ConcurrentJobQueue } from "../utils/DataQueue";
import bcrypt from "bcrypt";
import { generateRefreshToken, generateToken, tokens } from "./jwtController";

//view candidates
export const viewCandidates = async (req: Request, res: Response) => {
  const page = (req.query.page || 1) as number;
  const limit = (req.query.limit || 50) as number;
  const candidates = await Candidate.find()
    .skip((page - 1) * limit)
    .limit(limit);

  res.send(candidates);
};

//export const login
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res.status(400).send("Admin not found");
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).send("Invalid password");
    }

    const accessToken = generateToken({ _id: admin._id, role: "admin" });

    const refreshToken = generateRefreshToken({
      _id: admin._id,
      role: "admin",
    });

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
  } catch (error) {
    console.log(error);
  }
};

const jobQueue = new ConcurrentJobQueue({
  concurrency: 50,
  retryDelay: 1000,
  retries: 3,
  shutdownTimeout: 20000,
  maxQueueSize: 100,
});
export const createAccount = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await AdminModel.findOne({ email });

    if (admin) {
      return res.status(400).send("Admin already exists");
    }

    res.send("Account created");
    jobQueue.enqueue(async () => {
      const hashedPassowrd = await bcrypt.hash(password, 10);
      const newAdmin = new AdminModel({
        ...req.body,
        email,
        password: hashedPassowrd,
      });
      await newAdmin.save();
    });
  } catch (error) {
    console.log(error);
  }
};

export const dashboardSummary = async (req: Request, res: Response) => {
  const [candidates, verifiedCandidates, unverifiedCandidates] =
    await Promise.all([
      Candidate.countDocuments(),
      Candidate.countDocuments({ verified: true }),
      Candidate.countDocuments({ verified: false }),
    ]);

  res.send({
    candidates: candidates.toLocaleString(),
    verifiedCandidates: verifiedCandidates.toLocaleString(),
    unverifiedCandidates: unverifiedCandidates.toLocaleString(),
  });
};
