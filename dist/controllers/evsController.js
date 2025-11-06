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
exports.createEVSAccount = void 0;
const DataQueue_1 = require("../utils/DataQueue");
const evsAccountModel_1 = __importDefault(require("../models/evsAccountModel"));
const generateRandomPassword_1 = __importDefault(require("../utils/generateRandomPassword"));
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
