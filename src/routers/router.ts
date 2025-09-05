import { Router } from "express";
import {
  batchUploadCandidates,
  fullCandidateProfile,
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
  .get("/refresh", getRefreshToken)

  .use(authenticateToken)

  .get("/myprofile", myProfile)

  .post("/uploadfile", upload.single("file"), uploadDocument)

  .get("/mydocuments", viewMyDocuments)

  .get("/logout", logoutCandidate)

  .get("/myfullprofile", fullCandidateProfile)

  //admin session
  .get("/viewcandidates", viewCandidates);

export default appRouter;
