import { Request } from "express";
import { Schema, model } from "mongoose";

export interface ICandidate {
  _id: Schema.Types.ObjectId;
  firstName: string;
  lastName: string;
  title: string;
  gender: string;
  email: string;
  phone: string;
  fileNumber: string;
  password: string;
  mda: string;
  passwords: string[];
  uploadedDocuments: [
    {
      _id: Schema.Types.ObjectId;
      fileType: string;
      fileUrl: string;
      fileName: string;
      fileId: string;
      createdAt: Date;
      updatedAt: Date;
    }
  ];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedCandidate extends Request {
  candidate?: ICandidate;
}

const candidateSchema = new Schema<ICandidate>(
  {
    firstName: String,
    lastName: String,
    title: String,
    gender: String,
    email: { type: String, unique: true, lowercase: true },
    phone: { type: String, unique: true },
    fileNumber: { type: String, unique: true },
    passwords: [String],
    password: String,
    mda: String,
    uploadedDocuments: [
      {
        fileType: String,
        fileUrl: String,
        fileName: String,
        fileId: String,
        createdAt: Date,
        updatedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

export const Candidate = model<ICandidate>("Candidate", candidateSchema);
