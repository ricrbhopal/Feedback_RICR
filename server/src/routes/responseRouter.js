import express from "express";
import { submitResponse } from "../controller/responseController.js";
import { getFormResponses } from "../controller/responseController.js";
import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Student submits a form
router.post("/:formId", submitResponse);
router.get("/:id/responses", Protect, getFormResponses);

export default router;
