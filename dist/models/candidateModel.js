"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candidate = void 0;
const mongoose_1 = require("mongoose");
const candidateSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
exports.Candidate = (0, mongoose_1.model)("Candidate", candidateSchema);
