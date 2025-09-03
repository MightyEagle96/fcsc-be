import { Router } from "express";

import {
  createAccount,
  createOfficerAccount,
  dashboardSummary,
  deleteCandidates,
  loginAdmin,
  mdaOverview,
  officerDashboard,
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
  promotionDashboard,
  recommendedCandidates,
} from "../controllers/promotionController";

const adminRouter = Router();

const upload = multer({ dest: "adminuploads/" });

adminRouter
  .post("/signup", createAccount)
  .post("/login", loginAdmin)

  .use(authenticateToken)
  .get("/dashboardsummary", dashboardSummary)
  .post("/uploadfile", upload.single("file"), uploadFile)
  .post("/createaccount", createOfficerAccount)
  .get("/officerdashboard", officerDashboard)
  .get("/adminstaff/:slug", viewAdminStaff)
  .get("/mdacandidates", mdaCandidates)
  .get("/viewmdacandidates", viewMdaCandidates)
  .get("/uploadeddocuments", viewUploadedDocuments)
  .get("/recommendcandidate", recommendCandidate)
  .get("/promotiondashboard", promotionDashboard)

  .get("/deleteallcandidates", deleteCandidates)

  .get("/mdaoverview", mdaOverview)

  //
  .get("/recommendedcandidates", recommendedCandidates)
  .get("/approvecandidate", approveCandidate);

export default adminRouter;
