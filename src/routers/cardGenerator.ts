import express from "express";
import {
  generateLetter,
  notifyParticipants,
  printSlip,
  viewCandidate,
  viewMySlip,
} from "../controllers/examCardGeneration";
import { authenticateToken } from "../controllers/jwtController";

const cardGeneratorRouter = express.Router();

cardGeneratorRouter
  .post("/generate", generateLetter)
  .get("/viewcandidate", viewCandidate)
  .get("/slip", authenticateToken, viewMySlip)
  .get("/printslip", authenticateToken, printSlip)
  .get("/notifycandidates", authenticateToken, notifyParticipants);

export default cardGeneratorRouter;
