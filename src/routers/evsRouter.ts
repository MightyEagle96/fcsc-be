import express from "express";
import { createEVSAccount } from "../controllers/evsController";

const evsRouter = express.Router();

evsRouter.post("/createaccount", createEVSAccount);
export default evsRouter;
