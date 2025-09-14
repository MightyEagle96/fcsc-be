import { Request } from "express";
import { Schema, Types, model } from "mongoose";
import { safeB2Call } from "../utils/uploadToB2";
import { b2 } from "../b2";
import { CorrectionModel } from "./correctionData";

export interface IAdminLogs {
  account: Types.ObjectId;
  action: string;
}

const schema = new Schema<IAdminLogs>(
  {
    account: { type: Schema.Types.ObjectId, ref: "Admin" },
    action: String,
  },
  {
    timestamps: true,
  }
);

const AdminLogModel = model("AdminLog", schema);

export default AdminLogModel;
