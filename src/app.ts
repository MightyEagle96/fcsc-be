import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { ConnectDatabase } from "./database";
import appRouter from "./routers/router";
import cors from "cors";
import cookieParser from "cookie-parser";
import path = require("path");

// import crypto from "crypto";

// const secret1 = crypto.randomBytes(256).toString("base64");
// const secret2 = crypto.randomBytes(256).toString("base64");

// console.log({ secret1, secret2 });

dotenv.config();

ConnectDatabase();
const app = express();

const whitelist = [
  "http://192.168.137.1:5173",
  "http://localhost:3000",
  "http://192.168.16.78:3000",
  "http://localhost:3456",
  "https://fcsc.onrender.com",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true); // Allow request
    } else {
      callback(new Error("Not allowed by CORS")); // Block request
    }
  },
  credentials: true, // If you use cookies/sessions
};

const port = parseInt(process.env.PORT as string) || 3456;
app

  .use(morgan("dev"))

  .use(cookieParser())

  .use(cors(corsOptions))

  .use(express.json({ limit: "50mb" }))

  .use(express.static(path.join(__dirname, "build")))

  .use("/api", appRouter)

  .get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  })

  .listen(port, "0.0.0.0", () => {
    console.log("App is listening");
  });
