import express from "express";

import {
  mdaCandidates,
  recommendCandidate,
  recommendMultipleCandidates,
  viewMdaCandidates,
} from "../controllers/hrController";
import { authenticateToken } from "../controllers/jwtController";

const hrRouter = express.Router();

hrRouter
  .get("/mdacandidates", authenticateToken, mdaCandidates)
  .get("/viewmdacandidates", authenticateToken, viewMdaCandidates)
  .get("/recommendcandidate", authenticateToken, recommendCandidate)
  .get(
    "/recommendmultiplecandidates",
    authenticateToken,
    recommendMultipleCandidates
  );

export default hrRouter;
