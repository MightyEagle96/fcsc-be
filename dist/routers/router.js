"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidateController_1 = require("../controllers/candidateController");
const jwtController_1 = require("../controllers/jwtController");
const appRouter = (0, express_1.Router)();
appRouter
    .post("/uploadcandidates", candidateController_1.batchUploadCandidates)
    .post("/logincandidate", candidateController_1.loginCandidate)
    .get("/myprofile", jwtController_1.authenticateToken, candidateController_1.myProfile)
    .get("/refresh", candidateController_1.getRefreshToken)
    .get("/logout", candidateController_1.logoutCandidate);
exports.default = appRouter;
