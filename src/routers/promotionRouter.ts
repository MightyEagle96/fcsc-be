import { Router } from "express";
import { authenticateToken } from "../controllers/jwtController";
import {
  disqualifyCandidate,
  viewCandidatesAcrossMDA,
} from "../controllers/promotionController";

const promotionRouter = Router();

promotionRouter
  .get("/candidatesacrossmda", authenticateToken, viewCandidatesAcrossMDA)
  .get("/disqualifycandidate", authenticateToken, disqualifyCandidate);

export default promotionRouter;
