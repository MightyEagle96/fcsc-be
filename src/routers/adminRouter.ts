import { Router } from "express";

import { createAccount, loginAdmin } from "../controllers/adminController";

const adminRouter = Router();

adminRouter.post("/signup", createAccount).post("/login", loginAdmin);

export default adminRouter;
