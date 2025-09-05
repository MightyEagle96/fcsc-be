import { Router } from "express";
import { authenticateToken } from "../controllers/jwtController";
import { viewCandidatesAcrossMDA } from "../controllers/promotionController";

const promotionRouter = Router();

promotionRouter.get(
  "/candidatesacrossmda",
  authenticateToken,
  viewCandidatesAcrossMDA
);

export default promotionRouter;
