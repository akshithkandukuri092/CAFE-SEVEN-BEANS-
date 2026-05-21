/* server.js */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");

// ── Connect to MongoDB ──
connectDB();

const app = express();

// ─────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────

// Set secure HTTP headers
app.use(helmet());

// CORS — allow your frontend origin
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting — max 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
app.use("/api", limiter);

// Parse JSON bodies (limit 10kb to prevent abuse)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─────────────────────────────────────────
// REQUEST LOGGER (dev-friendly)
// ─────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────
const bookingRoutes = require("./routes/bookingRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

app.use("/api/bookings", bookingRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "☕ Seven Beans API is running",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error.",
  });
});

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

// ─────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  server.close(() => process.exit(1));
});