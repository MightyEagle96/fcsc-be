"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const jwtController_1 = require("../controllers/jwtController");
const multer_1 = __importDefault(require("multer"));
const hrController_1 = require("../controllers/hrController");
const promotionController_1 = require("../controllers/promotionController");
const adminRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "adminuploads/" });
adminRouter
    .post("/signup", adminController_1.createAccount)
    .post("/login", adminController_1.loginAdmin)
    .get("/dashboardsummary", jwtController_1.authenticateToken, adminController_1.dashboardSummary)
    .post("/uploadfile", jwtController_1.authenticateToken, upload.single("file"), adminController_1.uploadFile)
    .post("/createaccount", jwtController_1.authenticateToken, adminController_1.createOfficerAccount)
    .get("/officerdashboard", jwtController_1.authenticateToken, adminController_1.officerDashboard)
    .get("/adminstaff/:slug", jwtController_1.authenticateToken, adminController_1.viewAdminStaff)
    .get("/mdacandidates", jwtController_1.authenticateToken, hrController_1.mdaCandidates)
    .get("/viewmdacandidates", jwtController_1.authenticateToken, hrController_1.viewMdaCandidates)
    .get("/uploadeddocuments", jwtController_1.authenticateToken, adminController_1.viewUploadedDocuments)
    .get("/recommendcandidate", jwtController_1.authenticateToken, hrController_1.recommendCandidate)
    .get("/promotiondashboard", jwtController_1.authenticateToken, promotionController_1.promotionDashboard)
    .get("/searchcandidate", jwtController_1.authenticateToken, adminController_1.searchCandidate)
    .get("/deleteallcandidates", jwtController_1.authenticateToken, adminController_1.deleteCandidates)
    .get("/mdaoverview", jwtController_1.authenticateToken, adminController_1.mdaOverview)
    //
    .get("/recommendedcandidates", jwtController_1.authenticateToken, promotionController_1.recommendedCandidates)
    .get("/approvedcandidates", jwtController_1.authenticateToken, promotionController_1.approvedCandidates)
    .get("/approvecandidate", jwtController_1.authenticateToken, promotionController_1.approveCandidate)
    .get("/reverseapproval", jwtController_1.authenticateToken, adminController_1.reverseApproval)
    .get("/uploadanalysis", jwtController_1.authenticateToken, adminController_1.uploadAnalysis);
exports.default = adminRouter;
