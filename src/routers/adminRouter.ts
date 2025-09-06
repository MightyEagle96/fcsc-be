import { Router } from "express";

import {
  createAccount,
  createOfficerAccount,
  dashboardSummary,
  deleteCandidates,
  loginAdmin,
  mdaOverview,
  notifyParticipant,
  officerDashboard,
  reverseApproval,
  searchCandidate,
  sendSms,
  uploadAnalysis,
  uploadFile,
  viewAdminStaff,
  viewUploadedDocuments,
} from "../controllers/adminController";
import { authenticateToken } from "../controllers/jwtController";
import multer from "multer";
import {
  mdaCandidates,
  recommendCandidate,
  viewMdaCandidates,
} from "../controllers/hrController";
import {
  approveCandidate,
  approvedCandidates,
  promotionDashboard,
  recommendedCandidates,
} from "../controllers/promotionController";

const adminRouter = Router();

const upload = multer({ dest: "adminuploads/" });

adminRouter
  .post("/signup", createAccount)
  .post("/login", loginAdmin)

  .get("/dashboardsummary", authenticateToken, dashboardSummary)
  .post("/uploadfile", authenticateToken, upload.single("file"), uploadFile)
  .post("/createaccount", authenticateToken, createOfficerAccount)
  .get("/officerdashboard", authenticateToken, officerDashboard)
  .get("/adminstaff/:slug", authenticateToken, viewAdminStaff)
  .get("/mdacandidates", authenticateToken, mdaCandidates)
  .get("/viewmdacandidates", authenticateToken, viewMdaCandidates)
  .get("/uploadeddocuments", authenticateToken, viewUploadedDocuments)
  .get("/recommendcandidate", authenticateToken, recommendCandidate)
  .get("/promotiondashboard", authenticateToken, promotionDashboard)

  .get("/searchcandidate", authenticateToken, searchCandidate)

  .get("/deleteallcandidates", authenticateToken, deleteCandidates)

  .get("/mdaoverview", authenticateToken, mdaOverview)

  //
  .get("/recommendedcandidates", authenticateToken, recommendedCandidates)
  .get("/approvedcandidates", authenticateToken, approvedCandidates)
  .get("/approvecandidate", authenticateToken, approveCandidate)
  .get("/reverseapproval", authenticateToken, reverseApproval)

  .get("/uploadanalysis", authenticateToken, uploadAnalysis)

  .post("/notifyparticipant", notifyParticipant)
  .post("/sendsms", sendSms);

export default adminRouter;
