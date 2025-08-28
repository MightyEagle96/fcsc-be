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
exports.getRefreshToken = exports.logoutCandidate = exports.myProfile = exports.loginCandidate = exports.batchUploadCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const generateRandomPassword_1 = __importDefault(require("../utils/generateRandomPassword"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwtController_1 = require("./jwtController");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const batchUploadCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //res.send("Hello");
    try {
        const candidates = req.body; // expect array of candidate objects
        const saltRounds = 10;
        const processedCandidates = yield Promise.all(candidates.map((candidate) => __awaiter(void 0, void 0, void 0, function* () {
            const plainPassword = (0, generateRandomPassword_1.default)(10);
            const hashedPassword = yield bcrypt_1.default.hash(plainPassword, saltRounds);
            return Object.assign(Object.assign({}, candidate), { passwords: [plainPassword], password: hashedPassword, 
                // if you want to track that it’s system-generated
                isDefaultPassword: true });
        })));
        // Bulk insert
        const result = yield candidateModel_1.Candidate.insertMany(processedCandidates, {
            ordered: false,
        });
        res.status(201).json({
            message: "Bulk upload successful",
            insertedCount: result.length,
        });
    }
    catch (err) {
        console.error("Bulk insert error:", err);
        res.status(500).json({ message: "Error uploading candidates" });
    }
});
exports.batchUploadCandidates = batchUploadCandidates;
const loginCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findOne({ email: req.body.email });
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    const isPasswordValid = yield bcrypt_1.default.compare(req.body.password, candidate.password);
    if (isPasswordValid) {
        const accessToken = (0, jwtController_1.generateToken)({ _id: candidate._id });
        const refreshToken = (0, jwtController_1.generateRefreshToken)({ _id: candidate._id });
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
    else {
        res.status(401).send("Invalid password");
    }
});
exports.loginCandidate = loginCandidate;
const myProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = req.candidate;
    res.send({
        _id: candidate._id,
        name: candidate.firstName + " " + candidate.lastName,
        email: candidate.email,
        fileNumber: candidate.fileNumber,
        phoneNumber: candidate.phone,
    });
});
exports.myProfile = myProfile;
const logoutCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res
        .clearCookie(jwtController_1.tokens.auth_token)
        .clearCookie(jwtController_1.tokens.refresh_token)
        .send("Logged Out");
});
exports.logoutCandidate = logoutCandidate;
const getRefreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const refreshToken = req.cookies[jwtController_1.tokens.refresh_token];
    if (!refreshToken) {
        return res.status(401).send("Not authenticated");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN);
        const candidate = yield candidateModel_1.Candidate.findById(decoded._id);
        if (!candidate) {
            return res.status(401).send("Invalid refresh token");
        }
        const accessToken = (0, jwtController_1.generateToken)({ _id: candidate._id });
        const newRefreshToken = (0, jwtController_1.generateRefreshToken)({ _id: candidate._id });
        res
            .cookie(jwtController_1.tokens.auth_token, accessToken, {
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
            .send("Logged In");
    }
    catch (error) {
        console.error(error);
        res.status(401).send("Invalid refresh token");
    }
    //  res.send(req.cookies[tokens.refresh_token]);
});
exports.getRefreshToken = getRefreshToken;
