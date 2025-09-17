"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveCorrection = exports.viewCorrection = exports.viewCorrections = void 0;
const correctionData_1 = require("../models/correctionData");
const candidateModel_1 = require("../models/candidateModel");
const viewCorrections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const corrections = yield correctionData_1.CorrectionModel.find()
            .lean()
            .populate("candidate");
        const data = corrections
            .filter((c) => c.candidate !== null) // remove orphans
            .map((c, i) => (Object.assign(Object.assign({}, c), { name: c.candidate.fullName, mda: c.candidate.currentMDA, id: i + 1 })));
        res.send(data);
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Error occurred");
    }
});
exports.viewCorrections = viewCorrections;
const viewCorrection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const correction = yield correctionData_1.CorrectionModel.findById(req.query.id);
        if (!correction) {
            return res.status(404).send("Correction not found");
        }
        const candidate = yield candidateModel_1.Candidate.findById(correction.candidate)
            .select({ [correction.correctionField]: 1 })
            .lean();
        if (!candidate) {
            return res.status(404).send("Candidate not found");
        }
        res.send({
            _id: correction._id,
            reason: correction.reason,
            status: correction.status,
            newData: correction.data,
            oldData: (_a = candidate[correction.correctionField]) !== null && _a !== void 0 ? _a : "-",
        });
    }
    catch (error) {
        console.error("viewCorrection error:", error);
        res.status(500).send("Error occurred");
    }
});
exports.viewCorrection = viewCorrection;
const approveCorrection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    try {
        const correction = yield correctionData_1.CorrectionModel.findById(req.query.id);
        if (!correction) {
            return res.status(404).send("Correction not found");
        }
        const candidate = yield candidateModel_1.Candidate.findOne({ _id: correction.candidate });
        yield correctionData_1.CorrectionModel.findByIdAndUpdate(req.query.id, {
            status: "approved",
            dateCorrected: new Date(),
            correctedBy: (_b = req.admin) === null || _b === void 0 ? void 0 : _b._id,
            oldData: candidate === null || candidate === void 0 ? void 0 : candidate[correction.correctionField],
        });
        yield candidateModel_1.Candidate.updateOne({ _id: correction.candidate }, {
            $set: {
                [correction.correctionField]: correction.data,
            },
        });
        yield correctionData_1.CorrectionModel.findByIdAndUpdate(req.query.id, {
            status: "approved",
            dateCorrected: new Date(),
            correctedBy: (_c = req.admin) === null || _c === void 0 ? void 0 : _c._id,
        });
        res.send("Correction approved");
    }
    catch (error) {
        console.error("approveCorrection error:", error);
        res.status(500).send("Error occurred");
    }
});
exports.approveCorrection = approveCorrection;
