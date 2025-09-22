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

  yetToChangePassword: boolean;

  hasRightToCorrection: boolean;

  // 🔑 new fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export interface AuthenticatedAdmin extends Request {
  admin?: IAdmin;
}

const adminSchema = new Schema<IAdmin>(
  {
    firstName: { type: String, lowercase: true },
    lastName: { type: String, lowercase: true },
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true, lowercase: true },
    password: String,
    mda: { type: String, lowercase: true },
    role: { type: String, lowercase: true },
    yetToChangePassword: { type: Boolean },
    hasRightToCorrection: { type: Boolean, default: false },

    // 🔑 reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

export const AdminModel = model<IAdmin>("Admin", adminSchema);
