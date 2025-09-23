import { Request } from "express";
import { Schema, Types, model } from "mongoose";
import { safeB2Call } from "../utils/uploadToB2";
import { b2 } from "../b2";
import { CorrectionModel } from "./correctionData";

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
  status: "pending" | "recommended" | "approved" | "rejected";

  recommendedBy: Types.ObjectId;
  rejectedBy: Types.ObjectId;
  approvedBy: Types.ObjectId;
  disqualifiedBy: Types.ObjectId;
  dateRejected: Date;
  dateApproved: Date;
  dateRecommended: Date;
  dateDisqualified: Date;

  role: string;
  emailSent: boolean;
  timeEmailwasSent: Date;
  smsSent: boolean;
  timeSmswasSent: Date;
  badEmail: boolean;
  timeAttempted: Date;
  contactUpdatedBy: Types.ObjectId;
}

export interface AuthenticatedCandidate extends Request {
  candidate?: ICandidate;
}

const candidateSchema = new Schema<ICandidate>(
  {
    ippisNumber: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
    },
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
    phoneNumber: {
      type: String,
      unique: true,
      required: true,
      minlength: 11,
      maxlength: 11,
      match: [/^\d{11}$/, "Phone number must be exactly 11 digits"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
      trim: true,
    },
    stateOfCurrentPosting: { type: String, lowercase: true },
    year2021: Number,
    year2022: Number,
    year2023: Number,
    year2024: Number,
    remark: Number,
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

    status: {
      type: String,
      enum: ["pending", "recommended", "approved", "rejected", "disqualified"],
      default: "pending",
    },

    recommendedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    disqualifiedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    dateRejected: Date,
    dateApproved: Date,
    dateRecommended: Date,
    dateDisqualified: Date,

    role: { type: String, lowercase: true, default: "candidate" },
    emailSent: { type: Boolean, default: false },
    timeEmailwasSent: Date,
    smsSent: { type: Boolean, default: false },
    timeSmswasSent: Date,
    badEmail: Boolean,
    timeAttempted: Date,
    contactUpdatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

// ✅ Explicit unique indexes
// candidateSchema.index({ email: 1 }, { unique: true });
// candidateSchema.index({ phoneNumber: 1 }, { unique: true });
// candidateSchema.index({ ippisNumber: 1 }, { unique: true });

// ✅ Status is often filtered in workflows
candidateSchema.index({ status: 1 });

candidateSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      const candidate = this as unknown as ICandidate;

      await CorrectionModel.deleteMany({ candidate: candidate._id });
      next();
      if (candidate.uploadedDocuments?.length) {
        for (const doc of candidate.uploadedDocuments) {
          if (doc.fileId && doc.fileName) {
            try {
              await safeB2Call(() =>
                b2.deleteFileVersion({
                  fileId: doc.fileId,
                  fileName: doc.fileName,
                })
              );
            } catch (error) {
              console.error(error);
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

candidateSchema.pre(
  "deleteMany",
  { document: false, query: true },
  async function (next) {
    try {
      const candidates = await Candidate.find(this.getFilter());

      for (const candidate of candidates) {
        await CorrectionModel.deleteMany({ candidate: candidate._id });
        if (candidate.uploadedDocuments?.length) {
          for (const doc of candidate.uploadedDocuments) {
            if (doc.fileId && doc.fileName) {
              try {
                await safeB2Call(() =>
                  b2.deleteFileVersion({
                    fileId: doc.fileId,
                    fileName: doc.fileName,
                  })
                );
              } catch (error) {
                console.error(error);
              }
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
