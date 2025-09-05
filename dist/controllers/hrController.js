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
exports.viewRecommendedCandidates = exports.recommendMultipleCandidates = exports.recommendCandidate = exports.viewMdaCandidates = exports.mdaCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const mongoose_1 = __importDefault(require("mongoose"));
const DataQueue_1 = require("../utils/DataQueue");
const mdaCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [candidates, recommended, approved, totalUploadedDocuments] = yield Promise.all([
        candidateModel_1.Candidate.countDocuments({ currentMDA: req.query.slug }),
        candidateModel_1.Candidate.countDocuments({
            currentMDA: req.query.slug,
            status: "recommended",
        }),
        candidateModel_1.Candidate.countDocuments({
            currentMDA: req.query.slug,
            status: "approved",
        }),
        candidateModel_1.Candidate.aggregate([
            {
                $match: {
                    currentMDA: req.query.slug, // replace with the MDA you're filtering for
                },
            },
            {
                $unwind: "$uploadedDocuments",
            },
            {
                $match: {
                    "uploadedDocuments.fileUrl": { $exists: true, $ne: "" },
                },
            },
            {
                $count: "totalDocuments",
            },
        ]),
    ]);
    res.send({
        candidates: candidates.toLocaleString(),
        recommended: recommended.toLocaleString(),
        approved: approved.toLocaleString(),
        totalUploadedDocuments: ((_a = totalUploadedDocuments[0]) === null || _a === void 0 ? void 0 : _a.totalDocuments) || 0,
    });
});
exports.mdaCandidates = mdaCandidates;
const viewMdaCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = (req.query.page || 1);
        const limit = (req.query.limit || 50);
        const candidates = yield candidateModel_1.Candidate.find({
            currentMDA: req.query.slug,
        })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = yield candidateModel_1.Candidate.countDocuments({
            currentMDA: req.query.slug,
        });
        const totalCandidates = candidates.map((c, i) => {
            return Object.assign(Object.assign({}, c), { uploadedDocuments: c.uploadedDocuments.filter((c) => c.fileUrl).length, defaultPassword: c.passwords[0], id: (page - 1) * limit + i + 1 });
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
exports.viewMdaCandidates = viewMdaCandidates;
const recommendationQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 50,
    retryDelay: 1000,
    retries: 3,
    shutdownTimeout: 20000,
    maxQueueSize: 100,
});
const recommendCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        recommendationQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
            var _b;
            const candidate = yield candidateModel_1.Candidate.findById(req.query.candidate);
            if (candidate && candidate.status !== "recommended") {
                candidate.recommendedBy = new mongoose_1.default.Types.ObjectId((_b = req.admin) === null || _b === void 0 ? void 0 : _b._id.toString());
                candidate.dateRecommended = new Date();
                candidate.status = "recommended";
                yield candidate.save();
            }
        }));
    }
    catch (error) {
        console.log(error);
    }
    finally {
        res.send("Candidate recommended");
    }
});
exports.recommendCandidate = recommendCandidate;
const bulkRecommendationQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 50,
    retryDelay: 1000,
    retries: 3,
    shutdownTimeout: 20000,
    maxQueueSize: 100,
});
const recommendMultipleCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const result = yield candidateModel_1.Candidate.aggregate([
            // Step 1: Match by MDA
            {
                $match: { currentMDA: (_c = req.admin) === null || _c === void 0 ? void 0 : _c.mda }, // replace with your MDA
            },
            // Step 2: Filter uploadedDocuments where fileUrl is not null or empty
            {
                $addFields: {
                    validDocs: {
                        $filter: {
                            input: "$uploadedDocuments",
                            as: "doc",
                            cond: {
                                $and: [
                                    { $ifNull: ["$$doc.fileUrl", false] },
                                    { $ne: ["$$doc.fileUrl", ""] },
                                ],
                            },
                        },
                    },
                },
            },
            // Step 3: Only keep candidates with exactly 6 valid docs
            {
                $match: {
                    $expr: { $eq: [{ $size: "$validDocs" }, 6] },
                },
            },
        ]);
        bulkRecommendationQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
            var _d;
            yield candidateModel_1.Candidate.updateMany({
                _id: { $in: result.map((c) => c._id) },
                status: { $ne: "recommended" }, // only those not already recommended
            }, {
                $set: {
                    status: "recommended",
                    recommendedBy: (_d = req.admin) === null || _d === void 0 ? void 0 : _d._id,
                    dateRecommended: new Date(),
                },
            });
        }));
    }
    catch (error) {
        console.log(error);
    }
    finally {
        res.send("Candidates recommended");
    }
});
exports.recommendMultipleCandidates = recommendMultipleCandidates;
const viewRecommendedCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    const candidates = yield candidateModel_1.Candidate.find({
        status: "recommended",
        currentMDA: (_e = req.admin) === null || _e === void 0 ? void 0 : _e.mda,
    })
        .populate("recommendedBy")
        .lean();
    const filteredCandidates = candidates.map((c, i) => {
        return Object.assign(Object.assign({}, c), { id: i + 1, uploadedDocuments: c.uploadedDocuments.filter((c) => c.fileUrl)
                .length, recommendedBy: `${c.recommendedBy.firstName} ${c.recommendedBy.lastName}`, dateRecommended: new Date(c.dateRecommended).toLocaleString() });
    });
    res.send(filteredCandidates);
});
exports.viewRecommendedCandidates = viewRecommendedCandidates;
