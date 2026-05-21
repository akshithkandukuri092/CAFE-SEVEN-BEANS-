import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

import bookingRoutes from "./routes/bookings.js";
import adminRoutes, { publicSettingsRouter } from "./routes/admin.js";
import authRoutes from "./routes/auth.js";

app.get("/", (req, res) => {
  res.json({ message: "SevenBeans API running ☕", status: "ok" });
});

// Public — no auth required
app.use("/api/settings",  publicSettingsRouter);
app.use("/api/bookings",  bookingRoutes);
app.use("/api/auth",      authRoutes);

// Admin — requires Firebase token + admin email
app.use("/api/admin",     adminRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));