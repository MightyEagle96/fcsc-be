import { Router } from "express";
import {
  batchUploadCandidates,
  getRefreshToken,
  loginCandidate,
  logoutCandidate,
  myProfile,
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

  .get("/myprofile", authenticateToken, myProfile)

  .post("/uploadfile", authenticateToken, upload.single("file"), uploadDocument)

  .get("/mydocuments", authenticateToken, viewMyDocuments)
  .get("/refresh", getRefreshToken)
  .get("/logout", logoutCandidate)

  //admin session
  .get("/viewcandidates", viewCandidates);

export default appRouter;
