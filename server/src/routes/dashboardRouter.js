import express from "express";
import { getDashboardStats } from "../controller/dashboardController.js";
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", Protect, getDashboardStats);

export default router;
