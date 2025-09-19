import { Types } from "mongoose";
import { CorrectionModel } from "../models/correctionData";
import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { AuthenticatedAdmin } from "../models/adminLogin";

export const viewCorrections = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const corrections = await CorrectionModel.aggregate([
      // Add custom sort order
      {
        $addFields: {
          sortOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 0 },
                { case: { $eq: ["$status", "approved"] }, then: 1 },
                { case: { $eq: ["$status", "rejected"] }, then: 2 },
              ],
              default: 99,
            },
          },
        },
      },
      // Sort by sortOrder first, then maybe by dateApplied descending
      { $sort: { sortOrder: 1, dateApplied: -1 } },

      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // Lookup candidate (like populate)
      {
        $lookup: {
          from: "candidates",
          localField: "candidate",
          foreignField: "_id",
          as: "candidate",
        },
      },
      { $unwind: "$candidate" }, // remove array wrapper
    ]);

    // Get total count (without pagination)
    const total = await CorrectionModel.countDocuments();

    // Transform to match your original response
    const data = corrections.map((c, i) => ({
      ...c,
      name: c.candidate.fullName,
      mda: c.candidate.currentMDA,
      id: (page - 1) * limit + i + 1,
    }));

    res.send({
      corrections: data,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error occurred");
  }
};

export const viewCorrection = async (req: Request, res: Response) => {
  try {
    const correction = await CorrectionModel.findById(req.query.id as string);

    if (!correction) {
      return res.status(404).send("Correction not found");
    }

    const candidate = await Candidate.findById(correction.candidate as any)
      .select({ [correction.correctionField]: 1 })
      .lean();

    if (!candidate) {
      return res.status(404).send("Candidate not found");
    }

    res.send({
      _id: correction._id,
      reason: correction.reason,
      status: correction.status,
      newData: correction.data,
      oldData:
        candidate[correction.correctionField as keyof typeof candidate] ?? "-",
    });
  } catch (error) {
    console.error("viewCorrection error:", error);
    res.status(500).send("Error occurred");
  }
};

export const approveCorrection = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    const correction = await CorrectionModel.findById(req.query.id as string);
    if (!correction) {
      return res.status(404).send("Correction not found");
    }

    const candidate = await Candidate.findOne({ _id: correction.candidate });

    await CorrectionModel.findByIdAndUpdate(req.query.id as string, {
      status: "approved",
      dateCorrected: new Date(),
      correctedBy: req.admin?._id,
      oldData:
        candidate?.[correction.correctionField as keyof typeof candidate],
    });

    await Candidate.updateOne(
      { _id: correction.candidate },
      {
        $set: {
          [correction.correctionField]: correction.data,
        },
      }
    );

    await CorrectionModel.findByIdAndUpdate(req.query.id as string, {
      status: "approved",
      dateCorrected: new Date(),
      correctedBy: req.admin?._id,
    });
    res.send("Correction approved");
  } catch (error) {
    console.error("approveCorrection error:", error);
    res.status(500).send("Error occurred");
  }
};

export const correctionsDashboard = async (req: Request, res: Response) => {
  try {
    const [pending, approved, total] = await Promise.all([
      CorrectionModel.countDocuments({ status: "pending" }),
      CorrectionModel.countDocuments({ status: "approved" }),
      CorrectionModel.countDocuments(),
    ]);

    res.send({
      pending: pending.toLocaleString(),
      approved: approved.toLocaleString(),
      total: total.toLocaleString(),
    });
  } catch (error) {
    console.error("correctionsDashboard error:", error);
    res.status(500).send("Error occurred");
  }
};
