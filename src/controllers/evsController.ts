import { Request, Response } from "express";
import { ConcurrentJobQueue } from "../utils/DataQueue";
import EvsAccountModel from "../models/evsAccountModel";
import generateRandomPassword from "../utils/generateRandomPassword";

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
