"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModel = void 0;
const mongoose_1 = require("mongoose");
const adminSchema = new mongoose_1.Schema({
    firstName: String,
    lastName: String,
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true, lowercase: true },
    password: String,
    mda: { type: String, lowercase: true },
    role: { type: String, lowercase: true },
    yetToChangePassword: { type: Boolean },
}, { timestamps: true });
exports.AdminModel = (0, mongoose_1.model)("Admin", adminSchema);
