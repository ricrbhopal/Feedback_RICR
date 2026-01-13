import Admin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import { genAuthToken } from "../utils/auth.js";


export const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const error = new Error("All fields are required");
      error.statusCode = 400;
      return next(error);
    }
    //console.log(email, password);

    const admin = await Admin.findOne({ email });
    if (!admin) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    // Check if user is active
    if (!admin.isActive) {
      const error = new Error("Your account has been deactivated. Please contact an administrator.");
      error.statusCode = 403;
      return next(error);
    }

    const isVerified = await bcrypt.compare(password, admin.password);
    if (!isVerified) {
      const error = new Error("Invalid Credentials");
      error.statusCode = 401;
      return next(error);
    }

    genAuthToken(admin._id, res);

    res.status(200).json({
      message: "User Login Successfull",
      data: {
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const Logout = (req, res, next) => {
  try {
    res.cookie("secret", "", {
      expires: new Date(Date.now()),
    });

    res.status(200).json({ message: "Logout Successfully" });
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Teacher already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await Admin.create({
      fullName,
      email,
      password: hashedPassword,
      role: "teacher"
    });

    res.status(201).json({
      message: "Teacher created successfully",
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTeachers = async (req, res, next) => {
  try {
    const teachers = await Admin.find({ role: "teacher" }).select('_id fullName email isActive');
    
    res.status(200).json({
      message: "Teachers fetched successfully",
      data: teachers
    });
  } catch (error) {
    next(error);
  }
};

export const toggleTeacherStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const teacher = await Admin.findById(id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    teacher.isActive = !teacher.isActive;
    await teacher.save();
    
    res.status(200).json({
      message: `Teacher ${teacher.isActive ? 'activated' : 'deactivated'} successfully`,
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, email, password } = req.body;
    
    const teacher = await Admin.findById(id);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== teacher.email) {
      const exists = await Admin.findOne({ email, _id: { $ne: id } });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      teacher.email = email;
    }
    
    if (fullName) teacher.fullName = fullName;
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      teacher.password = hashedPassword;
    }
    
    await teacher.save();
    
    res.status(200).json({
      message: "Teacher updated successfully",
      data: {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        isActive: teacher.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};