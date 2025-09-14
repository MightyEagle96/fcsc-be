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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewCandidatesAcrossMDA = exports.approvedCandidates = exports.approveCandidate = exports.recommendedCandidates = exports.promotionDashboard = void 0;
const candidateModel_1 = require("../models/candidateModel");
const adminLogs_1 = __importDefault(require("../models/adminLogs"));
const promotionDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [recommended, approved] = yield Promise.all([
        candidateModel_1.Candidate.countDocuments({ status: "recommended" }),
        candidateModel_1.Candidate.countDocuments({ status: "approved" }),
    ]);
    res.send({
        recommended: recommended.toLocaleString(),
        approved: approved.toLocaleString(),
    });
});
exports.promotionDashboard = promotionDashboard;
const recommendedCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = (req.query.page || 1);
        const limit = (req.query.limit || 50);
        const candidates = yield candidateModel_1.Candidate.find({ status: "recommended" })
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
        const total = yield candidateModel_1.Candidate.countDocuments({ status: "recommended" });
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
    var _a, _b;
    yield candidateModel_1.Candidate.findByIdAndUpdate(req.query.candidate, {
        status: "approved",
        dateApproved: new Date(),
        approvedBy: (_a = req.admin) === null || _a === void 0 ? void 0 : _a._id,
    });
    yield adminLogs_1.default.create({
        account: (_b = req.admin) === null || _b === void 0 ? void 0 : _b._id,
        action: `Approved ${req.query.candidate}'s application`,
    });
    res.send("Candidate approved");
});
exports.approveCandidate = approveCandidate;
const approvedCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = (req.query.page || 1);
        const limit = (req.query.limit || 50);
        const candidates = yield candidateModel_1.Candidate.find({ status: "approved" })
            .populate("approvedBy")
            .select({
            fullName: 1,
            currentMDA: 1,
            approvedBy: 1,
            remark: 1,
            status: 1,
            dateApproved: 1,
        })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = yield candidateModel_1.Candidate.countDocuments({ status: "approved" });
        const totalCandidates = candidates.map((c, i) => {
            return Object.assign(Object.assign({}, c), { approvedBy: `${c.approvedBy.firstName} ${c.approvedBy.lastName}`, remark: c.remark, id: (page - 1) * limit + i + 1 });
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
exports.approvedCandidates = approvedCandidates;
const viewCandidatesAcrossMDA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield candidateModel_1.Candidate.aggregate([
        // Step 1: Group by currentMDA, counting only "recommended" candidates
        {
            $group: {
                _id: "$currentMDA",
                candidateCount: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "recommended"] }, 1, 0],
                    },
                },
            },
        },
        // Step 2: Reshape output
        {
            $project: {
                _id: 0,
                currentMDA: "$_id",
                candidateCount: 1,
            },
        },
        // Step 3: Sort (optional)
        {
            $sort: { candidateCount: -1 },
        },
    ]);
    const arrangedResults = result.map((c, i) => {
        return Object.assign(Object.assign({}, c), { id: i + 1 });
    });
    res.send(arrangedResults);
});
exports.viewCandidatesAcrossMDA = viewCandidatesAcrossMDA;
