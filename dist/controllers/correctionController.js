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
exports.viewCorrections = exports.correctionsDashboard = exports.approveCorrection = exports.viewCorrection = void 0;
const correctionData_1 = require("../models/correctionData");
const candidateModel_1 = require("../models/candidateModel");
// export const viewCorrections = async (req: Request, res: Response) => {
//   try {
//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 50;
//     const corrections = await CorrectionModel.aggregate([
//       // Add custom sort order
//       {
//         $addFields: {
//           sortOrder: {
//             $switch: {
//               branches: [
//                 { case: { $eq: ["$status", "pending"] }, then: 0 },
//                 { case: { $eq: ["$status", "approved"] }, then: 1 },
//                 { case: { $eq: ["$status", "rejected"] }, then: 2 },
//               ],
//               default: 99,
//             },
//           },
//         },
//       },
//       // Sort by sortOrder first, then maybe by dateApplied descending
//       { $sort: { sortOrder: 1, dateApplied: -1 } },
//       // Pagination
//       { $skip: (page - 1) * limit },
//       { $limit: limit },
//       // Lookup candidate (like populate)
//       {
//         $lookup: {
//           from: "candidates",
//           localField: "candidate",
//           foreignField: "_id",
//           as: "candidate",
//         },
//       },
//       { $unwind: "$candidate" }, // remove array wrapper
//     ]);
//     // Get total count (without pagination)
//     const total = await CorrectionModel.countDocuments();
//     // Transform to match your original response
//     const data = corrections.map((c, i) => ({
//       ...c,
//       name: c.candidate.fullName,
//       mda: c.candidate.currentMDA,
//       id: (page - 1) * limit + i + 1,
//     }));
//     res.send({
//       corrections: data,
//       total,
//       page,
//       limit,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error occurred");
//   }
// };
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
    var _a, _b;
    try {
        const correction = yield correctionData_1.CorrectionModel.findById(req.query.id);
        if (!correction) {
            return res.status(404).send("Correction not found");
        }
        const candidate = yield candidateModel_1.Candidate.findOne({ _id: correction.candidate });
        yield correctionData_1.CorrectionModel.findByIdAndUpdate(req.query.id, {
            status: "approved",
            dateCorrected: new Date(),
            correctedBy: (_a = req.admin) === null || _a === void 0 ? void 0 : _a._id,
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
            correctedBy: (_b = req.admin) === null || _b === void 0 ? void 0 : _b._id,
        });
        res.send("Correction approved");
    }
    catch (error) {
        console.error("approveCorrection error:", error);
        res.status(500).send("Error occurred");
    }
});
exports.approveCorrection = approveCorrection;
const correctionsDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [pending, approved, total] = yield Promise.all([
            correctionData_1.CorrectionModel.countDocuments({ status: "pending" }),
            correctionData_1.CorrectionModel.countDocuments({ status: "approved" }),
            correctionData_1.CorrectionModel.countDocuments(),
        ]);
        res.send({
            pending: pending.toLocaleString(),
            approved: approved.toLocaleString(),
            total: total.toLocaleString(),
        });
    }
    catch (error) {
        console.error("correctionsDashboard error:", error);
        res.status(500).send("Error occurred");
    }
});
exports.correctionsDashboard = correctionsDashboard;
const viewCorrections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const search = req.query.search || "";
        const matchStage = {};
        if (search) {
            matchStage.$or = [
                { "candidate.fullName": { $regex: search, $options: "i" } },
                { "candidate.ippisNumber": { $regex: search, $options: "i" } },
                { "candidate.phoneNumber": { $regex: search, $options: "i" } },
                { "candidate.email": { $regex: search, $options: "i" } },
            ];
        }
        const corrections = yield correctionData_1.CorrectionModel.aggregate([
            // Lookup candidate (like populate)
            {
                $lookup: {
                    from: "candidates",
                    localField: "candidate",
                    foreignField: "_id",
                    as: "candidate",
                },
            },
            { $unwind: "$candidate" },
            // 🔎 Apply search filter if provided
            ...(search ? [{ $match: matchStage }] : []),
            // Add custom sort order
            {
                $addFields: {
                    sortOrder: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$status", "pending"] }, then: 0 },
                                { case: { $eq: ["$status", "approved"] }, then: 1 },
                                { case: { $eq: ["$status", "rejected"] }, then: 2 },
                            ],
                            default: 99,
                        },
                    },
                },
            },
            // Sort by status first, then by dateApplied
            { $sort: { sortOrder: 1, dateApplied: -1 } },
            // Pagination
            { $skip: (page - 1) * limit },
            { $limit: limit },
        ]);
        // Count total (with same filter)
        const totalPipeline = [
            {
                $lookup: {
                    from: "candidates",
                    localField: "candidate",
                    foreignField: "_id",
                    as: "candidate",
                },
            },
            { $unwind: "$candidate" },
            ...(search ? [{ $match: matchStage }] : []),
            { $count: "count" },
        ];
        const totalResult = yield correctionData_1.CorrectionModel.aggregate(totalPipeline);
        const total = ((_a = totalResult[0]) === null || _a === void 0 ? void 0 : _a.count) || 0;
        // Transform response
        const data = corrections.map((c, i) => (Object.assign(Object.assign({}, c), { name: c.candidate.fullName, mda: c.candidate.currentMDA, id: (page - 1) * limit + i + 1 })));
        res.send({
            corrections: data,
            total,
            page,
            limit,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error occurred");
    }
});
exports.viewCorrections = viewCorrections;
