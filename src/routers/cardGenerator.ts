import express from "express";
import {
  generateLetter,
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
  .get("/printslip", authenticateToken, printSlip);

export default cardGeneratorRouter;
