import { Router } from "express";

import {
  createAccount,
  createNewPassword,
  createOfficerAccount,
  dashboardSummary,
  deleteCandidates,
  deleteDeskOfficer,
  documentsAnalysis,
  fixApprovedCandidates,
  loginAdmin,
  mdaOverview,
  notificationAnalysis,
  notifyByEmailAndSms,
  officerDashboard,
  rectifyPoolOffices,
  rectifyRemarks,
  resetAdminPassword,
  reverseApproval,
  searchCandidate,
  updateDeskOfficer,
  uploadAnalysis,
  uploadFile,
  viewAdminLogs,
  viewAdminStaff,
  viewIndividualStaff,
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
import {
  deleteCandidate,
  getCandidate,
  pushApplication,
  viewCandidate,
} from "../controllers/candidateController";
import {
  approveCorrection,
  correctionsDashboard,
  viewCorrection,
  viewCorrections,
} from "../controllers/correctionController";

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

  .get("/promotiondashboard", authenticateToken, promotionDashboard)

  .get("/searchcandidate", authenticateToken, searchCandidate)

  .get("/deleteallcandidates", authenticateToken, deleteCandidates)

  .get("/mdaoverview", authenticateToken, mdaOverview)

  //
  .get("/recommendedcandidates", authenticateToken, recommendedCandidates)
  .get("/approvedcandidates", authenticateToken, approvedCandidates)

  .get("/recommendcandidate", authenticateToken, recommendCandidate)
  .get("/approvecandidate", authenticateToken, approveCandidate)
  .get("/reverseapproval", authenticateToken, reverseApproval)

  .get("/uploadanalysis", authenticateToken, uploadAnalysis)
  .get("/documentsanalysis", authenticateToken, documentsAnalysis)

  .get("/notifybyemailandsms", authenticateToken, notifyByEmailAndSms)

  .get("/corrections", authenticateToken, viewCorrections)

  .get("/correction", authenticateToken, viewCorrection)
  .get("/approvecorrection", authenticateToken, approveCorrection)

  .post("/resetpassword", resetAdminPassword)
  .post("/createnewpassword", createNewPassword)

  .get("/viewindividualstaff", authenticateToken, viewIndividualStaff)

  .get("/deleteaccount", authenticateToken, deleteDeskOfficer)

  .patch("/updateofficer", authenticateToken, updateDeskOfficer)

  .get("/notificationanalysis", authenticateToken, notificationAnalysis)

  .get("/viewcandidate", authenticateToken, viewCandidate)
  .get("/deletecandidate", authenticateToken, deleteCandidate)

  //corrections
  .get("/correctionsdashboard", authenticateToken, correctionsDashboard)

  .get("/candidate", authenticateToken, getCandidate)

  .get("/rectifyremarks", rectifyRemarks)
  .get("/rectifypooloffices", rectifyPoolOffices)

  .get("/adminlogs", authenticateToken, viewAdminLogs)

  .get("/fixapprovedcandidates", fixApprovedCandidates);

export default adminRouter;
