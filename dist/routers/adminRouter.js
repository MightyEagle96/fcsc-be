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
const candidateController_1 = require("../controllers/candidateController");
const correctionController_1 = require("../controllers/correctionController");
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
    .get("/promotiondashboard", jwtController_1.authenticateToken, promotionController_1.promotionDashboard)
    .get("/searchcandidate", jwtController_1.authenticateToken, adminController_1.searchCandidate)
    .get("/deleteallcandidates", jwtController_1.authenticateToken, adminController_1.deleteCandidates)
    .get("/mdaoverview", jwtController_1.authenticateToken, adminController_1.mdaOverview)
    //
    .get("/recommendedcandidates", jwtController_1.authenticateToken, promotionController_1.recommendedCandidates)
    .get("/approvedcandidates", jwtController_1.authenticateToken, promotionController_1.approvedCandidates)
    .get("/recommendcandidate", jwtController_1.authenticateToken, hrController_1.recommendCandidate)
    .get("/approvecandidate", jwtController_1.authenticateToken, promotionController_1.approveCandidate)
    .get("/reverseapproval", jwtController_1.authenticateToken, adminController_1.reverseApproval)
    .get("/uploadanalysis", jwtController_1.authenticateToken, adminController_1.uploadAnalysis)
    .get("/documentsanalysis", jwtController_1.authenticateToken, adminController_1.documentsAnalysis)
    .get("/notifybyemailandsms", jwtController_1.authenticateToken, adminController_1.notifyByEmailAndSms)
    .get("/corrections", jwtController_1.authenticateToken, correctionController_1.viewCorrections)
    .get("/correction", jwtController_1.authenticateToken, correctionController_1.viewCorrection)
    .get("/approvecorrection", jwtController_1.authenticateToken, correctionController_1.approveCorrection)
    .post("/resetpassword", adminController_1.resetAdminPassword)
    .post("/createnewpassword", adminController_1.createNewPassword)
    .get("/viewindividualstaff", jwtController_1.authenticateToken, adminController_1.viewIndividualStaff)
    .get("/deleteaccount", jwtController_1.authenticateToken, adminController_1.deleteDeskOfficer)
    .patch("/updateofficer", jwtController_1.authenticateToken, adminController_1.updateDeskOfficer)
    .get("/notificationanalysis", jwtController_1.authenticateToken, adminController_1.notificationAnalysis)
    .get("/viewcandidate", jwtController_1.authenticateToken, candidateController_1.viewCandidate)
    .get("/deletecandidate", jwtController_1.authenticateToken, candidateController_1.deleteCandidate)
    //corrections
    .get("/correctionsdashboard", jwtController_1.authenticateToken, correctionController_1.correctionsDashboard)
    .get("/candidate", jwtController_1.authenticateToken, candidateController_1.getCandidate)
    .get("/rectifyremarks", adminController_1.rectifyRemarks)
    .get("/rectifypooloffices", adminController_1.rectifyPoolOffices);
exports.default = adminRouter;
