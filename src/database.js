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
exports.ConnectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const environment = process.env.NODE_ENV || "development";
const databaseURI = (environment === "production"
    ? process.env.PROD_DB_URI
    : process.env.DEV_DB_URI);
//const databaseURI = process.env.MONGO_URI as string;
let isConnected = false;
// console.log({ databaseURI });
const ConnectDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    if (isConnected)
        return;
    try {
        yield mongoose_1.default.connect(databaseURI, {
            connectTimeoutMS: 60000,
            serverSelectionTimeoutMS: 60000,
            maxPoolSize: 20,
            minPoolSize: 5,
            retryWrites: true,
            w: "majority",
        });
        isConnected = true;
        console.log("✅ DB connected successfully");
    }
    catch (err) {
        console.error("❌ DB connection error:", err.message);
        process.exit(1);
    }
    mongoose_1.default.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected. Retrying...");
        isConnected = false;
        setTimeout(exports.ConnectDatabase, 5000);
    });
});
exports.ConnectDatabase = ConnectDatabase;
