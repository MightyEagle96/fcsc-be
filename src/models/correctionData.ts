import { Schema, Types, model } from "mongoose";

export interface ICorrection {
  candidate: Types.ObjectId;
  correctionName: string;
  correctionField: string;
  reason: string;
  data: any;
  status: "pending" | "approved" | "rejected";
  dateApplied: Date;
  dateCorrected: Date;
  correctedBy: Schema.Types.ObjectId;
}

const correctionSchema = new Schema<ICorrection>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate" },
    correctionName: String,
    correctionField: String,
    reason: String,
    status: { type: String, default: "pending" },
    data: Schema.Types.Mixed,
    dateApplied: { type: Date, default: new Date() },
    dateCorrected: Date,
    correctedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export const CorrectionModel = model<ICorrection>(
  "Correction",
  correctionSchema
);
