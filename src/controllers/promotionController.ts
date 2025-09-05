import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { JointInterface } from "./jwtController";
import { stat } from "fs";

export const promotionDashboard = async (req: Request, res: Response) => {
  const [recommended, approved] = await Promise.all([
    Candidate.countDocuments({ status: "recommended" }),
    Candidate.countDocuments({ status: "approved" }),
  ]);
  res.send({
    recommended: recommended.toLocaleString(),
    approved: approved.toLocaleString(),
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

export const viewCandidatesAcrossMDA = async (req: Request, res: Response) => {
  // const result = await Candidate.aggregate([
  //   // Ensure uploadedDocuments with valid fileUrl only
  //   {
  //     $addFields: {
  //       validDocs: {
  //         $filter: {
  //           input: "$uploadedDocuments",
  //           as: "doc",
  //           cond: {
  //             $and: [
  //               { $ifNull: ["$$doc.fileUrl", false] }, // not null
  //               { $ne: ["$$doc.fileUrl", ""] }, // not empty
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   },
  //   // Only keep candidates with at least 6 valid docs
  //   {
  //     $match: {
  //       $expr: { $gte: [{ $size: "$validDocs" }, 6] },
  //     },
  //   },
  //   // Group by currentMDA and count
  //   {
  //     $group: {
  //       _id: "$currentMDA",
  //       count: { $sum: 1 },
  //     },
  //   },
  //   // Optional: sort by count descending
  //   {
  //     $sort: { count: -1 },
  //   },
  // ]);

  // const result = await Candidate.aggregate([
  //   // Step 1: Filter docs (same as before)
  //   {
  //     $addFields: {
  //       validDocs: {
  //         $filter: {
  //           input: "$uploadedDocuments",
  //           as: "doc",
  //           cond: {
  //             $and: [
  //               { $ifNull: ["$$doc.fileUrl", false] },
  //               { $ne: ["$$doc.fileUrl", ""] },
  //             ],
  //           },
  //         },
  //       },
  //     },
  //   },
  //   // Step 2: Mark those with >= 6 valid docs
  //   {
  //     $addFields: {
  //       hasSixDocs: { $gte: [{ $size: "$validDocs" }, 6] },
  //     },
  //   },
  //   // Step 3: Group by MDA and count only those with hasSixDocs = true
  //   {
  //     $group: {
  //       _id: "$currentMDA",
  //       count: {
  //         $sum: {
  //           $cond: [{ $eq: ["$hasSixDocs", true] }, 1, 0],
  //         },
  //       },
  //     },
  //   },
  //   // Step 4: Ensure all MDAs show up, even with 0
  //   {
  //     $project: {
  //       _id: 0,
  //       currentMDA: "$_id",
  //       candidateCount: "$count",
  //     },
  //   },
  //   {
  //     $sort: { candidateCount: -1 },
  //   },
  // ]);

  const result = await Candidate.aggregate([
    // Step 1: Group by currentMDA, counting only "recommended" candidates
    {
      $group: {
        _id: "$currentMDA",
        candidateCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "recommended"] }, 1, 0],
          },
        },
      },
    },
    // Step 2: Reshape output
    {
      $project: {
        _id: 0,
        currentMDA: "$_id",
        candidateCount: 1,
      },
    },
    // Step 3: Sort (optional)
    {
      $sort: { candidateCount: -1 },
    },
  ]);

  const arrangedResults = result.map((c, i) => {
    return { ...c, id: i + 1 };
  });
  res.send(arrangedResults);
};
