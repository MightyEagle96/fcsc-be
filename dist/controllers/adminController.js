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
exports.createAccount = exports.loginAdmin = exports.viewCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const adminLogin_1 = require("../models/adminLogin");
const DataQueue_1 = require("../utils/DataQueue");
const bcrypt_1 = __importDefault(require("bcrypt"));
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
const loginAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () { });
exports.loginAdmin = loginAdmin;
const jobQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 50,
    retryDelay: 1000,
    retries: 3,
    shutdownTimeout: 20000,
    maxQueueSize: 100,
});
const createAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const admin = yield adminLogin_1.AdminModel.findOne({ email });
    if (admin) {
        return res.status(400).send("Admin already exists");
    }
    res.send("Account created");
    jobQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
        const hashedPassowrd = yield bcrypt_1.default.hash(password, 10);
        const newAdmin = new adminLogin_1.AdminModel({ email, password: hashedPassowrd });
        yield newAdmin.save();
        return newAdmin;
    }));
});
exports.createAccount = createAccount;
