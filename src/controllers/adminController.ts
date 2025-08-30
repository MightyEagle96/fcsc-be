import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { AdminModel } from "../models/adminLogin";
import { ConcurrentJobQueue } from "../utils/DataQueue";
import bcrypt from "bcrypt";

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
export const loginAdmin = async (req: Request, res: Response) => {};

const jobQueue = new ConcurrentJobQueue({
  concurrency: 50,
  retryDelay: 1000,
  retries: 3,
  shutdownTimeout: 20000,
  maxQueueSize: 100,
});
export const createAccount = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const admin = await AdminModel.findOne({ email });

  if (admin) {
    return res.status(400).send("Admin already exists");
  }

  res.send("Account created");
  jobQueue.enqueue(async () => {
    const hashedPassowrd = await bcrypt.hash(password, 10);
    const newAdmin = new AdminModel({ email, password: hashedPassowrd });
    await newAdmin.save();
    return newAdmin;
  });
};
