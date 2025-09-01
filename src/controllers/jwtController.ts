import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import {
  AuthenticatedCandidate,
  Candidate,
  ICandidate,
} from "../models/candidateModel";
import { AdminModel, AuthenticatedAdmin, IAdmin } from "../models/adminLogin";
// import {
//   AuthenticatedStudent,
//   IStudent,
//   StudentModel,
// } from "../models/studentModel";

dotenv.config();

export const tokens = {
  auth_token: "auth_token",
  refresh_token: "refresh_token",
};

export function generateToken(payload: object) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN as string, {
    expiresIn: "1d",
  });
}

export function generateRefreshToken(payload: object) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN as string, {
    expiresIn: "2d",
  });
}

export interface JointInterface extends Request {
  candidate?: ICandidate;
  admin?: IAdmin;
}

export async function authenticateToken(
  req: JointInterface,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from cookie
    const token = req.cookies[tokens.auth_token];

    //console.log(token);
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload & ICandidate;
    if (!decoded?._id) {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    if (decoded.role && decoded.role === "admin") {
      const admin = await AdminModel.findById(decoded._id);
      if (!admin) {
        return res.status(401).send("Not authenticated");
      }
      req.admin = admin;
    } else {
      const candidate = await Candidate.findById(decoded._id).lean();
      if (!candidate) {
        return res.status(401).send("Not authenticated");
      }

      req.candidate = candidate;
    }
    // Check student in DB

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token expired");
    }
    return res.status(403).json("Invalid token");
  }
}
