"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidateController_1 = require("../controllers/candidateController");
const jwtController_1 = require("../controllers/jwtController");
const multer_1 = __importDefault(require("multer"));
const adminController_1 = require("../controllers/adminController");
const upload = (0, multer_1.default)({ dest: "uploads/" });
const appRouter = (0, express_1.Router)();
appRouter
    .post("/uploadcandidates", candidateController_1.batchUploadCandidates)
    .post("/logincandidate", candidateController_1.loginCandidate)
    .get("/myprofile", jwtController_1.authenticateToken, candidateController_1.myProfile)
    .post("/uploadfile", jwtController_1.authenticateToken, upload.single("file"), candidateController_1.uploadDocument)
    .get("/mydocuments", jwtController_1.authenticateToken, candidateController_1.viewMyDocuments)
    .get("/refresh", candidateController_1.getRefreshToken)
    .get("/logout", candidateController_1.logoutCandidate)
    //admin session
    .get("/viewcandidates", adminController_1.viewCandidates);
exports.default = appRouter;
