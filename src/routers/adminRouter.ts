import { Router } from "express";

import {
  createAccount,
  dashboardSummary,
  loginAdmin,
} from "../controllers/adminController";
import { authenticateToken } from "../controllers/jwtController";

const adminRouter = Router();

adminRouter
  .post("/signup", createAccount)
  .post("/login", loginAdmin)
  .get("/dashboardsummary", authenticateToken, dashboardSummary);

export default adminRouter;
