"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candidate = void 0;
const mongoose_1 = require("mongoose");
const uploadToB2_1 = require("../utils/uploadToB2");
const b2_1 = require("../b2");
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
    phoneNumber: {
        type: String,
        unique: true,
        required: true,
        minlength: 11,
        maxlength: 11,
        match: [/^\d{11}$/, "Phone number must be exactly 11 digits"],
    },
    email: { type: String, unique: true },
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
        enum: ["pending", "recommended", "approved", "rejected"],
        default: "pending",
    },
    dateRecommended: Date,
    recommendedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
    rejectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
    dateRejected: Date,
    dateApproved: Date,
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
    role: { type: String, lowercase: true, default: "candidate" },
}, { timestamps: true });
candidateSchema.pre("deleteOne", { document: true, query: false }, function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const candidate = this;
            if ((_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.length) {
                for (const doc of candidate.uploadedDocuments) {
                    if (doc.fileId && doc.fileName) {
                        yield (0, uploadToB2_1.safeB2Call)(() => b2_1.b2.deleteFileVersion({
                            fileId: doc.fileId,
                            fileName: doc.fileName,
                        }));
                    }
                }
            }
            next();
        }
        catch (err) {
            next(err);
        }
    });
});
candidateSchema.pre("deleteMany", { document: false, query: true }, function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const candidates = yield exports.Candidate.find(this.getFilter());
            for (const candidate of candidates) {
                if ((_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.length) {
                    for (const doc of candidate.uploadedDocuments) {
                        if (doc.fileId && doc.fileName) {
                            yield (0, uploadToB2_1.safeB2Call)(() => b2_1.b2.deleteFileVersion({
                                fileId: doc.fileId,
                                fileName: doc.fileName,
                            }));
                            // await deleteFileFromB2(doc.fileId, doc.fileName);
                        }
                    }
                }
            }
            next();
        }
        catch (err) {
            next(err);
        }
    });
});
exports.Candidate = (0, mongoose_1.model)("Candidate", candidateSchema);
