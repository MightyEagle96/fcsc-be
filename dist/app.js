"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const router_1 = __importDefault(require("./routers/router"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path = require("path");
// import crypto from "crypto";
// const secret1 = crypto.randomBytes(256).toString("base64");
// const secret2 = crypto.randomBytes(256).toString("base64");
// console.log({ secret1, secret2 });
dotenv_1.default.config();
(0, database_1.ConnectDatabase)();
const app = (0, express_1.default)();
const whitelist = [
    "http://192.168.137.1:5173",
    "http://localhost:3000",
    "http://192.168.16.78:3000",
    "http://localhost:3456",
    "https://fcsc.onrender.com",
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || whitelist.includes(origin)) {
            callback(null, true); // Allow request
        }
        else {
            callback(new Error("Not allowed by CORS")); // Block request
        }
    },
    credentials: true, // If you use cookies/sessions
};
const port = parseInt(process.env.PORT) || 3456;
app
    .use((0, morgan_1.default)("dev"))
    .use((0, cookie_parser_1.default)())
    .use((0, cors_1.default)(corsOptions))
    .use(express_1.default.json({ limit: "50mb" }))
    .use(express_1.default.static(path.join(__dirname, "build")))
    .use("/api", router_1.default)
    .get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
})
    .listen(port, "0.0.0.0", () => {
    console.log("App is listening");
});
