"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModel = void 0;
const mongoose_1 = require("mongoose");
const adminSchema = new mongoose_1.Schema({
    firstName: String,
    lastName: String,
    phoneNumber: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
}, { timestamps: true });
exports.AdminModel = (0, mongoose_1.model)("Admin", adminSchema);
