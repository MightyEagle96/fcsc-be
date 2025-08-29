import { Request } from "express";
import { Schema, model } from "mongoose";

export interface ICandidate {
  _id: Schema.Types.ObjectId;
  ippisNumber: string;
  fullName: string;
  dateOfBirth: Date;
  gender: string;
  stateOfOrigin: string;
  lga: string;
  poolOffice: string;
  currentMDA: string;
  cadre: string;
  gradeLevel: string;
  dateOfFirstAppointment: Date;
  dateOfConfirmation: Date;
  dateOfLastPromotion: Date;
  phoneNumber: string;
  email: string;
  stateOfCurrentPosting: string;
  year2021: string;
  year2022: string;
  year2023: string;
  year2024: string;
  password: string;
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
    ippisNumber: { type: String, unique: true },
    fullName: String,
    dateOfBirth: Date,
    gender: String,
    stateOfOrigin: String,
    lga: String,
    poolOffice: String,
    currentMDA: String,
    cadre: String,
    gradeLevel: String,
    dateOfFirstAppointment: Date,
    dateOfConfirmation: Date,
    dateOfLastPromotion: Date,
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true },
    stateOfCurrentPosting: String,
    year2021: String,
    year2022: String,
    year2023: String,
    year2024: String,

    passwords: [String],
    password: String,

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
