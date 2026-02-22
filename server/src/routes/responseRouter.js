import express from "express";
import { submitResponse, getFormResponses, getReFeedbackData, submitReFeedback } from "../controller/responseController.js";
import { ProtectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Re-feedback routes (must be before parameterized routes)
router.get("/re-feedback/:responseId", getReFeedbackData);
router.post("/:formId/re-feedback/:responseId", submitReFeedback);

// Student submits a form
router.post("/:formId", submitResponse);
router.get("/:id/responses", ProtectUser, getFormResponses);

export default router;
