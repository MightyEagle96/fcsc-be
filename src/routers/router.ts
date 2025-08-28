import { Router } from "express";
import {
  batchUploadCandidates,
  getRefreshToken,
  loginCandidate,
  logoutCandidate,
  myProfile,
} from "../controllers/candidateController";
import { authenticateToken } from "../controllers/jwtController";

const appRouter = Router();

appRouter
  .post("/uploadcandidates", batchUploadCandidates)
  .post("/logincandidate", loginCandidate)
  .get("/myprofile", authenticateToken, myProfile)
  .get("/refresh", getRefreshToken)
  .get("/logout", logoutCandidate);

export default appRouter;
