"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwtController_1 = require("../controllers/jwtController");
const promotionController_1 = require("../controllers/promotionController");
const promotionRouter = (0, express_1.Router)();
promotionRouter.get("/candidatesacrossmda", jwtController_1.authenticateToken, promotionController_1.viewCandidatesAcrossMDA);
exports.default = promotionRouter;
