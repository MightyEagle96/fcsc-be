"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const evsController_1 = require("../controllers/evsController");
const evsRouter = express_1.default.Router();
evsRouter
    .post("/createaccount", evsController_1.createEVSAccount)
    .post("/searchexamcard", evsController_1.searchExamCard);
exports.default = evsRouter;
