import { Request } from "express";
import { Schema, model } from "mongoose";

export interface IAdmin {
  _id: Schema.Types.ObjectId;

  firstName: string;
  lastName: string;

  phoneNumber: string;
  email: string;

  password: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedAdmin extends Request {
  candidate?: IAdmin;
}

const adminSchema = new Schema<IAdmin>(
  {
    firstName: String,
    lastName: String,
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
  },
  { timestamps: true }
);

export const AdminModel = model<IAdmin>("Admin", adminSchema);
