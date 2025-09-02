import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";

export const promotionDashboard = async (req: Request, res: Response) => {
  const [recommended, notRecommended, rejected] = await Promise.all([
    Candidate.countDocuments({ recommended: true }),
    Candidate.countDocuments({ recommended: false }),
    Candidate.countDocuments({ rejected: true }),
  ]);

  res.send({
    recommended: recommended.toLocaleString(),
    notRecommended: notRecommended.toLocaleString(),
    rejected: rejected.toLocaleString(),
  });
};
