import express from "express";
import {
  generateLetter,
  viewCandidate,
} from "../controllers/examCardGeneration";

const cardGeneratorRouter = express.Router();

cardGeneratorRouter
  .post("/generate", generateLetter)
  .get("/viewcandidate", viewCandidate);

export default cardGeneratorRouter;
