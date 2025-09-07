"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionModel = void 0;
const mongoose_1 = require("mongoose");
const rejectionSchema = new mongoose_1.Schema({
    candidate: { type: mongoose_1.Schema.Types.ObjectId, ref: "Candidate" },
    reason: String,
    notifiedByEmail: { type: Boolean, default: false },
    notifiedBySms: { type: Boolean, default: false },
}, { timestamps: true });
exports.RejectionModel = (0, mongoose_1.model)("Rejection", rejectionSchema);
