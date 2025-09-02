"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const jwtController_1 = require("../controllers/jwtController");
const multer_1 = __importDefault(require("multer"));
const adminRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "adminuploads/" });
adminRouter
    .post("/signup", adminController_1.createAccount)
    .post("/login", adminController_1.loginAdmin)
    .get("/dashboardsummary", jwtController_1.authenticateToken, adminController_1.dashboardSummary)
    .post("/uploadfile", jwtController_1.authenticateToken, upload.single("file"), adminController_1.uploadFile)
    .post("/createaccount", jwtController_1.authenticateToken, adminController_1.createOfficerAccount)
    .get("/officerdashboard", jwtController_1.authenticateToken, adminController_1.officerDashboard)
    .get("/adminstaff/:slug", jwtController_1.authenticateToken, adminController_1.viewAdminStaff)
    .get("/mdacandidates", jwtController_1.authenticateToken, adminController_1.mdaCandidates);
exports.default = adminRouter;
