import { Request } from "express";
import { Schema, Types, model } from "mongoose";
import { safeB2Call } from "../utils/uploadToB2";
import { b2 } from "../b2";

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
  remark: string;
  createdAt: Date;
  updatedAt: Date;
  recommended: boolean;
  dateRecommended: Date;
  recommendedBy: Types.ObjectId;
  rejectedBy: Types.ObjectId;
  dateRejected: Date;
  rejected: boolean;
  rejectedReason: string;

  approved: boolean;
  dateApproved: Date;
  approvedBy: Types.ObjectId;
}

export interface AuthenticatedCandidate extends Request {
  candidate?: ICandidate;
}

const candidateSchema = new Schema<ICandidate>(
  {
    ippisNumber: { type: String, unique: true },
    fullName: { type: String, lowercase: true },
    dateOfBirth: Date,
    gender: { type: String, lowercase: true },
    stateOfOrigin: { type: String, lowercase: true },
    lga: { type: String, lowercase: true },
    poolOffice: { type: String, lowercase: true },
    currentMDA: { type: String, lowercase: true },
    cadre: { type: String, lowercase: true },
    gradeLevel: { type: String, lowercase: true },
    dateOfFirstAppointment: Date,
    dateOfConfirmation: Date,
    dateOfLastPromotion: Date,
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true },
    stateOfCurrentPosting: { type: String, lowercase: true },
    year2021: Number,
    year2022: Number,
    year2023: Number,
    year2024: Number,

    remark: Number,
    recommended: { type: Boolean, default: false },
    dateRecommended: Date,
    recommendedBy: { type: Schema.Types.ObjectId, ref: "Admin" },

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

    rejected: { type: Boolean, default: false },
    dateRejected: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    rejectedReason: String,

    approved: { type: Boolean, default: false },
    dateApproved: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

candidateSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      const candidate = this as unknown as ICandidate;

      if (candidate.uploadedDocuments?.length) {
        for (const doc of candidate.uploadedDocuments) {
          if (doc.fileId && doc.fileName) {
            await safeB2Call(() =>
              b2.deleteFileVersion({
                fileId: doc.fileId,
                fileName: doc.fileName,
              })
            );
          }
        }
      }
      next();
    } catch (err) {
      next(err as any);
    }
  }
);

candidateSchema.pre(
  "deleteMany",
  { document: false, query: true },
  async function (next) {
    try {
      const candidates = await Candidate.find(this.getFilter());

      for (const candidate of candidates) {
        if (candidate.uploadedDocuments?.length) {
          for (const doc of candidate.uploadedDocuments) {
            if (doc.fileId && doc.fileName) {
              await safeB2Call(() =>
                b2.deleteFileVersion({
                  fileId: doc.fileId,
                  fileName: doc.fileName,
                })
              );
              // await deleteFileFromB2(doc.fileId, doc.fileName);
            }
          }
        }
      }

      next();
    } catch (err) {
      next(err as any);
    }
  }
);

export const Candidate = model<ICandidate>("Candidate", candidateSchema);
