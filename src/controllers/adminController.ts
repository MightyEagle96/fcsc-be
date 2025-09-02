import { Request, Response } from "express";
import { Candidate, ICandidate } from "../models/candidateModel";
import { AdminModel } from "../models/adminLogin";
import { ConcurrentJobQueue } from "../utils/DataQueue";
import bcrypt from "bcrypt";
import { generateRefreshToken, generateToken, tokens } from "./jwtController";
import path from "path";
import fs from "fs";
import { excelToStaffJson } from "../utils/excelToStaffJson";
import generateRandomPassword from "../utils/generateRandomPassword";
import { documentsToUpload } from "../utils/documents";
import { normalizeDate } from "../utils/normalizeDate";

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

const HEADER_MAP: Record<string, keyof ICandidate> = {
  "IPPIS Number": "ippisNumber",
  "Name (Surname, First Name)": "fullName",
  DOB: "dateOfBirth",
  Gender: "gender",
  "State of Origin": "stateOfOrigin",
  "Local Government Area": "lga",
  "Pool Office": "poolOffice",
  "Current MDA": "currentMDA",
  Cadre: "cadre",
  "Grade Level": "gradeLevel",
  "Date of First Appointment": "dateOfFirstAppointment",
  "Date of Confirmation": "dateOfConfirmation",
  "Date of Last Promotion": "dateOfLastPromotion",
  "Phone Number": "phoneNumber",
  Email: "email",
  "State of Current Posting": "stateOfCurrentPosting",
  Year2021: "year2021",
  Year2022: "year2022",
  Year2023: "year2023",
  Year2024: "year2024",
  Remark: "remark",
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

    // Convert Excel to schema-ready JSON
    const results = excelToStaffJson(newPath);
    const candidates: any[] = results;

    const saltRounds = 10;

    // ✅ Process candidates in chunks
    const chunkSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);

      // Process this chunk: hash + enrich data
      const processedChunk = [];
      for (const candidate of chunk) {
        const plainPassword = generateRandomPassword(10);
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        processedChunk.push({
          ...candidate,
          dateOfBirth: normalizeDate(candidate.dateOfBirth),
          dateOfFirstAppointment: normalizeDate(
            candidate.dateOfFirstAppointment
          ),
          dateOfConfirmation: normalizeDate(candidate.dateOfConfirmation),
          dateOfLastPromotion: normalizeDate(candidate.dateOfLastPromotion),
          passwords: [plainPassword], // keep plain for export/communication
          password: hashedPassword, // secure storage
          isDefaultPassword: true,
          uploadedDocuments: documentsToUpload, // from your context
        });
      }

      // Bulk insert chunk
      const inserted = await Candidate.insertMany(processedChunk, {
        ordered: false,
      });
      totalInserted += inserted.length;
    }

    res.send(`${totalInserted} candidates uploaded successfully`);
  } catch (err: any) {
    console.error(err);
    // res.status(500).send("Server error while handling upload");
    res.status(500).send(new Error(err).message);
  } finally {
    // Delete the uploaded file
    fs.unlinkSync(newPath);
  }
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

export const mdaCandidates = async (req: Request, res: Response) => {
  const [candidates, recommended] = await Promise.all([
    Candidate.countDocuments({ currentMDA: req.query.slug }),
    Candidate.countDocuments({ currentMDA: req.query.slug, recommended: true }),
  ]);

  res.send({
    candidates: candidates.toLocaleString(),
    recommended: recommended.toLocaleString(),
  });
};

export const viewMdaCandidates = async (req: Request, res: Response) => {
  try {
    const page = (req.query.page || 1) as number;
    const limit = (req.query.limit || 50) as number;
    const candidates = await Candidate.find({
      currentMDA: req.query.slug,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Candidate.countDocuments({
      currentMDA: req.query.slug,
    });

    const totalCandidates = candidates.map((c, i) => {
      return {
        ...c,
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
