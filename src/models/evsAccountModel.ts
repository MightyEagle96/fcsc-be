import { Request } from "express";
import { Schema, model } from "mongoose";

export interface IEvsAccount {
  _id: Schema.Types.ObjectId;
  centreId: string;
  centreName: string;
  password: string;
}

export interface AuthenticatedCentre extends Request {
  centre: IEvsAccount;
}

export const EvsAccountModel = model<IEvsAccount>(
  "EvsAccount",
  new Schema<IEvsAccount>({
    centreId: String,
    centreName: String,
    password: String,
  })
);

export default EvsAccountModel;
