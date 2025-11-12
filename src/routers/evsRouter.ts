import express from "express";
import {
  accreditationDashboard,
  accreditCandidate,
  adminDashboard,
  createEVSAccount,
  loginAccount,
  logoutAccount,
  myCentre,
  refreshToken,
  searchExamCard,
  viewCandidate,
  viewEvsAccounts,
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
  .get("/refresh", refreshToken)
  .get("/logoutaccount", logoutAccount)
  .get("/accounts", viewEvsAccounts)
  .get(
    "/accreditationdashboard",
    authenticateCentreToken,
    accreditationDashboard
  )
  .get("/admindashboard", adminDashboard);
export default evsRouter;
