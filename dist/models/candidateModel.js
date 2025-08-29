"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candidate = void 0;
const mongoose_1 = require("mongoose");
const candidateSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
exports.Candidate = (0, mongoose_1.model)("Candidate", candidateSchema);
