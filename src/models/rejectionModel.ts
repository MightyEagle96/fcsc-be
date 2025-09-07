import { Schema, Types, model } from "mongoose";

export interface IRejection {
  candidate: Types.ObjectId;
  reason: string;
  notifiedByEmail: boolean;
  notifiedBySms: boolean;
}

const rejectionSchema = new Schema<IRejection>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate" },
    reason: String,
    notifiedByEmail: { type: Boolean, default: false },
    notifiedBySms: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const RejectionModel = model<IRejection>("Rejection", rejectionSchema);
