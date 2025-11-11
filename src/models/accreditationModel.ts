import { Schema, model } from "mongoose";

export interface IAccreditation {
  _id: Schema.Types.ObjectId;
  candidate: Schema.Types.ObjectId;
  accreditedBy: Schema.Types.ObjectId;
}

const schema = new Schema<IAccreditation>(
  {
    candidate: { type: Schema.Types.ObjectId, ref: "Candidate" },
    accreditedBy: { type: Schema.Types.ObjectId, ref: "EvsAccount" },
  },
  { timestamps: true }
);

export const AccreditationModel = model<IAccreditation>(
  "Accreditation",
  schema
);

export default AccreditationModel;
