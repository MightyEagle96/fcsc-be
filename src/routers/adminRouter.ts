import { Router } from "express";

import { createAccount } from "../controllers/adminController";

const adminRouter = Router();

adminRouter.post("/signup", createAccount);

export default adminRouter;
