"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccreditationModel = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    candidate: { type: mongoose_1.Schema.Types.ObjectId, ref: "Candidate" },
    accreditedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "EvsAccount" },
}, { timestamps: true });
exports.AccreditationModel = (0, mongoose_1.model)("Accreditation", schema);
exports.default = exports.AccreditationModel;
