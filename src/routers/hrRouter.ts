import express from "express";

import {
  mdaCandidates,
  recommendCandidate,
  recommendMultipleCandidates,
  viewMdaCandidates,
  viewRecommendedCandidates,
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
  )
  .get(
    "/viewrecommendedcandidates",
    authenticateToken,
    viewRecommendedCandidates
  );

export default hrRouter;
