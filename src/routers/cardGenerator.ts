import express from "express";
import {
  candidatesWithPdfAsPassport,
  convertAndReuploadPassportPdfs,
  generateLetter,
  generateSlipForACandidate,
  generateSlipForCandidates,
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
  .get("/notifycandidates", authenticateToken, notifyParticipants)
  .post("/generatesingle", generateSlipForACandidate)
  .get("/pdfaspassport", candidatesWithPdfAsPassport)
  .get("/convertandreuploadpdf", convertAndReuploadPassportPdfs)
  .post("/generatemultiple", generateSlipForCandidates);

export default cardGeneratorRouter;
