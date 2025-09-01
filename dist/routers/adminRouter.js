"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const adminRouter = (0, express_1.Router)();
adminRouter.post("/signup", adminController_1.createAccount).post("/login", adminController_1.loginAdmin);
exports.default = adminRouter;
