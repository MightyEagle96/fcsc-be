"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candidate = void 0;
const mongoose_1 = require("mongoose");
const candidateSchema = new mongoose_1.Schema({
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
    year2021: String,
    year2022: String,
    year2023: String,
    year2024: String,
    remark: String,
    recommended: { type: Boolean, default: false },
    dateRecommended: Date,
    recommendedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
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
    verified: { type: Boolean, default: false },
    dateVerified: Date,
    verifiedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });
exports.Candidate = (0, mongoose_1.model)("Candidate", candidateSchema);
