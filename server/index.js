import dotenv from "dotenv";
dotenv.config();

import express from "express";
import morgan from "morgan";
import compression from "compression";
import AuthRouter from "./src/routes/authRouter.js";
import FormRouter from "./src/routes/formRouter.js"
import ResponseRouter from "./src/routes/responseRouter.js";
import dashboardRouter from "./src/routes/dashboardRouter.js";


import connectDB from "./src/config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://feedback.ricr.in"],

    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(compression());
app.use(morgan("dev"))

// Cache busting middleware
app.use((req, res, next) => {
  // No caching for HTML files and API
  if (req.url.endsWith('.html') || req.url.startsWith('/auth') || req.url.startsWith('/forms') || req.url.startsWith('/responses') || req.url.startsWith('/dashboard')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } 
  // Long cache for versioned assets (with hash)
  else if (req.url.match(/\.[a-f0-9]{8}\./i)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

app.use("/auth", AuthRouter);
app.use("/forms", FormRouter);
app.use("/responses", ResponseRouter);
app.use("/dashboard", dashboardRouter);


app.get("/", (req, res) => {
  res.json({ message: "Welcome to the server!" });
});

app.use((err, req, res, next) => {
  const message = err.message || "Internal Server Error";
  const StatusCode = err.statusCode || 500;

  res.status(StatusCode).json({ message });
});

const port = process.env.PORT || 5000;
//
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
  connectDB();
});
