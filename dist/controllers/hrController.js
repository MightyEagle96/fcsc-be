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
exports.recommendCandidate = exports.viewMdaCandidates = exports.mdaCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const mongoose_1 = __importDefault(require("mongoose"));
const DataQueue_1 = require("../utils/DataQueue");
const mdaCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const [candidates, recommended, totalUploadedDocuments] = yield Promise.all([
        candidateModel_1.Candidate.countDocuments({ currentMDA: req.query.slug }),
        candidateModel_1.Candidate.countDocuments({ currentMDA: req.query.slug, recommended: true }),
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
            if (candidate && candidate.recommended === false) {
                candidate.recommendedBy = new mongoose_1.default.Types.ObjectId((_b = req.admin) === null || _b === void 0 ? void 0 : _b._id.toString());
                candidate.dateRecommended = new Date();
                candidate.recommended = true;
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
