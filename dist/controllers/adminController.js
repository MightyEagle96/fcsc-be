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
exports.reverseApproval = exports.searchCandidate = exports.uploadAnalysis = exports.mdaOverview = exports.viewUploadedDocuments = exports.viewAdminStaff = exports.officerDashboard = exports.createOfficerAccount = exports.deleteCandidates = exports.uploadFile = exports.dashboardSummary = exports.createAccount = exports.loginAdmin = exports.viewCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const adminLogin_1 = require("../models/adminLogin");
const DataQueue_1 = require("../utils/DataQueue");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwtController_1 = require("./jwtController");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const convert_excel_to_json_1 = __importDefault(require("convert-excel-to-json"));
const generateRandomPassword_1 = __importDefault(require("../utils/generateRandomPassword"));
const documents_1 = require("../utils/documents");
const calculateRemark_1 = __importDefault(require("../utils/calculateRemark"));
//view candidates
const viewCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = (req.query.page || 1);
        const limit = (req.query.limit || 50);
        const candidates = yield candidateModel_1.Candidate.find()
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        const total = yield candidateModel_1.Candidate.countDocuments();
        const totalCandidates = candidates.map((c, i) => {
            return Object.assign(Object.assign({}, c), { defaultPassword: c.passwords[0], id: (page - 1) * limit + i + 1 });
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
exports.viewCandidates = viewCandidates;
//export const login
const loginAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const admin = yield adminLogin_1.AdminModel.findOne({ email });
        if (!admin) {
            return res.status(400).send("Admin not found");
        }
        const isPasswordValid = yield bcrypt_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(400).send("Invalid password");
        }
        const accessToken = (0, jwtController_1.generateToken)({
            _id: admin._id,
            role: "admin",
            specificRole: admin.role,
        });
        const refreshToken = (0, jwtController_1.generateRefreshToken)({
            _id: admin._id,
            role: "admin",
            specificRole: admin.role,
        });
        res
            .cookie(jwtController_1.tokens.auth_token, accessToken, {
            httpOnly: false,
            secure: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 1000 * 60 * 60, // 1h
        })
            .cookie(jwtController_1.tokens.refresh_token, refreshToken, {
            httpOnly: false,
            secure: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
        })
            .send("Logged In");
    }
    catch (error) {
        console.log(error);
    }
});
exports.loginAdmin = loginAdmin;
const jobQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 50,
    retryDelay: 1000,
    retries: 3,
    shutdownTimeout: 20000,
    maxQueueSize: 100,
});
const createAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const admin = yield adminLogin_1.AdminModel.findOne({ email });
        if (admin) {
            return res.status(400).send("Admin already exists");
        }
        res.send("Account created");
        jobQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
            const hashedPassowrd = yield bcrypt_1.default.hash(password, 10);
            const newAdmin = new adminLogin_1.AdminModel(Object.assign(Object.assign({}, req.body), { email, password: hashedPassowrd }));
            yield newAdmin.save();
        }));
    }
    catch (error) {
        console.log(error);
    }
});
exports.createAccount = createAccount;
const dashboardSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const [candidates, pending, recommended, approved, rejected] = yield Promise.all([
        candidateModel_1.Candidate.countDocuments(),
        candidateModel_1.Candidate.countDocuments({ status: "pending" }),
        candidateModel_1.Candidate.countDocuments({ status: "recommended" }),
        candidateModel_1.Candidate.countDocuments({ status: "approved" }),
        candidateModel_1.Candidate.countDocuments({ status: "rejected" }),
    ]);
    res.send({
        candidates: candidates.toLocaleString(),
        pending: pending.toLocaleString(),
        recommended: recommended.toLocaleString(),
        approved: approved.toLocaleString(),
        rejected: rejected.toLocaleString(),
    });
});
exports.dashboardSummary = dashboardSummary;
const uploadFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }
    let newPath = "";
    try {
        const uploadDir = path_1.default.join(__dirname, "../adminuploads");
        // Ensure folder exists
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const extension = path_1.default.extname(req.file.originalname);
        const newFileName = `${Date.now()}${extension}`;
        newPath = path_1.default.join(uploadDir, newFileName);
        // Rename (move) the file
        fs_1.default.renameSync(req.file.path, newPath);
        const result = (0, convert_excel_to_json_1.default)({
            sourceFile: newPath,
            header: { rows: 1 },
            columnToKey: {
                A: "ippisNumber",
                B: "fullName",
                C: "dateOfBirth",
                D: "gender",
                E: "stateOfOrigin",
                F: "lga",
                G: "poolOffice",
                H: "currentMDA",
                I: "cadre",
                J: "gradeLevel",
                K: "dateOfFirstAppointment",
                L: "dateOfConfirmation",
                M: "dateOfLastPromotion",
                N: "phoneNumber",
                O: "email",
                P: "stateOfCurrentPosting",
                Q: "year2021",
                R: "year2022",
                S: "year2023",
                T: "year2024",
                U: "remark",
            },
        });
        const allRows = Object.values(result).flat();
        for (let i = 0; i < allRows.length; i += 500) {
            const batch = allRows.slice(i, i + 500);
            const plainPassword = (0, generateRandomPassword_1.default)(8);
            const hashedPassword = yield bcrypt_1.default.hash(plainPassword, 10);
            const preparedBatch = batch.map((c) => (Object.assign(Object.assign({}, c), { password: hashedPassword, passwords: [plainPassword], uploadedDocuments: documents_1.documentsToUpload, remark: (0, calculateRemark_1.default)(c) })));
            yield candidateModel_1.Candidate.insertMany(preparedBatch);
        }
        res.send(`Created ${allRows.length.toLocaleString()} candidates`);
    }
    catch (err) {
        // console.error(err);
        // await Candidate.deleteMany();
        // res.status(500).send(new Error(err).message);
        console.error(err);
        // Duplicate key error
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0]; // e.g. "email"
            const value = err.keyValue[field];
            return res
                .status(500)
                .send(`Duplicate value for ${field}: "${value}". Please ensure this field is unique.`);
        }
        // Fallback for other errors
        res.status(500).send(err.message || "An unexpected error occurred");
    }
    finally {
        // Delete the uploaded file
        fs_1.default.unlinkSync(newPath);
    }
});
exports.uploadFile = uploadFile;
const deleteCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield candidateModel_1.Candidate.deleteMany();
    res.send("All candidates deleted");
});
exports.deleteCandidates = deleteCandidates;
const createOfficerAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // return res.status(400).send("Admin already exists oooo");
        /**Check for existing email */
        const existing = yield adminLogin_1.AdminModel.findOne({
            $or: [{ email: req.body.email }, { phoneNumber: req.body.phoneNumber }],
        });
        if (existing) {
            return res.status(400).send("Email or phone number already exists");
        }
        const hashedPassowrd = yield bcrypt_1.default.hash(req.body.password, 10);
        const newAdmin = new adminLogin_1.AdminModel(Object.assign(Object.assign({}, req.body), { email: req.body.email, password: hashedPassowrd, yetToChangePassword: true }));
        yield newAdmin.save();
        res.send("Account created");
    }
    catch (error) {
        console.log(error);
        res.status(500).send("Server error while handling upload");
    }
});
exports.createOfficerAccount = createOfficerAccount;
const officerDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [hrs, promotions] = yield Promise.all([
            adminLogin_1.AdminModel.countDocuments({ role: "hr" }),
            adminLogin_1.AdminModel.countDocuments({ role: "promotion" }),
        ]);
        res.send({
            hrs: hrs.toLocaleString(),
            promotions: promotions.toLocaleString(),
        });
    }
    catch (error) { }
});
exports.officerDashboard = officerDashboard;
const viewAdminStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield adminLogin_1.AdminModel.find({ role: req.params.slug });
    res.send(data);
});
exports.viewAdminStaff = viewAdminStaff;
const viewUploadedDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield candidateModel_1.Candidate.findById(req.query._id).lean();
    if (!data) {
        return res.status(404).send("Candidate not found");
    }
    const uploadedDocuments = data.uploadedDocuments.map((c, i) => {
        return Object.assign(Object.assign({}, c), { id: i + 1 });
    });
    res.send({
        uploadedDocuments,
        //recommended: data.recommended,
        dateRecommended: data.dateRecommended,
        enableButton: uploadedDocuments.filter((c) => c.fileUrl).length === 0,
    });
});
exports.viewUploadedDocuments = viewUploadedDocuments;
const mdaOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield candidateModel_1.Candidate.aggregate([
        {
            $group: {
                _id: "$currentMDA",
                totalCandidates: { $sum: 1 },
            },
        },
        {
            $sort: { _id: 1 }, // sort alphabetically by currentMDA directly in Mongo
        },
    ]);
    const rows = result.map((r, i) => ({
        id: i + 1,
        name: r._id,
        value: r.totalCandidates,
    }));
    res.send(rows);
});
exports.mdaOverview = mdaOverview;
const uploadAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield candidateModel_1.Candidate.aggregate([
        {
            $project: {
                uploadsCount: {
                    $size: {
                        $filter: {
                            input: "$uploadedDocuments",
                            as: "doc",
                            cond: { $ifNull: ["$$doc.fileUrl", false] },
                        },
                    },
                },
            },
        },
        {
            $group: {
                _id: "$uploadsCount",
                totalCandidates: { $sum: 1 },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);
    // Format response
    const analysis = result.map((r) => ({
        uploads: r._id,
        candidates: r.totalCandidates,
    }));
    res.send(analysis);
});
exports.uploadAnalysis = uploadAnalysis;
const searchCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidates = yield candidateModel_1.Candidate.find({
        $or: [
            { fullName: { $regex: req.query.q, $options: "i" } },
            { email: { $regex: req.query.q, $options: "i" } },
            { phoneNumber: { $regex: req.query.q, $options: "i" } },
            { ippisNumber: { $regex: req.query.q, $options: "i" } },
            { status: { $regex: req.query.q, $options: "i" } },
        ],
    })
        .populate("recommendedBy approvedBy")
        .lean()
        .limit(50);
    const mapCandidates = candidates.map((c, i) => {
        return Object.assign(Object.assign({}, c), { id: i + 1, password: c.passwords[0], uploadedDocuments: c.uploadedDocuments.filter((c) => c.fileUrl)
                .length, recommendedBy: c.recommendedBy
                ? `${c.recommendedBy.firstName} ${c.recommendedBy.lastName}`
                : "-", approvedBy: c.approvedBy
                ? `${c.approvedBy.firstName} ${c.approvedBy.lastName}`
                : "-", dateRecommended: c.dateRecommended
                ? new Date(c.dateRecommended).toLocaleString()
                : "-", dateApproved: c.dateApproved
                ? new Date(c.dateApproved).toLocaleString()
                : "-" });
    });
    res.send(mapCandidates);
});
exports.searchCandidate = searchCandidate;
const reverseApproval = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findById(req.query._id);
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    yield candidateModel_1.Candidate.findByIdAndUpdate(req.query._id, {
        status: "pending",
        $unset: {
            recommendedBy: null,
            dateRecommended: null,
            approvedBy: null,
            dateApproved: null,
        },
    });
    res.send("Approval reversed");
});
exports.reverseApproval = reverseApproval;
