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
exports.uploadFile = exports.dashboardSummary = exports.createAccount = exports.loginAdmin = exports.viewCandidates = void 0;
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
//view candidates
const viewCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = (req.query.page || 1);
    const limit = (req.query.limit || 50);
    const candidates = yield candidateModel_1.Candidate.find()
        .skip((page - 1) * limit)
        .limit(limit);
    res.send(candidates);
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
        const accessToken = (0, jwtController_1.generateToken)({ _id: admin._id, role: "admin" });
        const refreshToken = (0, jwtController_1.generateRefreshToken)({
            _id: admin._id,
            role: "admin",
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
const HEADER_MAP = {
    "IPPIS Number": "ippisNumber",
    "Name (Surname, First Name)": "fullName",
    DOB: "dateOfBirth",
    Gender: "gender",
    "State of Origin": "stateOfOrigin",
    "Local Government Area": "lga",
    "Pool Office": "poolOffice",
    "Current MDA": "currentMDA",
    Cadre: "cadre",
    "Grade Level": "gradeLevel",
    "Date of First Appointment": "dateOfFirstAppointment",
    "Date of Confirmation": "dateOfConfirmation",
    "Date of Last Promotion": "dateOfLastPromotion",
    "Phone Number": "phoneNumber",
    Email: "email",
    "State of Current Posting": "stateOfCurrentPosting",
    Year2021: "year2021",
    Year2022: "year2022",
    Year2023: "year2023",
    Year2024: "year2024",
    Remark: "remark",
};
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
                processedChunk.push(Object.assign(Object.assign({}, candidate), { passwords: [plainPassword], password: hashedPassword, isDefaultPassword: true, uploadedDocuments: documents_1.documentsToUpload }));
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
