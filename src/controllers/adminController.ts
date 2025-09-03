import { Request, Response } from "express";
import { Candidate, ICandidate } from "../models/candidateModel";
import { AdminModel } from "../models/adminLogin";
import { ConcurrentJobQueue } from "../utils/DataQueue";
import bcrypt from "bcrypt";
import {
  generateRefreshToken,
  generateToken,
  JointInterface,
  tokens,
} from "./jwtController";
import path from "path";
import fs from "fs";
import excelToJson from "convert-excel-to-json";
import generateRandomPassword from "../utils/generateRandomPassword";
import { documentsToUpload } from "../utils/documents";

//view candidates
export const viewCandidates = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page || 1) as number;
    const limit = (req.query.limit || 50) as number;
    const candidates = await Candidate.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Candidate.countDocuments();

    const totalCandidates = candidates.map((c, i) => {
      return {
        ...c,
        defaultPassword: c.passwords[0],
        id: (page - 1) * limit + i + 1,
      };
    });
    res.send({
      candidates: totalCandidates,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.send({
      candidates: [],
      total: 0,
      page: 0,
      limit: 0,
    });
  }
};

//export const login
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res.status(400).send("Admin not found");
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).send("Invalid password");
    }

    const accessToken = generateToken({
      _id: admin._id,
      role: "admin",
      specificRole: admin.role,
    });

    const refreshToken = generateRefreshToken({
      _id: admin._id,
      role: "admin",
      specificRole: admin.role,
    });

    res
      .cookie(tokens.auth_token, accessToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60, // 1h
      })
      .cookie(tokens.refresh_token, refreshToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
      })
      .send("Logged In");
  } catch (error) {
    console.log(error);
  }
};

const jobQueue = new ConcurrentJobQueue({
  concurrency: 50,
  retryDelay: 1000,
  retries: 3,
  shutdownTimeout: 20000,
  maxQueueSize: 100,
});
export const createAccount = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await AdminModel.findOne({ email });

    if (admin) {
      return res.status(400).send("Admin already exists");
    }

    res.send("Account created");
    jobQueue.enqueue(async () => {
      const hashedPassowrd = await bcrypt.hash(password, 10);
      const newAdmin = new AdminModel({
        ...req.body,
        email,
        password: hashedPassowrd,
      });
      await newAdmin.save();
    });
  } catch (error) {
    console.log(error);
  }
};

export const dashboardSummary = async (req: Request, res: Response) => {
  const [candidates, verifiedCandidates, unverifiedCandidates] =
    await Promise.all([
      Candidate.countDocuments(),
      Candidate.countDocuments({ verified: true }),
      Candidate.countDocuments({ verified: false }),
    ]);

  res.send({
    candidates: candidates.toLocaleString(),
    verifiedCandidates: verifiedCandidates.toLocaleString(),
    unverifiedCandidates: unverifiedCandidates.toLocaleString(),
  });
};

export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  let newPath = "";
  try {
    const uploadDir = path.join(__dirname, "../adminuploads");

    // Ensure folder exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const extension = path.extname(req.file.originalname);
    const newFileName = `${Date.now()}${extension}`;
    newPath = path.join(uploadDir, newFileName);

    // Rename (move) the file
    fs.renameSync(req.file.path, newPath);

    const result = excelToJson({
      sourceFile: newPath,
      header: { rows: 1 },
      columnToKey: {
        A: "ippisNumber",
        B: "fullName",
        C: "dateOfBirth",
        D: "gender",
        E: "stateOfOrigin",
        F: "lga",
        G: "poolOffice",
        H: "currentMDA",
        I: "cadre",
        J: "gradeLevel",
        K: "dateOfFirstAppointment",
        L: "dateOfConfirmation",
        M: "dateOfLastPromotion",
        N: "phoneNumber",
        O: "email",
        P: "stateOfCurrentPosting",
        Q: "year2021",
        R: "year2022",
        S: "year2023",
        T: "year2024",
        U: "remark",
      },
    });

    const allRows = Object.values(result).flat();

    for (let i = 0; i < allRows.length; i += 500) {
      const batch = allRows.slice(i, i + 500);

      const plainPassword = generateRandomPassword(8);
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const preparedBatch = batch.map((c: ICandidate) => ({
        ...c,
        password: hashedPassword,
        passwords: [plainPassword],
        uploadedDocuments: documentsToUpload,
      }));

      await Candidate.insertMany(preparedBatch);
    }
    res.send(`Length is ${allRows.length}`);
  } catch (err: any) {
    console.error(err);

    await Candidate.deleteMany();
    // res.status(500).send("Server error while handling upload");
    res.status(500).send(new Error(err).message);
  } finally {
    // Delete the uploaded file
    fs.unlinkSync(newPath);
  }
};

export const deleteCandidates = async (req: Request, res: Response) => {
  await Candidate.deleteMany();
  res.send("All candidates deleted");
};

export const createOfficerAccount = async (req: Request, res: Response) => {
  try {
    // return res.status(400).send("Admin already exists oooo");
    /**Check for existing email */
    const existing = await AdminModel.findOne({
      $or: [{ email: req.body.email }, { phoneNumber: req.body.phoneNumber }],
    });

    if (existing) {
      return res.status(400).send("Email or phone number already exists");
    }

    const hashedPassowrd = await bcrypt.hash(req.body.password, 10);

    const newAdmin = new AdminModel({
      ...req.body,
      email: req.body.email,
      password: hashedPassowrd,
      yetToChangePassword: true,
    });
    await newAdmin.save();
    res.send("Account created");
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error while handling upload");
  }
};

export const officerDashboard = async (req: Request, res: Response) => {
  try {
    const [hrs, promotions] = await Promise.all([
      AdminModel.countDocuments({ role: "hr" }),
      AdminModel.countDocuments({ role: "promotion" }),
    ]);

    res.send({
      hrs: hrs.toLocaleString(),
      promotions: promotions.toLocaleString(),
    });
  } catch (error) {}
};

export const viewAdminStaff = async (req: Request, res: Response) => {
  const data = await AdminModel.find({ role: req.params.slug });

  res.send(data);
};

export const viewUploadedDocuments = async (req: Request, res: Response) => {
  const data = await Candidate.findById(req.query._id).lean();

  if (!data) {
    return res.status(404).send("Candidate not found");
  }
  const uploadedDocuments = data.uploadedDocuments.map((c, i) => {
    return { ...c, id: i + 1 };
  });
  res.send({
    uploadedDocuments,
    recommended: data.recommended,
    dateRecommended: data.dateRecommended,
    enableButton: uploadedDocuments.filter((c) => c.fileUrl).length === 0,
  });
};

export const mdaOverview = async (req: Request, res: Response) => {
  const result = await Candidate.aggregate([
    {
      $group: {
        _id: "$currentMDA", // group by currentMDA
        totalCandidates: { $sum: 1 }, // count records in each group
      },
    },
    {
      $sort: { totalCandidates: -1 }, // optional: sort by count (descending)
    },
  ]);
  const rows = result.map((r, i) => {
    return {
      id: i + 1,
      name: r._id,
      value: r.totalCandidates,
    };
  });
  res.send(rows);
};
