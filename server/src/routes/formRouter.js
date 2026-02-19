import express from "express";
import { createForm } from "../controller/formController.js";
import { getFormById } from "../controller/formController.js";
import { getAllForms } from "../controller/formController.js";
import { deleteForm } from "../controller/formController.js";
import { toggleFormStatus } from "../controller/formController.js";
import { updateForm } from "../controller/formController.js";
import { approveForm } from "../controller/formController.js";
import { rejectForm } from "../controller/formController.js";

import { Protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /forms
router.post("/", Protect, createForm);
router.get("/", Protect, getAllForms);
router.get("/:id", Protect, getFormById);
router.put("/:id", Protect, updateForm);
router.delete("/:id", Protect, deleteForm);
router.patch("/:id/toggle-status", Protect, toggleFormStatus);
router.patch("/:id/approve", Protect, approveForm);
router.patch("/:id/reject", Protect, rejectForm);

export default router;
