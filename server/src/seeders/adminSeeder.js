import mongoose, { mongo } from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "../models/adminModel.js";
import dotenv from "dotenv";
import connectDB from "../config/db.js";

dotenv.config();

const data = {
    fullName: "Pranay K Das",
    email: "pranay@ricr.in",
    password: "Pranay@123",
    role: "admin"
};

const seedAdmin = async () => {
    await connectDB();
    const existingAdmin = await Admin.findOne({ email: data.email });
    if (existingAdmin) {
        await existingAdmin.deleteOne();
        console.log("Existing admin removed.");
        return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const admin = new Admin({
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        role: data.role
    });

    await admin.save();
    console.log("Admin user created successfully.");
};

seedAdmin().then(() => {
    mongoose.connection.close();
});
