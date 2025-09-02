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
exports.mdaOverview = exports.viewUploadedDocuments = exports.viewAdminStaff = exports.officerDashboard = exports.createOfficerAccount = exports.deleteCandidates = exports.uploadFile = exports.dashboardSummary = exports.createAccount = exports.loginAdmin = exports.viewCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const adminLogin_1 = require("../models/adminLogin");
const DataQueue_1 = require("../utils/DataQueue");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwtController_1 = require("./jwtController");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const excelToStaffJson_1 = require("../utils/excelToStaffJson");
const generateRandomPassword_1 = __importDefault(require("../utils/generateRandomPassword"));
const documents_1 = require("../utils/documents");
const normalizeDate_1 = require("../utils/normalizeDate");
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
            return Object.assign(Object.assign({}, c), { id: (page - 1) * limit + i + 1 });
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
    const [candidates, verifiedCandidates, unverifiedCandidates] = yield Promise.all([
        candidateModel_1.Candidate.countDocuments(),
        candidateModel_1.Candidate.countDocuments({ verified: true }),
        candidateModel_1.Candidate.countDocuments({ verified: false }),
    ]);
    res.send({
        candidates: candidates.toLocaleString(),
        verifiedCandidates: verifiedCandidates.toLocaleString(),
        unverifiedCandidates: unverifiedCandidates.toLocaleString(),
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
        // Convert Excel to schema-ready JSON
        const results = (0, excelToStaffJson_1.excelToStaffJson)(newPath);
        const candidates = results;
        const saltRounds = 10;
        // ✅ Process candidates in chunks
        const chunkSize = 1000;
        let totalInserted = 0;
        for (let i = 0; i < candidates.length; i += chunkSize) {
            const chunk = candidates.slice(i, i + chunkSize);
            // Process this chunk: hash + enrich data
            const processedChunk = [];
            for (const candidate of chunk) {
                const plainPassword = (0, generateRandomPassword_1.default)(10);
                const hashedPassword = yield bcrypt_1.default.hash(plainPassword, saltRounds);
                processedChunk.push(Object.assign(Object.assign({}, candidate), { dateOfBirth: (0, normalizeDate_1.normalizeDate)(candidate.dateOfBirth), dateOfFirstAppointment: (0, normalizeDate_1.normalizeDate)(candidate.dateOfFirstAppointment), dateOfConfirmation: (0, normalizeDate_1.normalizeDate)(candidate.dateOfConfirmation), dateOfLastPromotion: (0, normalizeDate_1.normalizeDate)(candidate.dateOfLastPromotion), passwords: [plainPassword], password: hashedPassword, isDefaultPassword: true, uploadedDocuments: documents_1.documentsToUpload }));
            }
            // Bulk insert chunk
            const inserted = yield candidateModel_1.Candidate.insertMany(processedChunk, {
                ordered: false,
            });
            totalInserted += inserted.length;
        }
        res.send(`${totalInserted} candidates uploaded successfully`);
    }
    catch (err) {
        console.error(err);
        // res.status(500).send("Server error while handling upload");
        res.status(500).send(new Error(err).message);
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
    res.send(uploadedDocuments);
});
exports.viewUploadedDocuments = viewUploadedDocuments;
const mdaOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield candidateModel_1.Candidate.aggregate([
        {
            $group: {
                _id: "$currentMDA", // group by currentMDA
                totalCandidates: { $sum: 1 }, // count records in each group
            },
        },
        {
            $sort: { totalCandidates: -1 }, // optional: sort by count (descending)
        },
    ]);
    const rows = result.map((r, i) => {
        return {
            id: i + 1,
            name: r._id,
            value: r.totalCandidates,
        };
    });
    res.send(rows);
});
exports.mdaOverview = mdaOverview;
