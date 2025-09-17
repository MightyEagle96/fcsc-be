import { Types } from "mongoose";
import { CorrectionModel } from "../models/correctionData";
import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import { AuthenticatedAdmin } from "../models/adminLogin";

export const viewCorrections = async (req: Request, res: Response) => {
  try {
    interface Candidate {
      _id: Types.ObjectId;
      fullName: string;
      currentMDA: string;
      // add other fields you care about
    }

    interface CorrectionLean {
      _id: Types.ObjectId;
      candidate: Candidate; // after populate, it's no longer just ObjectId
      correctionName: string;
      correctionField: string;
      reason: string;
      status: string;
      data: any;
      dateApplied: Date;
      dateCorrected?: Date;
      correctedBy?: Types.ObjectId;
    }

    const corrections = await CorrectionModel.find()
      .lean<CorrectionLean[]>()
      .populate("candidate");

    const data = corrections
      .filter((c) => c.candidate !== null) // remove orphans
      .map((c, i) => ({
        ...c,
        name: c.candidate!.fullName,
        mda: c.candidate!.currentMDA,
        id: i + 1,
      }));

    res.send(data);
  } catch (error) {
    console.log(error);
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
