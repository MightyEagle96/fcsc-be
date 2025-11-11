"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const evsController_1 = require("../controllers/evsController");
const jwtController_1 = require("../controllers/jwtController");
const evsRouter = express_1.default.Router();
evsRouter
    .post("/createaccount", evsController_1.createEVSAccount)
    .post("/loginaccount", evsController_1.loginAccount)
    .get("/mycentre", jwtController_1.authenticateCentreToken, evsController_1.myCentre)
    .post("/searchexamcard", evsController_1.searchExamCard)
    .get("/viewcandidate", evsController_1.viewCandidate)
    .get("/accreditcandidate", jwtController_1.authenticateCentreToken, evsController_1.accreditCandidate)
    .get("/refresh", evsController_1.refreshToken)
    .get("/logoutaccount", evsController_1.logoutAccount)
    .get("/accounts", evsController_1.viewEvsAccounts)
    .get("/accreditationdashboard", jwtController_1.authenticateCentreToken, evsController_1.accreditationDashboard);
exports.default = evsRouter;
