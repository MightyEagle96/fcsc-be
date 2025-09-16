import { Request, Response } from "express";
import { Candidate, ICandidate } from "../models/candidateModel";
import { AdminModel, AuthenticatedAdmin } from "../models/adminLogin";
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
import { documents, documentsToUpload } from "../utils/documents";
import calculateRemark from "../utils/calculateRemark";
import { sendMailFunc } from "../utils/nodemailer";
import { emailTemplate } from "./emailTemplate";
import { SendSms } from "../utils/smsHandler";
import { CorrectionModel } from "../models/correctionData";
import { Types } from "mongoose";
import { CADRES, MDAS, stateAndLgas } from "../utils/excelData";
import { resetPasswordTemplate } from "./resetPasswordTemplate";
import crypto from "crypto";
import AdminLogModel from "../models/adminLogs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { applicationStatus } from "./promotionController";
import { parseDuplicateError } from "../utils/parseDuplicateError";

dayjs.extend(utc);

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
    const adminAccount = await AdminModel.countDocuments({ role: "admin" });
    if (adminAccount >= 3) {
      return res.status(400).send("Admin already exists");
    }

    const { email, password } = req.body;

    const admin = await AdminModel.findOne({
      $or: [{ phoneNumber: req.body.phoneNumber }, { email: req.body.email }],
    });

    if (admin) {
      return res.status(400).send("Email or phone number already exists");
    }

    jobQueue.enqueue(async () => {
      const hashedPassowrd = await bcrypt.hash(password, 10);
      const newAdmin = new AdminModel({
        ...req.body,
        email,
        password: hashedPassowrd,
        role: "admin",
      });
      await newAdmin.save();
    });
    res.send("Account created");
  } catch (error: any) {
    console.log(error);

    res.status(500).send(new Error(error).message);
  }
};

export const dashboardSummary = async (req: Request, res: Response) => {
  const [candidates, pending, recommended, approved, rejected, disqualified] =
    await Promise.all([
      Candidate.countDocuments(),
      Candidate.countDocuments({ status: applicationStatus.pending }),
      Candidate.countDocuments({ status: applicationStatus.recommended }),
      Candidate.countDocuments({ status: applicationStatus.approved }),
      Candidate.countDocuments({ status: applicationStatus.rejected }),
      Candidate.countDocuments({ status: applicationStatus.disqualified }),
    ]);

  res.send({
    candidates: candidates.toLocaleString(),
    pending: pending.toLocaleString(),
    recommended: recommended.toLocaleString(),
    approved: approved.toLocaleString(),
    rejected: rejected.toLocaleString(),
    disqualified: disqualified.toLocaleString(),
  });
};

// export const uploadFile = async (req: Request, res: Response) => {
//   if (!req.file) {
//     return res.status(400).send("No file uploaded");
//   }

//   let newPath = "";
//   try {
//     const uploadDir = path.join(__dirname, "../adminuploads");

//     // Ensure folder exists
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     const extension = path.extname(req.file.originalname);
//     const newFileName = `${Date.now()}${extension}`;
//     newPath = path.join(uploadDir, newFileName);

//     // Rename (move) the file
//     fs.renameSync(req.file.path, newPath);

//     const result = excelToJson({
//       sourceFile: newPath,
//       header: { rows: 1 },
//       columnToKey: {
//         A: "ippisNumber",
//         B: "fullName",
//         C: "dateOfBirth",
//         D: "gender",
//         E: "stateOfOrigin",
//         F: "lga",
//         G: "poolOffice",
//         H: "currentMDA",
//         I: "cadre",
//         J: "gradeLevel",
//         K: "dateOfFirstAppointment",
//         L: "dateOfConfirmation",
//         M: "dateOfLastPromotion",
//         N: "phoneNumber",
//         O: "email",
//         P: "stateOfCurrentPosting",
//         Q: "year2021",
//         R: "year2022",
//         S: "year2023",
//         T: "year2024",
//         U: "remark",
//       },
//     });

//     const allRows = Object.values(result).flat();

//     for (let i = 0; i < allRows.length; i += 500) {
//       const batch = allRows.slice(i, i + 500);

//       const plainPassword = generateRandomPassword(8);
//       const hashedPassword = await bcrypt.hash(plainPassword, 10);

//       const preparedBatch = batch.map((c: ICandidate) => ({
//         ...c,
//         password: hashedPassword,
//         passwords: [plainPassword],
//         uploadedDocuments: documentsToUpload,
//         remark: calculateRemark(c),
//       }));

//       await Candidate.insertMany(preparedBatch);
//     }
//     res.send(`Created ${allRows.length.toLocaleString()} candidates`);
//   } catch (err: any) {
//     //console.error("Mongo error:", err);

//     if (err.code === 11000) {
//       return res
//         .status(400)
//         .send(
//           "Duplicate records in IPPIS number, email or phone number. Please ensure this field is unique."
//         );
//     }

//     res.status(500).send(err.message || "An unexpected error occurred");
//   } finally {
//     // Delete the uploaded file
//     fs.unlinkSync(newPath);
//   }
// };

function normalizeString(value?: string): string {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ") // collapse multiple spaces
    .replace(/\u00A0/g, " ") // replace non-breaking space
    .trim();
}

// Build quick lookup for states and LGAs
const NORMALIZED_STATE_AND_LGAS: Record<string, Set<string>> = {};
for (const s of stateAndLgas) {
  NORMALIZED_STATE_AND_LGAS[normalizeString(s.state)] = new Set(
    s.lgas.map(normalizeString)
  );
}

// 🔹 Helper to clean and normalize Excel date values
function cleanExcelDate(value: any): string {
  if (!value) return "";

  // If it's already a JS Date → format to DD/MM/YYYY
  if (value instanceof Date) {
    return dayjs(value).format("DD/MM/YYYY");
  }

  // If it's a number (Excel serial) → convert
  if (!isNaN(value)) {
    return dayjs("1899-12-30").add(value, "day").format("DD/MM/YYYY");
  }

  // If it's a string → sanitize
  return value
    .toString()
    .trim()
    .replace(/\u200B/g, "") // remove zero-width spaces
    .replace(/\s+/g, "") // remove stray spaces
    .replace(/[-.]/g, "/"); // unify delimiters
}
export const uploadFile = async (req: AuthenticatedAdmin, res: Response) => {
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

    // Move the uploaded file
    fs.renameSync(req.file.path, newPath);

    // Parse Excel
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

    // Normalize static arrays
    const NORMALIZED_CADRES = CADRES.map(normalizeString);
    const NORMALIZED_MDAS = MDAS.map(normalizeString);

    // Track duplicates within this upload
    const seenIppis = new Set<string>();
    const seenEmails = new Set<string>();
    const seenPhoneNumbers = new Set<string>();

    // 🔎 Validate rows before insert
    for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
      const row = allRows[rowIndex];
      const rowNumber = rowIndex + 2; // Excel row (header is row 1)

      const ippisNumber = normalizeString(row.ippisNumber);
      const email = normalizeString(row.email);
      const phone = row.phoneNumber?.toString().replace(/\D/g, ""); // keep digits only
      const cadre = normalizeString(row.cadre);
      const mda = normalizeString(row.currentMDA);

      const stateOfOrigin = normalizeString(row.stateOfOrigin);
      const lga = normalizeString(row.lga);
      const poolOffice = normalizeString(row.poolOffice);

      const stateOfCurrentPosting = normalizeString(row.stateOfCurrentPosting);
      // 🔹 Validate cadre
      if (cadre && !NORMALIZED_CADRES.includes(cadre)) {
        console.log(`Invalid cadre '${row.cadre}' at row ${rowNumber}`);
        return res.status(400).json({
          message: `Invalid cadre '${row.cadre}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate MDA
      if (mda && !NORMALIZED_MDAS.includes(mda)) {
        console.log(`Invalid MDA '${row.currentMDA}' at row ${rowNumber}`);
        return res.status(400).json({
          message: `Invalid MDA '${row.currentMDA}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate State
      if (stateOfOrigin && !NORMALIZED_STATE_AND_LGAS[stateOfOrigin]) {
        console.log(`Invalid state '${row.stateOfOrigin}' at row ${rowNumber}`);
        return res.status(400).json({
          message: `Invalid state '${row.stateOfOrigin}' at row ${rowNumber}`,
        });
      }

      if (
        stateOfCurrentPosting &&
        !NORMALIZED_STATE_AND_LGAS[stateOfCurrentPosting]
      ) {
        console.log(
          `Invalid state of current posting '${row.stateOfCurrentPosting}' at row ${rowNumber}`
        );
        return res.status(400).json({
          message: `Invalid state of current posting '${row.stateOfCurrentPosting}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate LGA against State
      if (lga && stateOfOrigin) {
        const validLgas = NORMALIZED_STATE_AND_LGAS[stateOfOrigin];
        if (!validLgas?.has(lga)) {
          console.log(
            `Invalid LGA '${row.lga}' for state '${row.stateOfOrigin}' at row ${rowNumber}`
          );
          return res.status(400).json({
            message: `Invalid LGA '${row.lga}' for state '${row.stateOfOrigin}' at row ${rowNumber}`,
          });
        }
      }

      // 🔹 Validate IPPIS uniqueness
      if (ippisNumber) {
        if (seenIppis.has(ippisNumber)) {
          console.log(
            `Duplicate IPPIS Number '${row.ippisNumber}' at row ${rowNumber}`
          );
          return res.status(400).json({
            message: `Duplicate IPPIS Number '${row.ippisNumber}' at row ${rowNumber}`,
          });
        }
        seenIppis.add(ippisNumber);
      } else {
        console.log(
          `Invalid IPPIS Number '${row.ippisNumber}' at row ${rowNumber}`
        );
        return res.status(400).json({
          message: `Invalid IPPIS Number '${row.ippisNumber}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate email uniqueness
      if (email) {
        if (seenEmails.has(email)) {
          console.log(`Duplicate email '${row.email}' at row ${rowNumber}`);
          return res.status(400).json({
            message: `Duplicate email '${row.email}' at row ${rowNumber}`,
          });
        }
        seenEmails.add(email);
      } else {
        console.log(`Invalid email '${row.email}' at row ${rowNumber}`);
        return res.status(400).json({
          message: `Invalid email '${row.email}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate phone uniqueness
      if (phone) {
        if (seenPhoneNumbers.has(phone)) {
          console.log(
            `Duplicate phone number '${row.phoneNumber}' at row ${rowNumber}`
          );
          return res.status(400).json({
            message: `Duplicate phone number '${row.phoneNumber}' at row ${rowNumber}`,
          });
        }
        seenPhoneNumbers.add(phone);
      } else {
        console.log(
          `Invalid phone number '${row.phoneNumber}' at row ${rowNumber}`
        );
        return res.status(400).json({
          message: `Invalid phone number '${row.phoneNumber}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate phone number (must exist & be 11–15 digits)
      if (!phone || phone.length !== 11) {
        console.log(
          `Invalid phone number '${row.phoneNumber}' at row ${rowNumber}. Must be at least 11 digits.`
        );
        return res.status(400).json({
          message: `Invalid phone number '${row.phoneNumber}' at row ${rowNumber}. Must be at least 11 digits.`,
        });
      }

      // 🔹 Validate date fields
      const dateFields = [
        { key: "dateOfBirth", label: "Date of Birth" },
        { key: "dateOfFirstAppointment", label: "Date of First Appointment" },
        { key: "dateOfConfirmation", label: "Date of Confirmation" },
        { key: "dateOfLastPromotion", label: "Date of Last Promotion" },
      ];

      for (const field of dateFields) {
        if (row[field.key]) {
          let parsed;

          // Handle different input types from excelToJson
          if (typeof row[field.key] === "string") {
            // Parse string dates with strict format
            parsed = dayjs(row[field.key], ["D/M/YYYY", "DD/MM/YYYY"], true);
          } else if (row[field.key] instanceof Date) {
            // Convert Date object to UTC and normalize to start of day
            parsed = dayjs.utc(row[field.key]).startOf("day");
          } else {
            // Handle Excel serial numbers or other formats
            parsed = dayjs.utc(row[field.key]).startOf("day");
          }

          if (!parsed.isValid()) {
            console.log(
              `Invalid ${field.label} '${row[field.key]}' at row ${rowNumber}`
            );
            return res.status(400).json({
              message: `Invalid ${field.label} '${
                row[field.key]
              }' at row ${rowNumber}. Must be in DD/MM/YYYY format or a valid date.`,
            });
          }

          // Store the normalized date as a JavaScript Date object in UTC
          row[field.key] = parsed.toDate();
        }
      }
    }

    // If validation passed, insert in batches
    for (let i = 0; i < allRows.length; i += 500) {
      const batch = allRows.slice(i, i + 500);

      // const plainPassword = generateRandomPassword(8);

      // 🔹 Generate plain + hashed passwords for each candidate in parallel
      const preparedBatch = await Promise.all(
        batch.map(async (c: any) => {
          const plainPassword = generateRandomPassword(8);
          const hashedPassword = await bcrypt.hash(plainPassword, 8); // use cost 8 for speed

          return {
            ...c,
            ippisNumber: normalizeString(c.ippisNumber),
            email: normalizeString(c.email),
            cadre: normalizeString(c.cadre),
            currentMDA: normalizeString(c.currentMDA),
            phoneNumber: c.phoneNumber?.toString().replace(/\D/g, ""),
            password: hashedPassword,
            passwords: [plainPassword],
            uploadedDocuments: documentsToUpload,
            remark: calculateRemark(c),
          };
        })
      );

      //await Candidate.insertMany(preparedBatch);
      // ✅ atomic insert: fail the whole batch if any error occurs
      await Candidate.insertMany(preparedBatch, { ordered: false });
    }

    await AdminLogModel.create({
      account: req.admin?._id,
      action: `Created ${allRows.length.toLocaleString()} candidates`,
    });
    res.send(`Created ${allRows.length.toLocaleString()} candidates`);
  } catch (err: any) {
    if (err.code === 11000 || err.writeErrors) {
      const duplicates = parseDuplicateError(err);

      return res.status(400).json({
        message: "Some records could not be inserted due to duplicates",
        duplicates,
      });
    }

    res.status(500).send(err.message || "An unexpected error occurred");
  } finally {
    if (newPath && fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
    }
  }
};

export const deleteCandidates = async (req: Request, res: Response) => {
  await Candidate.deleteMany();
  res.send("All candidates deleted");
};

export const createOfficerAccount = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
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
    await AdminLogModel.create({
      account: req.admin?._id,
      action: `Created ${req.body.firstName} ${req.body.lastName} as admin staff`,
    });
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

  const formattedData = data.map((c, i) => {
    return { ...c.toObject(), id: i + 1 };
  });

  res.send(formattedData);
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
    status: data.status,
    dateRecommended: data.dateRecommended,
    enableButton: uploadedDocuments.filter((c) => c.fileUrl).length === 0,
  });
};

export const mdaOverview = async (req: Request, res: Response) => {
  const result = await Candidate.aggregate([
    {
      $group: {
        _id: "$currentMDA",
        totalCandidates: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 }, // sort alphabetically by currentMDA directly in Mongo
    },
  ]);

  const rows = result.map((r, i) => ({
    id: i + 1,
    name: r._id,
    value: r.totalCandidates,
  }));

  res.send(rows);
};

export const uploadAnalysis = async (req: Request, res: Response) => {
  try {
    const result = await Candidate.aggregate([
      {
        $project: {
          uploadsCount: {
            $size: {
              $filter: {
                input: "$uploadedDocuments",
                as: "doc",
                cond: { $ifNull: ["$$doc.fileUrl", false] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$uploadsCount",
          totalCandidates: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Format response
    const analysis = result.map((r) => ({
      uploads: r._id,
      candidates: r.totalCandidates,
    }));

    res.send(analysis);
  } catch (error) {
    res.status(500).send([]);
  }
};

export const documentsAnalysis = async (req: Request, res: Response) => {
  const counts = await Candidate.aggregate([
    { $unwind: "$uploadedDocuments" }, // flatten uploadedDocuments
    {
      $match: {
        "uploadedDocuments.fileUrl": { $nin: [null, ""] }, // ensure fileUrl exists
      },
    },
    {
      $group: {
        _id: "$uploadedDocuments.fileType",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        document: "$_id",
        count: 1,
      },
    },
  ]);

  // ensure all documents in your list appear, even if count = 0
  const result = documents.map((doc) => {
    const found = counts.find((c) => c.document === doc);
    return {
      document: doc,
      count: found ? found.count : 0,
    };
  });

  // return result;

  const candidates = await Candidate.countDocuments();
  const totalDocumentsUploaded = result.reduce((acc, c) => acc + c.count, 0);
  // console.log({
  //   totalDocumentsUploaded,
  //   result,
  //   expectedDocuments: candidates * documents.length,
  // });
  res.send({
    totalDocumentsUploaded: totalDocumentsUploaded.toLocaleString(),
    result,
    expectedDocuments: (candidates * documents.length).toLocaleString(),
  });
};
export const searchCandidate = async (req: Request, res: Response) => {
  const candidates = await Candidate.find({
    $or: [
      { fullName: { $regex: req.query.q, $options: "i" } },
      { email: { $regex: req.query.q, $options: "i" } },
      { phoneNumber: { $regex: req.query.q, $options: "i" } },
      { ippisNumber: { $regex: req.query.q, $options: "i" } },
      { status: { $regex: req.query.q, $options: "i" } },
    ],
  })
    .populate("recommendedBy approvedBy")
    .lean()
    .limit(50);

  const mapCandidates = candidates.map((c: any, i) => {
    return {
      ...c,
      id: i + 1,
      password: c.passwords[0],
      uploadedDocuments: c.uploadedDocuments.filter((c: any) => c.fileUrl)
        .length,
      recommendedBy: c.recommendedBy
        ? `${c.recommendedBy.firstName} ${c.recommendedBy.lastName}`
        : "-",
      approvedBy: c.approvedBy
        ? `${c.approvedBy.firstName} ${c.approvedBy.lastName}`
        : "-",
      dateRecommended: c.dateRecommended
        ? new Date(c.dateRecommended).toLocaleString()
        : "-",
      dateApproved: c.dateApproved
        ? new Date(c.dateApproved).toLocaleString()
        : "-",
    };
  });
  res.send(mapCandidates);
};

export const reverseApproval = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    const candidate = await Candidate.findById(req.query._id);
    if (!candidate) {
      return res.status(404).send("Candidate not found");
    }

    await Candidate.findByIdAndUpdate(req.query._id, {
      status: "pending",
      $unset: {
        recommendedBy: null,
        dateRecommended: null,
        approvedBy: null,
        dateApproved: null,
      },
    });
    await AdminLogModel.create({
      account: req.admin?._id,
      action: `Reversed approval for ${candidate.fullName}`,
    });
    res.send("Approval reversed");
  } catch (error: any) {
    res.status(500).send(new Error(error).message);
  }
};

//notify participant by email and sms

const notificationQueue = new ConcurrentJobQueue({
  concurrency: 20, // run 20 at once
  maxQueueSize: 10000, // cap queue if needed
  retries: 3, // retry failed jobs 3 times
  retryDelay: 2000, // wait 2s between retries
  shutdownTimeout: 60000, //
});
export const notifyByEmailAndSms = async (req: Request, res: Response) => {
  try {
    const candidates = await Candidate.find().select({ uploadedDocuments: 0 });

    res.send("Sending notifications");
    const smsMessage = (
      name: string,
      password: string,
      link: string,
      email: string
    ): string =>
      `Dear ${name.toUpperCase()}, your Federal Civil Service Commission candidate verification portal account has been created. Your email is ${email} and your password is ${password}.  Please click the link below to access your account. ${link}`;

    candidates.forEach((c) => {
      notificationQueue.enqueue(async () => {
        try {
          // --- EMAIL ---
          if (!c.emailSent) {
            const mailSent = await sendMailFunc(
              c.email,
              "ACCOUNT CREATED",
              emailTemplate(
                c.fullName,
                c.passwords[0],
                "https://promotion.fedcivilservice.gov.ng"
              )
            );

            if (mailSent) {
              await Candidate.findByIdAndUpdate(c._id, {
                $set: {
                  timeEmailwasSent: new Date(),
                  emailSent: true,
                },
              });
              console.log(`✅ Email sent to ${c.fullName}`);
            } else {
              console.log(`❌ Failed to send email to ${c.fullName}`);
            }
          } else {
            console.log(`ℹ️ Already emailed ${c.fullName}`);
          }

          // --- SMS ---
          if (!c.smsSent) {
            const phoneNumber = `234${c.phoneNumber.slice(1)}`;

            const status = await SendSms(
              smsMessage(
                c.fullName,
                c.passwords[0],
                "https://promotion.fedcivilservice.gov.ng",
                c.email
              ),
              phoneNumber
            );

            if (status === "delivered") {
              await Candidate.findByIdAndUpdate(c._id, {
                $set: {
                  timeSmswasSent: new Date(),
                  smsSent: true,
                },
              });
              console.log(`✅ SMS sent to ${c.fullName}`);
            } else {
              console.log(`❌ Failed to send SMS to ${c.fullName}`);
            }
          } else {
            console.log(`ℹ️ Already SMSed ${c.fullName}`);
          }

          console.log(`📨 Contacted ${c.fullName}`);
        } catch (err) {
          console.error(
            `🔥 Error processing notifications for ${c.fullName}:`,
            err
          );
        }
      });
    });
  } catch (error: any) {
    console.log(new Error(error));
  }
};

export const viewCorrections = async (req: Request, res: Response) => {
  try {
    interface Candidate {
      _id: Types.ObjectId;
      fullName: string;
      currentMDA: string;
      // add other fields you care about
    }

    interface CorrectionLean {
      _id: Types.ObjectId;
      candidate: Candidate; // after populate, it's no longer just ObjectId
      correctionName: string;
      correctionField: string;
      reason: string;
      status: string;
      data: any;
      dateApplied: Date;
      dateCorrected?: Date;
      correctedBy?: Types.ObjectId;
    }

    const corrections = await CorrectionModel.find()
      .lean<CorrectionLean[]>()
      .populate("candidate");

    const data = corrections
      .filter((c) => c.candidate !== null) // remove orphans
      .map((c, i) => ({
        ...c,
        name: c.candidate!.fullName,
        mda: c.candidate!.currentMDA,
        id: i + 1,
      }));

    console.log(data);
    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error occurred");
  }
};

export const viewCorrection = async (req: Request, res: Response) => {
  try {
    const correction = await CorrectionModel.findById(req.query.id as string);

    if (!correction) {
      return res.status(404).send("Correction not found");
    }

    const candidate = await Candidate.findById(correction.candidate as any)
      .select({ [correction.correctionField]: 1 })
      .lean();

    if (!candidate) {
      return res.status(404).send("Candidate not found");
    }

    res.send({
      _id: correction._id,
      reason: correction.reason,
      status: correction.status,
      newData: correction.data,
      oldData:
        candidate[correction.correctionField as keyof typeof candidate] ?? "-",
    });
  } catch (error) {
    console.error("viewCorrection error:", error);
    res.status(500).send("Error occurred");
  }
};

export const approveCorrection = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    const correction = await CorrectionModel.findById(req.query.id as string);
    if (!correction) {
      return res.status(404).send("Correction not found");
    }

    await Candidate.updateOne(
      { _id: correction.candidate },
      {
        $set: {
          [correction.correctionField]: correction.data,
        },
      }
    );

    await CorrectionModel.findByIdAndUpdate(req.query.id as string, {
      status: "approved",
      dateCorrected: new Date(),
      correctedBy: req.admin?._id,
    });
    res.send("Correction approved");
  } catch (error) {
    console.error("approveCorrection error:", error);
    res.status(500).send("Error occurred");
  }
};

const adminPasswordResetQueue = new ConcurrentJobQueue({
  concurrency: 20, // run 20 at once
  maxQueueSize: 10000, // cap queue if needed
  retries: 3, // retry failed jobs 3 times
  retryDelay: 2000, // wait 2s between retries
  shutdownTimeout: 60000, //
});
export const resetAdminPassword = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    const account = await AdminModel.findOne({ email: req.body.email });

    res.send("Password reset link has been sent to your email");
    if (account) {
      // Generate token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      account.resetPasswordToken = hashedToken;
      account.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      await account.save();

      const resetLink = (resetToken: string) =>
        process.env.NODE_ENV
          ? "https://promotion.fedcivilservice.gov.ng/admin/resetpassword/" +
            resetToken
          : "http://localhost:3000/admin/resetpassword/" + resetToken;
      adminPasswordResetQueue.enqueue(async () => {
        const link = resetLink(resetToken);

        const phoneNumber = `234${account.phoneNumber.slice(
          1,
          account.phoneNumber.length
        )}`;

        const message = `Dear ${account.firstName.toUpperCase()}, your password has been reset. Please click the link below to reset your password. ${link}`;
        await sendMailFunc(
          account.email,
          "PASSWORD RESET",
          resetPasswordTemplate(account.firstName, link)
        );

        await AdminLogModel.create({
          account: req.admin?._id,
          action: `${account.firstName.toUpperCase()} applied to reset password`,
        });

        await SendSms(message, phoneNumber);
      });
    } else {
      console.log("Account not found");
    }
  } catch (error) {
    console.error("resetPassword error:", error);
    res.status(500).send("Error occurred");
  }
};

export const createNewPassword = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    //const { token } = req.params;
    const { password, token } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await AdminModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json("Invalid or expired token");
    }

    // Hash & save new password
    admin.password = await bcrypt.hash(password, 12);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.yetToChangePassword = false; // 🔥 optional: mark as changed
    await admin.save();

    res.send("Password reset successful");

    await AdminLogModel.create({
      account: req.admin?._id,
      action: `${admin.firstName.toUpperCase()} reset password successfully`,
    });
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const viewIndividualStaff = async (req: Request, res: Response) => {
  try {
    const staff = await AdminModel.findById(req.query.id);

    if (!staff) {
      return res.status(404).send("Staff not found");
    }
    res.send(staff);
  } catch (error) {
    res.status(500).send("Error occurred");
  }
};

export const deleteDeskOfficer = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  try {
    const adminId = req.query.id;

    // Check if admin is tied to any candidate
    const hasReferences = await Candidate.exists({
      $or: [
        { recommendedBy: adminId },
        { approvedBy: adminId },
        { rejectedBy: adminId },
      ],
    });

    if (hasReferences) {
      return res
        .status(400)
        .send(
          "Account cannot be deleted because they are linked to candidate records"
        );
    }

    const account = await AdminModel.findByIdAndDelete(adminId);
    res.send("Staff deleted successfully");

    await AdminLogModel.create({
      account: req.admin?._id,
      action: `${req.admin?.firstName.toUpperCase()} deleted ${
        account?.firstName
      } successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error occurred");
  }
};

export const updateDeskOfficer = async (
  req: AuthenticatedAdmin,
  res: Response
) => {
  const officer = await AdminModel.findById(req.body._id);
  if (!officer) {
    return res.status(400).send("Officer not found");
  }

  //check if the phone number being updated to belongs to another
  const phoneNumberExists = await AdminModel.findOne({
    _id: { $ne: req.body._id },
    phoneNumber: req.body.phoneNumber,
  });

  if (phoneNumberExists) {
    return res.status(400).send("Phone number already exists");
  }

  //check if the email being updated to belongs to another
  const emailExists = await AdminModel.findOne({
    _id: { $ne: req.body._id },
    email: req.body.email,
  });

  if (emailExists) {
    return res.status(400).send("Email already exists");
  }

  const account = await AdminModel.findOneAndUpdate(
    { _id: req.body._id },
    {
      $set: {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        role: req.body.role,
        mda: req.body.mda,
      },
    }
  );

  await AdminLogModel.create({
    account: req.admin?._id,
    action: `${req.admin?.firstName.toUpperCase()} updated ${
      account?.firstName
    } successfully`,
  });
  res.send("Desk Officer updated successfully");
};

export const notificationAnalysis = async (req: Request, res: Response) => {
  const [emails, sms] = await Promise.all([
    Candidate.countDocuments({ emailSent: true }),
    Candidate.countDocuments({ smsSent: true }),
  ]);

  res.send({
    emails,
    sms,
  });
};
