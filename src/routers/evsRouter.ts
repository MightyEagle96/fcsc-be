import express from "express";
import {
  createEVSAccount,
  loginAccount,
  searchExamCard,
} from "../controllers/evsController";

const evsRouter = express.Router();

evsRouter
  .post("/createaccount", createEVSAccount)
  .post("/loginaccount", loginAccount)
  .post("/searchexamcard", searchExamCard);
export default evsRouter;
