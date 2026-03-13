/**
 * N.E.T.R.A. API — server.js
 * Entry point: Express server + MongoDB connection
 */

"use strict";

const express   = require("express");
const mongoose  = require("mongoose");
const cors      = require("cors");
require("dotenv").config();

const potholeRoutes  = require("./routes/potholeRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Parse the comma-separated ALLOWED_ORIGINS env var into an array.
// Falls back to localhost:5173 (Vite default) if not set.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));        // JSON bodies
app.use(express.urlencoded({ extended: false })); // URL-encoded form data

// Serve static compiled outputs from the AI folder
const path = require("path");
app.use("/outputs", express.static(path.join(__dirname, "../NETRA-AI/output")));

// ─── Health-check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "N.E.T.R.A. API",
    version: "1.0.0",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/potholes", potholeRoutes);

// ─── 404 + Error handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌  MONGO_URI is not defined in .env — aborting.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅  MongoDB connected → ${MONGO_URI.replace(/\/\/.*@/, "//***@")}`);
    app.listen(PORT, () => {
      console.log(`🚀  N.E.T.R.A. API listening on http://localhost:${PORT}`);
      console.log(`   Health check → http://localhost:${PORT}/health`);
      console.log(`   Potholes API → http://localhost:${PORT}/api/potholes`);
    });
  })
  .catch((err) => {
    console.error("❌  MongoDB connection error:", err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received — closing server gracefully.");
  await mongoose.connection.close();
  process.exit(0);
});
