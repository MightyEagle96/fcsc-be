import express from "express";

import {
  mdaCandidates,
  recommendCandidate,
  recommendMultipleCandidates,
  rejectApplication,
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
  )
  .post("/rejectapplication", authenticateToken, rejectApplication)
  .use("*", (req, res) => {
    res.status(404).send("Not found");
  });

export default hrRouter;
