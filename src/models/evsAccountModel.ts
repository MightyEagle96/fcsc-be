import { Schema, model } from "mongoose";

export interface IEvsAccount {
  _id: Schema.Types.ObjectId;
  centreId: string;
  password: string;
}

export const EvsAccountModel = model<IEvsAccount>(
  "EvsAccount",
  new Schema<IEvsAccount>({
    centreId: String,
    password: String,
  })
);

export default EvsAccountModel;
