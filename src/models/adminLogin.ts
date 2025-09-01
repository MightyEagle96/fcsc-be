import { Request } from "express";
import { Schema, model } from "mongoose";

export interface IAdmin {
  _id: Schema.Types.ObjectId;

  firstName: string;
  lastName: string;

  phoneNumber: string;
  email: string;

  password: string;
  role: string;
  mda: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedAdmin extends Request {
  admin?: IAdmin;
}

const adminSchema = new Schema<IAdmin>(
  {
    firstName: String,
    lastName: String,
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true, lowercase: true },
    password: String,
    mda: { type: String, lowercase: true },
    role: { type: String, lowercase: true },
  },
  { timestamps: true }
);

export const AdminModel = model<IAdmin>("Admin", adminSchema);
