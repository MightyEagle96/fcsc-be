"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    account: { type: mongoose_1.Schema.Types.ObjectId, ref: "Admin" },
    action: String,
}, {
    timestamps: true,
});
const AdminLogModel = (0, mongoose_1.model)("AdminLog", schema);
exports.default = AdminLogModel;
