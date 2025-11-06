"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const examCardGeneration_1 = require("../controllers/examCardGeneration");
const cardGeneratorRouter = express_1.default.Router();
cardGeneratorRouter
    .post("/generate", examCardGeneration_1.generateLetter)
    .get("/viewcandidate", examCardGeneration_1.viewCandidate);
exports.default = cardGeneratorRouter;
