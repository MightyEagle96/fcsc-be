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
    .use(jwtController_1.authenticateToken)
    .get("/dashboardsummary", adminController_1.dashboardSummary)
    .post("/uploadfile", upload.single("file"), adminController_1.uploadFile)
    .post("/createaccount", adminController_1.createOfficerAccount)
    .get("/officerdashboard", adminController_1.officerDashboard)
    .get("/adminstaff/:slug", adminController_1.viewAdminStaff)
    .get("/mdacandidates", hrController_1.mdaCandidates)
    .get("/viewmdacandidates", hrController_1.viewMdaCandidates)
    .get("/uploadeddocuments", adminController_1.viewUploadedDocuments)
    .get("/recommendcandidate", hrController_1.recommendCandidate)
    .get("/promotiondashboard", promotionController_1.promotionDashboard)
    .get("/searchcandidate", adminController_1.searchCandidate)
    .get("/deleteallcandidates", adminController_1.deleteCandidates)
    .get("/mdaoverview", adminController_1.mdaOverview)
    //
    .get("/recommendedcandidates", promotionController_1.recommendedCandidates)
    .get("/approvedcandidates", promotionController_1.approvedCandidates)
    .get("/approvecandidate", promotionController_1.approveCandidate)
    .get("/reverseapproval", adminController_1.reverseApproval)
    .get("/uploadanalysis", adminController_1.uploadAnalysis);
exports.default = adminRouter;
