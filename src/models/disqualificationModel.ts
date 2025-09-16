import { Schema, Types, model } from "mongoose";

export interface IDisqualification {
  candidate: Types.ObjectId;
  reason: string;
  dateDisqualified: Date;
  createdAt: Date;
  updatedAt: Date;
  disqualifiedBy: Types.ObjectId;
}

const schema = new Schema<IDisqualification>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate" },
    reason: String,
    dateDisqualified: { type: Date, default: new Date() },
    disqualifiedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export const DisqualificationModel = model<IDisqualification>(
  "Disqualification",
  schema
);

export default DisqualificationModel;
