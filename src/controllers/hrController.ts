import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { JointInterface } from "./jwtController";
import mongoose from "mongoose";
import { ConcurrentJobQueue } from "../utils/DataQueue";

export const mdaCandidates = async (req: Request, res: Response) => {
  const [candidates, recommended, approved, totalUploadedDocuments] =
    await Promise.all([
      Candidate.countDocuments({ currentMDA: req.query.slug }),
      Candidate.countDocuments({
        currentMDA: req.query.slug,
        status: "recommended",
      }),
      Candidate.countDocuments({
        currentMDA: req.query.slug,
        status: "approved",
      }),
      Candidate.aggregate([
        {
          $match: {
            currentMDA: req.query.slug, // replace with the MDA you're filtering for
          },
        },
        {
          $unwind: "$uploadedDocuments",
        },
        {
          $match: {
            "uploadedDocuments.fileUrl": { $exists: true, $ne: "" },
          },
        },
        {
          $count: "totalDocuments",
        },
      ]),
    ]);

  res.send({
    candidates: candidates.toLocaleString(),
    recommended: recommended.toLocaleString(),
    approved: approved.toLocaleString(),
    totalUploadedDocuments: totalUploadedDocuments[0]?.totalDocuments || 0,
  });
};

export const viewMdaCandidates = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page || 1) as number;
    const limit = (req.query.limit || 50) as number;
    const candidates = await Candidate.find({
      currentMDA: req.query.slug,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Candidate.countDocuments({
      currentMDA: req.query.slug,
    });

    const totalCandidates = candidates.map((c, i) => {
      return {
        ...c,

        uploadedDocuments: c.uploadedDocuments.filter((c) => c.fileUrl).length,
        defaultPassword: c.passwords[0],
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

const recommendationQueue = new ConcurrentJobQueue({
  concurrency: 50,
  retryDelay: 1000,
  retries: 3,
  shutdownTimeout: 20000,
  maxQueueSize: 100,
});

export const recommendCandidate = async (
  req: JointInterface,
  res: Response
) => {
  try {
    recommendationQueue.enqueue(async () => {
      const candidate = await Candidate.findById(req.query.candidate);
      if (candidate && candidate.status !== "recommended") {
        candidate.recommendedBy = new mongoose.Types.ObjectId(
          req.admin?._id.toString()
        );
        candidate.dateRecommended = new Date();
        candidate.status = "recommended";
        await candidate.save();
      }
    });
  } catch (error) {
    console.log(error);
  } finally {
    res.send("Candidate recommended");
  }
};

const bulkRecommendationQueue = new ConcurrentJobQueue({
  concurrency: 50,
  retryDelay: 1000,
  retries: 3,
  shutdownTimeout: 20000,
  maxQueueSize: 100,
});
export const recommendMultipleCandidates = async (
  req: JointInterface,
  res: Response
) => {
  try {
    const result = await Candidate.aggregate([
      // Step 1: Match by MDA
      {
        $match: { currentMDA: req.admin?.mda }, // replace with your MDA
      },
      // Step 2: Filter uploadedDocuments where fileUrl is not null or empty
      {
        $addFields: {
          validDocs: {
            $filter: {
              input: "$uploadedDocuments",
              as: "doc",
              cond: {
                $and: [
                  { $ifNull: ["$$doc.fileUrl", false] },
                  { $ne: ["$$doc.fileUrl", ""] },
                ],
              },
            },
          },
        },
      },
      // Step 3: Only keep candidates with exactly 6 valid docs
      {
        $match: {
          $expr: { $eq: [{ $size: "$validDocs" }, 6] },
        },
      },
    ]);

    bulkRecommendationQueue.enqueue(async () => {
      await Candidate.updateMany(
        {
          _id: { $in: result.map((c) => c._id) },
          status: { $ne: "recommended" }, // only those not already recommended
        },
        {
          $set: {
            status: "recommended",
            recommendedBy: req.admin?._id,
            dateRecommended: new Date(),
          },
        }
      );
    });
  } catch (error) {
    console.log(error);
  } finally {
    res.send("Candidates recommended");
  }
};

export const viewRecommendedCandidates = async (
  req: JointInterface,
  res: Response
) => {
  const candidates = await Candidate.find({
    status: "recommended",
    currentMDA: req.admin?.mda,
  })
    .populate("recommendedBy")
    .lean();

  const filteredCandidates = candidates.map((c: any, i) => {
    return {
      ...c,
      id: i + 1,
      uploadedDocuments: c.uploadedDocuments.filter((c: any) => c.fileUrl)
        .length,
      recommendedBy: `${c.recommendedBy.firstName} ${c.recommendedBy.lastName}`,
      dateRecommended: new Date(c.dateRecommended).toLocaleString(),
    };
  });
  res.send(filteredCandidates);
};
