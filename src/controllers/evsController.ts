import { Request, RequestHandler, Response } from "express";
import { ConcurrentJobQueue } from "../utils/DataQueue";
import EvsAccountModel, {
  AuthenticatedCentre,
  IEvsAccount,
} from "../models/evsAccountModel";
import generateRandomPassword from "../utils/generateRandomPassword";
import { Candidate } from "../models/candidateModel";
import { generateRefreshToken, generateToken, tokens } from "./jwtController";
import AccreditationModel from "../models/accreditationModel";
import jwt, { JwtPayload } from "jsonwebtoken";

const accountQueue = new ConcurrentJobQueue({
  concurrency: 5,
  maxQueueSize: 100,
  retries: 3,
  retryDelay: 5000,
  shutdownTimeout: 20000,
});
export const createEVSAccount = async (req: Request, res: Response) => {
  try {
    const { body } = req;
    accountQueue.enqueue(async () => {
      const existingAccount = await EvsAccountModel.findOne({
        centreId: body.centreId,
      });

      if (existingAccount) {
        return res.status(400).send("EVS account already exists");
      }

      const password = generateRandomPassword(6);
      const newAccount = new EvsAccountModel({
        ...body,
        password,
      });
      await newAccount.save();

      res.send("EVS account created");
    });
  } catch (error) {
    res.status(500).send("Error occurred");
  }
};

export const viewEvsAccounts = async (req: Request, res: Response) => {
  const accounts = await EvsAccountModel.find().sort({ centreId: 1 }).lean();

  const mappedAccounts = accounts.map((account, i) => {
    return {
      ...account,
      id: i + 1,
    };
  });
  res.send(mappedAccounts);
};
export const loginAccount = async (req: Request, res: Response) => {
  console.log(req.headers);
  const { body } = req;

  const account = await EvsAccountModel.findOne({
    centreId: body.centreId,
    password: body.password,
  }).lean();
  if (!account) {
    return res.status(400).send("Invalid credentials");
  }

  const accessToken = generateToken(account);

  const refreshToken = generateRefreshToken(account);

  res
    .cookie(tokens.auth_token, accessToken, {
      httpOnly: true,
      secure: true,
      //sameSite: "lax",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60, // 1h
    })
    .cookie(tokens.refresh_token, refreshToken, {
      httpOnly: true,
      secure: true,
      //sameSite: "lax",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
    })
    .send("Login successful");
  // res.send(account);
};
export const searchExamCard = async (req: Request, res: Response) => {
  const candidate = await Candidate.findOne({
    ippisNumber: req.body.ippisNumber,
  });

  if (!candidate) {
    return res.status(404).send("Candidate not found");
  }

  if (!candidate.fileUrl) {
    return res.status(404).send("This candidate does not have an exam card");
  }

  res.send(candidate.fileUrl);
};

export const myCentre: RequestHandler = async (req, res) => {
  const centre = (req as AuthenticatedCentre).centre;
  res.send(centre);
};

export const viewCandidate = async (req: Request, res: Response) => {
  try {
    const candidate = await Candidate.findById(req.query.id).lean();

    if (!candidate) {
      return res.status(404).send("Candidate not found");
    }

    res.send({
      _id: candidate._id,
      passport:
        candidate.uploadedDocuments?.find(
          (c) => c.fileType === "Passport Photograph"
        )?.fileUrl || "",
      ippisNumber: candidate.ippisNumber,
      name: candidate.fullName,
      centreName: candidate.examCentreAddress,
    });
  } catch (error) {
    res.status(400).send("Candidate not found");
  }
};

const accreditationQueue = new ConcurrentJobQueue({
  concurrency: 5,
  maxQueueSize: 100,
  retries: 3,
  retryDelay: 5000,
  shutdownTimeout: 20000,
});
export const accreditCandidate: RequestHandler = async (req, res) => {
  try {
    accreditationQueue.enqueue(async () => {
      try {
        const centre = (req as AuthenticatedCentre).centre;
        const existing = await AccreditationModel.findOne({
          candidate: req.query.id,
        });

        if (existing) {
          return res.status(400).send("Candidate already accredited");
        }
        if (!existing) {
          await AccreditationModel.create({
            candidate: req.query.id,
            accreditedBy: centre._id,
          });
        }

        res.send("Candidate accredited");
      } catch (error) {
        res.sendStatus(500);
      }
    });
  } catch (error) {
    res.sendStatus(500);
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies[tokens.refresh_token];

  if (!refreshToken) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN as string
    ) as JwtPayload & IEvsAccount;

    if (!decoded?.centreId) return res.sendStatus(401);

    const evsAccount = await EvsAccountModel.findOne({
      centreId: decoded.centreId,
    }).lean();

    if (!evsAccount) return res.sendStatus(401);

    const newAccessToken = generateToken(evsAccount);
    const newRefreshToken = generateRefreshToken(evsAccount);
    res
      .cookie(tokens.auth_token, newAccessToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60, // 1h
      })
      .cookie(tokens.refresh_token, newRefreshToken, {
        httpOnly: false,
        secure: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
      })
      .send("Token refreshed");
  } catch (error) {
    console.log(error);
    res.sendStatus(401);
  }
};

export const accreditationDashboard: RequestHandler = async (req, res) => {
  try {
    const centre = (req as AuthenticatedCentre).centre;
    const total = await AccreditationModel.countDocuments();
    const expected = await Candidate.countDocuments({
      examCentreAddress: centre.centreName,
    });

    const accredited = await AccreditationModel.countDocuments({
      accreditedBy: centre._id,
    });
    const page = (req.query.page || 1) as number;
    const limit = (req.query.limit || 50) as number;
    const centreList = await AccreditationModel.find({
      accreditedBy: centre._id,
    })
      .populate("candidate", { ippisNumber: 1 })
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const totalAccreditedByCentre = await AccreditationModel.countDocuments({
      accreditedBy: centre._id,
    });

    const mappedList = centreList.map((c, i) => {
      return {
        ...c,
        id: (page - 1) * limit + i + 1,
      };
    });

    res.send({
      total,
      accredited,
      expected,

      centreList: mappedList,
      page,
      limit,
      totalAccreditedByCentre,
    });
  } catch (error) {
    res.sendStatus(500);
  }
};

export const logoutAccount = async (req: Request, res: Response) => {
  const cookieOptions = {
    httpOnly: false,
    secure: true,
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
      | "none"
      | "lax"
      | "strict",
    path: "/",
  };

  res
    .clearCookie(tokens.auth_token, cookieOptions)
    .clearCookie(tokens.refresh_token, cookieOptions)
    .send("Logged Out");
};
