"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const jwtController_1 = require("../controllers/jwtController");
const adminRouter = (0, express_1.Router)();
adminRouter
    .post("/signup", adminController_1.createAccount)
    .post("/login", adminController_1.loginAdmin)
    .get("/dashboardsummary", jwtController_1.authenticateToken, adminController_1.dashboardSummary);
exports.default = adminRouter;
