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
exports.authenticateToken = exports.generateRefreshToken = exports.generateToken = exports.tokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const candidateModel_1 = require("../models/candidateModel");
const adminLogin_1 = require("../models/adminLogin");
// import {
//   AuthenticatedStudent,
//   IStudent,
//   StudentModel,
// } from "../models/studentModel";
dotenv_1.default.config();
exports.tokens = {
    auth_token: "auth_token",
    refresh_token: "refresh_token",
};
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
    });
}
exports.generateToken = generateToken;
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.REFRESH_TOKEN, {
        expiresIn: "2d",
    });
}
exports.generateRefreshToken = generateRefreshToken;
function authenticateToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get token from cookie
            const token = req.cookies[exports.tokens.auth_token];
            //console.log(token);
            if (!token) {
                return res.status(401).json({ message: "Not authenticated" });
            }
            // Verify JWT
            const decoded = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN);
            if (!(decoded === null || decoded === void 0 ? void 0 : decoded._id)) {
                return res.status(403).json({ message: "Invalid token payload" });
            }
            if (decoded.role && decoded.role === "admin") {
                const admin = yield adminLogin_1.AdminModel.findById(decoded._id);
                if (!admin) {
                    return res.status(401).send("Not authenticated");
                }
                req.admin = admin;
            }
            else {
                const candidate = yield candidateModel_1.Candidate.findById(decoded._id).lean();
                if (!candidate) {
                    return res.status(401).send("Not authenticated");
                }
                req.candidate = candidate;
            }
            // Check student in DB
            next();
        }
        catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).send("Token expired");
            }
            return res.status(403).json("Invalid token");
        }
    });
}
exports.authenticateToken = authenticateToken;
