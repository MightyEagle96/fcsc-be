"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const examCardGeneration_1 = require("../controllers/examCardGeneration");
const jwtController_1 = require("../controllers/jwtController");
const cardGeneratorRouter = express_1.default.Router();
cardGeneratorRouter
    .post("/generate", examCardGeneration_1.generateLetter)
    .get("/viewcandidate", examCardGeneration_1.viewCandidate)
    .get("/slip", jwtController_1.authenticateToken, examCardGeneration_1.viewMySlip)
    .get("/printslip", jwtController_1.authenticateToken, examCardGeneration_1.printSlip)
    .get("/notifycandidates", jwtController_1.authenticateToken, examCardGeneration_1.notifyParticipants)
    .post("/generatesingle", examCardGeneration_1.generateSlipForACandidate)
    .get("/pdfaspassport", examCardGeneration_1.candidatesWithPdfAsPassport)
    .get("/convertandreuploadpdf", examCardGeneration_1.convertAndReuploadPassportPdfs)
    .post("/generatemultiple", examCardGeneration_1.generateSlipForCandidates);
exports.default = cardGeneratorRouter;
