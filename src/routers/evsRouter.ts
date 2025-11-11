import express from "express";
import {
  accreditCandidate,
  createEVSAccount,
  loginAccount,
  myCentre,
  refreshToken,
  searchExamCard,
  viewCandidate,
} from "../controllers/evsController";
import { authenticateCentreToken } from "../controllers/jwtController";

const evsRouter = express.Router();

evsRouter
  .post("/createaccount", createEVSAccount)
  .post("/loginaccount", loginAccount)
  .get("/mycentre", authenticateCentreToken, myCentre)
  .post("/searchexamcard", searchExamCard)
  .get("/viewcandidate", viewCandidate)
  .get("/accreditcandidate", authenticateCentreToken, accreditCandidate)
  .get("/refresh", refreshToken);
export default evsRouter;
