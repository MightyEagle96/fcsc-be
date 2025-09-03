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
exports.approveCandidate = exports.recommendedCandidates = exports.promotionDashboard = void 0;
const candidateModel_1 = require("../models/candidateModel");
const promotionDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [recommended, notRecommended, rejected] = yield Promise.all([
        candidateModel_1.Candidate.countDocuments({ recommended: true }),
        candidateModel_1.Candidate.countDocuments({ recommended: false }),
        candidateModel_1.Candidate.countDocuments({ rejected: true }),
    ]);
    res.send({
        recommended: recommended.toLocaleString(),
        notRecommended: notRecommended.toLocaleString(),
        rejected: rejected.toLocaleString(),
    });
});
exports.promotionDashboard = promotionDashboard;
const recommendedCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = (req.query.page || 1);
        const limit = (req.query.limit || 50);
        const candidates = yield candidateModel_1.Candidate.find({ recommended: true })
            .populate("recommendedBy")
            .select({
            fullName: 1,
            currentMDA: 1,
            recommendedBy: 1,
            dateRecommended: 1,
            year2021: 1,
            year2022: 1,
            year2023: 1,
            year2024: 1,
            remark: 1,
            approved: 1,
            dateApproved: 1,
            approvedBy: 1,
        })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = yield candidateModel_1.Candidate.countDocuments({ recommended: true });
        const totalCandidates = candidates.map((c, i) => {
            return Object.assign(Object.assign({}, c), { recommendedBy: `${c.recommendedBy.firstName} ${c.recommendedBy.lastName}`, remark: c.remark, id: (page - 1) * limit + i + 1 });
        });
        res.send({
            candidates: totalCandidates,
            total,
            page,
            limit,
        });
    }
    catch (error) {
        res.send({
            candidates: [],
            total: 0,
            page: 0,
            limit: 0,
        });
    }
});
exports.recommendedCandidates = recommendedCandidates;
const approveCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield candidateModel_1.Candidate.findByIdAndUpdate(req.query.candidate, {
        approved: true,
        dateApproved: new Date(),
        approvedBy: (_a = req.admin) === null || _a === void 0 ? void 0 : _a._id,
    });
    res.send("Candidate approved");
});
exports.approveCandidate = approveCandidate;
