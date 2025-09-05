"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrectionModel = void 0;
const mongoose_1 = require("mongoose");
const correctionSchema = new mongoose_1.Schema({
    candidate: { type: mongoose_1.Schema.Types.ObjectId, ref: "Candidate" },
    correctionName: String,
    correctionField: String,
    reason: String,
    status: { type: String, default: "pending" },
    data: mongoose_1.Schema.Types.Mixed,
    dateApplied: { type: Date, default: new Date() },
    dateCorrected: Date,
    correctedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });
exports.CorrectionModel = (0, mongoose_1.model)("Correction", correctionSchema);
