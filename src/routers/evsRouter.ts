import express from "express";
import { createEVSAccount, searchExamCard } from "../controllers/evsController";

const evsRouter = express.Router();

evsRouter
  .post("/createaccount", createEVSAccount)
  .post("/searchexamcard", searchExamCard);
export default evsRouter;
