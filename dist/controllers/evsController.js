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
exports.adminDashboard = exports.logoutAccount = exports.accreditationDashboard = exports.refreshToken = exports.accreditCandidate = exports.viewCandidate = exports.myCentre = exports.searchExamCard = exports.loginAccount = exports.viewEvsAccounts = exports.createEVSAccount = void 0;
const DataQueue_1 = require("../utils/DataQueue");
const evsAccountModel_1 = __importDefault(require("../models/evsAccountModel"));
const generateRandomPassword_1 = __importDefault(require("../utils/generateRandomPassword"));
const candidateModel_1 = require("../models/candidateModel");
const jwtController_1 = require("./jwtController");
const accreditationModel_1 = __importDefault(require("../models/accreditationModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const accountQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 5,
    maxQueueSize: 100,
    retries: 3,
    retryDelay: 5000,
    shutdownTimeout: 20000,
});
const createEVSAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { body } = req;
        accountQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
            const existingAccount = yield evsAccountModel_1.default.findOne({
                centreId: body.centreId,
            });
            if (existingAccount) {
                return res.status(400).send("EVS account already exists");
            }
            const password = (0, generateRandomPassword_1.default)(6);
            const newAccount = new evsAccountModel_1.default(Object.assign(Object.assign({}, body), { password }));
            yield newAccount.save();
            res.send("EVS account created");
        }));
    }
    catch (error) {
        res.status(500).send("Error occurred");
    }
});
exports.createEVSAccount = createEVSAccount;
const viewEvsAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const accounts = yield evsAccountModel_1.default.find().sort({ centreId: 1 }).lean();
    const mappedAccounts = accounts.map((account, i) => {
        return Object.assign(Object.assign({}, account), { id: i + 1 });
    });
    res.send(mappedAccounts);
});
exports.viewEvsAccounts = viewEvsAccounts;
const loginAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { body } = req;
    const account = yield evsAccountModel_1.default.findOne({
        centreId: body.centreId,
        password: body.password,
    }).lean();
    if (!account) {
        return res.status(400).send("Invalid credentials");
    }
    const accessToken = (0, jwtController_1.generateToken)(account);
    const refreshToken = (0, jwtController_1.generateRefreshToken)(account);
    res
        .cookie(jwtController_1.tokens.auth_token, accessToken, {
        httpOnly: true,
        secure: true,
        //sameSite: "lax",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60, // 1h
    })
        .cookie(jwtController_1.tokens.refresh_token, refreshToken, {
        httpOnly: true,
        secure: true,
        //sameSite: "lax",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
    })
        .send("Login successful");
    // res.send(account);
});
exports.loginAccount = loginAccount;
const searchExamCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findOne({
        ippisNumber: req.body.ippisNumber,
    });
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    if (!candidate.fileUrl) {
        return res.status(404).send("This candidate does not have an exam card");
    }
    res.send(candidate.fileUrl);
});
exports.searchExamCard = searchExamCard;
const myCentre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const centre = req.centre;
    res.send(centre);
});
exports.myCentre = myCentre;
const viewCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const candidate = yield candidateModel_1.Candidate.findById(req.query.id).lean();
        if (!candidate) {
            return res.status(404).send("Candidate not found");
        }
        res.send({
            _id: candidate._id,
            passport: ((_b = (_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.find((c) => c.fileType === "Passport Photograph")) === null || _b === void 0 ? void 0 : _b.fileUrl) || "",
            ippisNumber: candidate.ippisNumber,
            name: candidate.fullName,
            centreName: candidate.examCentreAddress,
        });
    }
    catch (error) {
        res.status(400).send("Candidate not found");
    }
});
exports.viewCandidate = viewCandidate;
const accreditationQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 5,
    maxQueueSize: 100,
    retries: 3,
    retryDelay: 5000,
    shutdownTimeout: 20000,
});
const accreditCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        accreditationQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const centre = req.centre;
                const existing = yield accreditationModel_1.default.findOne({
                    candidate: req.query.id,
                });
                if (existing) {
                    return res.status(400).send("Candidate already accredited");
                }
                if (!existing) {
                    yield accreditationModel_1.default.create({
                        candidate: req.query.id,
                        accreditedBy: centre._id,
                    });
                }
                res.send("Candidate accredited");
            }
            catch (error) {
                res.sendStatus(500);
            }
        }));
    }
    catch (error) {
        res.sendStatus(500);
    }
});
exports.accreditCandidate = accreditCandidate;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const refreshToken = req.cookies[jwtController_1.tokens.refresh_token];
    if (!refreshToken) {
        return res.status(401).send("Not authenticated");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN);
        if (!(decoded === null || decoded === void 0 ? void 0 : decoded.centreId))
            return res.sendStatus(401);
        const evsAccount = yield evsAccountModel_1.default.findOne({
            centreId: decoded.centreId,
        }).lean();
        if (!evsAccount)
            return res.sendStatus(401);
        const newAccessToken = (0, jwtController_1.generateToken)(evsAccount);
        const newRefreshToken = (0, jwtController_1.generateRefreshToken)(evsAccount);
        res
            .cookie(jwtController_1.tokens.auth_token, newAccessToken, {
            httpOnly: false,
            secure: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 1000 * 60 * 60, // 1h
        })
            .cookie(jwtController_1.tokens.refresh_token, newRefreshToken, {
            httpOnly: false,
            secure: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
        })
            .send("Token refreshed");
    }
    catch (error) {
        console.log(error);
        res.sendStatus(401);
    }
});
exports.refreshToken = refreshToken;
const accreditationDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const centre = req.centre;
        const total = yield accreditationModel_1.default.countDocuments();
        const expected = yield candidateModel_1.Candidate.countDocuments({
            examCentreAddress: centre.centreName,
        });
        const accredited = yield accreditationModel_1.default.countDocuments({
            accreditedBy: centre._id,
        });
        const page = (req.query.page || 1);
        const limit = (req.query.limit || 50);
        const centreList = yield accreditationModel_1.default.find({
            accreditedBy: centre._id,
        })
            .populate("candidate", {
            ippisNumber: 1,
            seatNumber: 1,
            examTime: 1,
            examDate: 1,
        })
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
        const totalAccreditedByCentre = yield accreditationModel_1.default.countDocuments({
            accreditedBy: centre._id,
        });
        const mappedList = centreList.map((c, i) => {
            return Object.assign(Object.assign({}, c), { id: (page - 1) * limit + i + 1 });
        });
        res.send({
            total,
            accredited,
            expected,
            centreList: mappedList,
            page,
            limit,
            totalAccreditedByCentre,
        });
    }
    catch (error) {
        res.sendStatus(500);
    }
});
exports.accreditationDashboard = accreditationDashboard;
const logoutAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookieOptions = {
        httpOnly: false,
        secure: true,
        sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax"),
        path: "/",
    };
    res
        .clearCookie(jwtController_1.tokens.auth_token, cookieOptions)
        .clearCookie(jwtController_1.tokens.refresh_token, cookieOptions)
        .send("Logged Out");
});
exports.logoutAccount = logoutAccount;
const adminDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const accountsWithAccreditationCount = await EvsAccountModel.aggregate([
        //   {
        //     $lookup: {
        //       from: "accreditations", // 👈 collection name (lowercase + pluralized)
        //       localField: "_id", // field in EvsAccount
        //       foreignField: "accreditedBy", // field in Accreditation
        //       as: "accreditations",
        //     },
        //   },
        //   {
        //     $project: {
        //       centreId: 1,
        //       centreName: 1,
        //       accreditationCount: { $size: "$accreditations" }, // 👈 count how many
        //     },
        //   },
        //   { $sort: { accreditationCount: -1 } }, // optional: highest first
        // ]);
        // res.send(accountsWithAccreditationCount);
        const accountsSummary = yield evsAccountModel_1.default.aggregate([
            // 1️⃣ Lookup accreditations linked to this account
            {
                $lookup: {
                    from: "accreditations", // collection name
                    localField: "_id", // EvsAccount._id
                    foreignField: "accreditedBy", // Accreditation.accreditedBy
                    as: "accreditations",
                },
            },
            // 2️⃣ Lookup candidates whose examCentreAddress matches centreName
            {
                $lookup: {
                    from: "candidates", // collection name
                    localField: "centreName",
                    foreignField: "examCentreAddress",
                    as: "expectedCandidates",
                },
            },
            // 3️⃣ Project what you want in the response
            {
                $project: {
                    centreId: 1,
                    centreName: 1,
                    accreditationCount: { $size: "$accreditations" },
                    expectedCandidatesCount: { $size: "$expectedCandidates" },
                },
            },
            // 4️⃣ Optional: sort by accreditationCount descending
            { $sort: { centreId: -1 } },
        ]);
        const mappedSummary = accountsSummary
            .sort((a, b) => a.centreId.localeCompare(b.centreId)) // 👈 sorts alphabetically by centreId
            .map((account, i) => (Object.assign(Object.assign({}, account), { id: i + 1 })));
        res.send(mappedSummary);
    }
    catch (error) {
        res.sendStatus(500);
    }
});
exports.adminDashboard = adminDashboard;
