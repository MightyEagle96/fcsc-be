import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const environment = process.env.NODE_ENV || "development";

const databaseURI = (
  environment === "production"
    ? process.env.PROD_DB_URI
    : process.env.DEV_DB_URI
) as string;

//const databaseURI = process.env.MONGO_URI as string;
let isConnected = false;

// console.log({ databaseURI });
export const ConnectDatabase = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(databaseURI, {
      connectTimeoutMS: 60_000,
      serverSelectionTimeoutMS: 60_000,
      maxPoolSize: 20,
      minPoolSize: 5,
      retryWrites: true,
      w: "majority",
    });
    isConnected = true;
    console.log("✅ DB connected successfully");
  } catch (err) {
    console.error("❌ DB connection error:", (err as Error).message);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected. Retrying...");
    isConnected = false;
    setTimeout(ConnectDatabase, 5000);
  });
};
