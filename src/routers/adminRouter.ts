import { Router } from "express";

import {
  createAccount,
  createOfficerAccount,
  dashboardSummary,
  loginAdmin,
  officerDashboard,
  uploadFile,
  viewAdminStaff,
} from "../controllers/adminController";
import { authenticateToken } from "../controllers/jwtController";
import multer from "multer";

const adminRouter = Router();

const upload = multer({ dest: "adminuploads/" });

adminRouter
  .post("/signup", createAccount)
  .post("/login", loginAdmin)
  .get("/dashboardsummary", authenticateToken, dashboardSummary)
  .post("/uploadfile", authenticateToken, upload.single("file"), uploadFile)
  .post("/createaccount", authenticateToken, createOfficerAccount)
  .get("/officerdashboard", authenticateToken, officerDashboard)
  .get("/adminstaff/:slug", authenticateToken, viewAdminStaff);

export default adminRouter;
