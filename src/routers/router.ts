import { Router } from "express";
import {
  batchUploadCandidates,
  fullCandidateProfile,
  getRefreshToken,
  loginCandidate,
  logoutCandidate,
  myCorrections,
  myProfile,
  submitCorrection,
  uploadDocument,
  viewMyDocuments,
} from "../controllers/candidateController";
import { authenticateToken } from "../controllers/jwtController";

import multer from "multer";
import { viewCandidates } from "../controllers/adminController";

const upload = multer({ dest: "uploads/" });

const appRouter = Router();

appRouter
  .post("/uploadcandidates", batchUploadCandidates)
  .post("/logincandidate", loginCandidate)
  .get("/refresh", getRefreshToken)

  .get("/myprofile", authenticateToken, myProfile)

  .post("/uploadfile", authenticateToken, upload.single("file"), uploadDocument)

  .get("/mydocuments", authenticateToken, viewMyDocuments)

  .get("/logout", logoutCandidate)

  .get("/myfullprofile", authenticateToken, fullCandidateProfile)

  .patch("/submitcorrection", authenticateToken, submitCorrection)

  //admin session
  .get("/viewcandidates", authenticateToken, viewCandidates)

  .get("/mycorrections", authenticateToken, myCorrections);

export default appRouter;
