import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { JointInterface } from "./jwtController";
import { stat } from "fs";

export const promotionDashboard = async (req: Request, res: Response) => {
  // const [recommended, notRecommended, rejected] = await Promise.all([
  //   Candidate.countDocuments({ recommended: true }),
  //   Candidate.countDocuments({ recommended: false }),
  //   Candidate.countDocuments({ rejected: true }),
  // ]);

  const [recommended, approved] = await Promise.all([
    Candidate.countDocuments({ status: "recommended" }),
    Candidate.countDocuments({ status: "approved" }),
  ]);
  res.send({
    recommended: recommended.toLocaleString(),
    approved: approved.toLocaleString(),
    // notRecommended: notRecommended.toLocaleString(),
    // rejected: rejected.toLocaleString(),
  });
};

export const recommendedCandidates = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page || 1) as number;
    const limit = (req.query.limit || 50) as number;
    const candidates = await Candidate.find({ status: "recommended" })
      .populate("recommendedBy")
      .select({
        fullName: 1,
        currentMDA: 1,
        recommendedBy: 1,
        dateRecommended: 1,
        year2021: 1,
        year2022: 1,
        year2023: 1,
        year2024: 1,
        remark: 1,
        approved: 1,
        dateApproved: 1,
        approvedBy: 1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Candidate.countDocuments({ status: "recommended" });

    const totalCandidates = candidates.map((c: any, i) => {
      return {
        ...c,
        recommendedBy: `${c.recommendedBy.firstName} ${c.recommendedBy.lastName}`,
        remark: c.remark,
        id: (page - 1) * limit + i + 1,
      };
    });
    res.send({
      candidates: totalCandidates,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.send({
      candidates: [],
      total: 0,
      page: 0,
      limit: 0,
    });
  }
};

export const approveCandidate = async (req: JointInterface, res: Response) => {
  await Candidate.findByIdAndUpdate(req.query.candidate, {
    status: "approved",
    dateApproved: new Date(),
    approvedBy: req.admin?._id,
  });
  res.send("Candidate approved");
};

export const approvedCandidates = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page || 1) as number;
    const limit = (req.query.limit || 50) as number;
    const candidates = await Candidate.find({ status: "approved" })
      .populate("approvedBy")
      .select({
        fullName: 1,
        currentMDA: 1,
        approvedBy: 1,

        remark: 1,
        status: 1,
        dateApproved: 1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Candidate.countDocuments({ status: "approved" });

    const totalCandidates = candidates.map((c: any, i) => {
      return {
        ...c,
        approvedBy: `${c.approvedBy.firstName} ${c.approvedBy.lastName}`,
        remark: c.remark,
        id: (page - 1) * limit + i + 1,
      };
    });
    res.send({
      candidates: totalCandidates,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.send({
      candidates: [],
      total: 0,
      page: 0,
      limit: 0,
    });
  }
};
