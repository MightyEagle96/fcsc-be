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
import { documentsToUpload } from "../utils/documents";
import calculateRemark from "../utils/calculateRemark";
import { sendMailFunc } from "../utils/nodemailer";
import { emailTemplate } from "./emailTemplate";
import { SendSms } from "../utils/smsHandler";
import { CorrectionModel } from "../models/correctionData";
import { Types } from "mongoose";
import { CADRES, MDAS } from "../utils/excelData";
import { resetPasswordTemplate } from "./resetPasswordTemplate";
import crypto from "crypto";

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
  const [candidates, pending, recommended, approved, rejected] =
    await Promise.all([
      Candidate.countDocuments(),
      Candidate.countDocuments({ status: "pending" }),
      Candidate.countDocuments({ status: "recommended" }),
      Candidate.countDocuments({ status: "approved" }),
      Candidate.countDocuments({ status: "rejected" }),
    ]);

  res.send({
    candidates: candidates.toLocaleString(),
    pending: pending.toLocaleString(),
    recommended: recommended.toLocaleString(),
    approved: approved.toLocaleString(),
    rejected: rejected.toLocaleString(),
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

    // 🔎 Validate rows before insert
    for (let rowIndex = 0; rowIndex < allRows.length; rowIndex++) {
      const row = allRows[rowIndex];
      const rowNumber = rowIndex + 2; // Excel row (header is row 1)

      const ippisNumber = normalizeString(row.ippisNumber);
      const email = normalizeString(row.email);
      const phone = row.phoneNumber?.toString().replace(/\D/g, ""); // keep digits only
      const cadre = normalizeString(row.cadre);
      const mda = normalizeString(row.currentMDA);

      // 🔹 Validate cadre
      if (cadre && !NORMALIZED_CADRES.includes(cadre)) {
        return res.status(400).json({
          message: `Invalid cadre '${row.cadre}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate MDA
      if (mda && !NORMALIZED_MDAS.includes(mda)) {
        return res.status(400).json({
          message: `Invalid MDA '${row.currentMDA}' at row ${rowNumber}`,
        });
      }

      // 🔹 Validate IPPIS uniqueness
      if (ippisNumber) {
        if (seenIppis.has(ippisNumber)) {
          return res.status(400).json({
            message: `Duplicate IPPIS Number '${row.ippisNumber}' at row ${rowNumber}`,
          });
        }
        seenIppis.add(ippisNumber);
      }

      // 🔹 Validate email uniqueness
      if (email) {
        if (seenEmails.has(email)) {
          return res.status(400).json({
            message: `Duplicate email '${row.email}' at row ${rowNumber}`,
          });
        }
        seenEmails.add(email);
      }

      // 🔹 Validate phone number (must exist & be 11–15 digits)
      if (!phone || phone.length !== 11) {
        return res.status(400).json({
          message: `Invalid phone number '${row.phoneNumber}' at row ${rowNumber}. Must be at least 11 digits.`,
        });
      }
    }

    // If validation passed, insert in batches
    for (let i = 0; i < allRows.length; i += 500) {
      const batch = allRows.slice(i, i + 500);

      const plainPassword = generateRandomPassword(8);
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

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

      await Candidate.insertMany(preparedBatch);
    }

    res.send(`Created ${allRows.length.toLocaleString()} candidates`);
  } catch (err: any) {
    if (err.code === 11000) {
      return res
        .status(400)
        .send(
          "Duplicate records in IPPIS number, email, or phone number found in the database. Please ensure these fields are unique."
        );
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

export const reverseApproval = async (req: Request, res: Response) => {
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

  res.send("Approval reversed");
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
  const candidates = await Candidate.find();

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
      await sendMailFunc(
        c.email,
        "ACCOUNT CREATED",
        emailTemplate(
          c.fullName,
          c.passwords[0],
          "https://promotion.fedcivilservice.gov.ng"
        )
      );

      const phoneNumber = `234${c.phoneNumber.slice(1, c.phoneNumber.length)}`;

      await SendSms(
        smsMessage(
          c.fullName,
          c.passwords[0],
          "https://promotion.fedcivilservice.gov.ng",
          c.email
        ),
        phoneNumber
      );
    });

    console.log(`Contacted ${c.fullName}`);
  });
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
export const resetAdminPassword = async (req: Request, res: Response) => {
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

export const createNewPassword = async (req: Request, res: Response) => {
  try {
    //const { token } = req.params;
    const { password, token } = req.body;

    console.log(token, password);

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
