import express from "express";
import { submitResponse } from "../controller/responseController.js";
import { getFormResponses } from "../controller/responseController.js";
import { ProtectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Student submits a form
router.post("/:formId", submitResponse);
router.get("/:id/responses", ProtectUser, getFormResponses);

export default router;
