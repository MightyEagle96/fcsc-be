"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisqualificationModel = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    candidate: { type: mongoose_1.Schema.Types.ObjectId, ref: "Candidate" },
    reason: String,
    dateDisqualified: { type: Date, default: new Date() },
    disqualifiedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });
exports.DisqualificationModel = (0, mongoose_1.model)("Disqualification", schema);
exports.default = exports.DisqualificationModel;
