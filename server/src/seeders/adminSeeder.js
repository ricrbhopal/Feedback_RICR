import mongoose, { mongo } from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "../models/AdminModel.js";
import dotenv from "dotenv";
import connectDB from "../config/db.js";

dotenv.config();

const data = {
    fullName: "Aadi Jotwani",
    email: "aadijotwani@gmail.com",
    password: "Admin@12345",
    role: "admin"
};

const seedAdmin = async () => {
    await connectDB();
    const existingAdmin = await Admin.findOne({ email: data.email });
    if (existingAdmin) {
        await existingAdmin.remove();
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
