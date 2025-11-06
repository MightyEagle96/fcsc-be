"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvsAccountModel = void 0;
const mongoose_1 = require("mongoose");
exports.EvsAccountModel = (0, mongoose_1.model)("EvsAccount", new mongoose_1.Schema({
    centreId: String,
    password: String,
}));
exports.default = exports.EvsAccountModel;
