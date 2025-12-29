import express from "express";
import {
  Login,
  Logout,
  createTeacher,
  getAllTeachers,
  toggleTeacherStatus,
  updateTeacher,
} from "../controller/authController.js";
import { Protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/login", Login);
router.get("/logout", Logout);
router.post("/teachers", Protect, isAdmin, createTeacher);
router.get("/teachers", Protect, isAdmin, getAllTeachers);
router.patch("/teachers/:id/toggle-status", Protect, isAdmin, toggleTeacherStatus);
router.put("/teachers/:id", Protect, isAdmin, updateTeacher);

export default router;
