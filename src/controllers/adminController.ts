import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";

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
