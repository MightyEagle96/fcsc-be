import { Router } from "express";
import { authenticateToken } from "../controllers/jwtController";
import {
  disqualifyCandidate,
  viewCandidatesAcrossMDA,
  viewCandidatesAcrossPoolOffice,
} from "../controllers/promotionController";

const promotionRouter = Router();

promotionRouter
  .get("/candidatesacrossmda", authenticateToken, viewCandidatesAcrossMDA)
  .get(
    "/candidatesacrosspooloffice",
    authenticateToken,
    viewCandidatesAcrossPoolOffice
  )
  .get("/disqualifycandidate", authenticateToken, disqualifyCandidate);

export default promotionRouter;
