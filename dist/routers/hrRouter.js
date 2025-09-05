"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const hrController_1 = require("../controllers/hrController");
const jwtController_1 = require("../controllers/jwtController");
const hrRouter = express_1.default.Router();
hrRouter
    .get("/mdacandidates", jwtController_1.authenticateToken, hrController_1.mdaCandidates)
    .get("/viewmdacandidates", jwtController_1.authenticateToken, hrController_1.viewMdaCandidates)
    .get("/recommendcandidate", jwtController_1.authenticateToken, hrController_1.recommendCandidate)
    .get("/recommendmultiplecandidates", jwtController_1.authenticateToken, hrController_1.recommendMultipleCandidates);
exports.default = hrRouter;
