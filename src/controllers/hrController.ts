import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { JointInterface } from "./jwtController";
import mongoose from "mongoose";
import { ConcurrentJobQueue } from "../utils/DataQueue";

export const mdaCandidates = async (req: Request, res: Response) => {
  const [candidates, recommended, totalUploadedDocuments] = await Promise.all([
    Candidate.countDocuments({ currentMDA: req.query.slug }),
    Candidate.countDocuments({ currentMDA: req.query.slug, recommended: true }),
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
      if (candidate && candidate.recommended === false) {
        candidate.recommendedBy = new mongoose.Types.ObjectId(
          req.admin?._id.toString()
        );
        candidate.dateRecommended = new Date();
        candidate.recommended = true;
        await candidate.save();
      }
    });
  } catch (error) {
    console.log(error);
  } finally {
    res.send("Candidate recommended");
  }
};
