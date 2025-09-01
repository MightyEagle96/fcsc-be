import { Router } from "express";

import {
  createAccount,
  dashboardSummary,
  loginAdmin,
  uploadFile,
} from "../controllers/adminController";
import { authenticateToken } from "../controllers/jwtController";
import multer from "multer";

const adminRouter = Router();

const upload = multer({ dest: "adminuploads/" });

adminRouter
  .post("/signup", createAccount)
  .post("/login", loginAdmin)
  .get("/dashboardsummary", authenticateToken, dashboardSummary)
  .post("/uploadfile", authenticateToken, upload.single("file"), uploadFile);

export default adminRouter;
