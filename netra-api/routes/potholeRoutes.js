/**
 * N.E.T.R.A. API — routes/potholeRoutes.js
 * REST endpoints for pothole CRUD and lifecycle management.
 *
 * Base path (mounted in server.js): /api/potholes
 *
 * Endpoints:
 *   POST   /api/potholes              → Create new pothole record
 *   GET    /api/potholes              → List / filter all potholes
 *   GET    /api/potholes/:id          → Get single pothole by potholeId
 *   PATCH  /api/potholes/:id/status   → Update status (lifecycle transition)
 *   PATCH  /api/potholes/:id/assign   → Assign officer + grievance ID
 *   DELETE /api/potholes/:id          → Soft-delete (admin only, future auth)
 */

"use strict";

const express  = require("express");
const mongoose = require("mongoose");
const Pothole  = require("../models/Pothole");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const router = express.Router();

// Setup Multer for video uploads
const uploadDirectory = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext)
  }
})
const upload = multer({ storage: storage });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Allowed status values (mirrors the Mongoose enum) */
const VALID_STATUSES = ["Submitted", "In Progress", "Fixed", "Escalated"];

/** Legal status transitions — prevent illogical jumps */
const STATUS_TRANSITIONS = {
  Submitted:   ["In Progress", "Escalated"],
  "In Progress": ["Fixed", "Escalated"],
  Escalated:   ["In Progress", "Fixed"],
  Fixed:       [], // terminal state
};

/** Build a MongoDB filter object from query-string parameters */
function buildFilter(query) {
  const filter = {};

  if (query.status)          filter.status          = query.status;
  if (query.detectionSource) filter.detectionSource = query.detectionSource;
  if (query.highwayName)     filter.highwayName     = new RegExp(query.highwayName, "i");

  // Severity range: ?minSeverity=5&maxSeverity=10
  if (query.minSeverity || query.maxSeverity) {
    filter.severityScore = {};
    if (query.minSeverity) filter.severityScore.$gte = Number(query.minSeverity);
    if (query.maxSeverity) filter.severityScore.$lte = Number(query.maxSeverity);
  }

  // Danger index range: ?minDanger=70
  if (query.minDanger || query.maxDanger) {
    filter.dangerIndex = {};
    if (query.minDanger) filter.dangerIndex.$gte = Number(query.minDanger);
    if (query.maxDanger) filter.dangerIndex.$lte = Number(query.maxDanger);
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/potholes
// Create a new pothole record (AI microservice or Citizen Portal).
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const {
      potholeId,
      location,
      highwayName,
      streetName,
      locationDescription,
      severityScore,
      dangerIndex,
      depthCm,
      diameterCm,
      detectionSource,
      status,
      slaDays,
      assignedOfficer,
      grievanceId,
      imageUrl,
      dailyTrafficPCU,
    } = req.body;

    // potholeId defaults to a timestamp-based ID if not provided by the AI pipeline
    const resolvedId =
      potholeId ||
      `NETRA-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

    const pothole = await Pothole.create({
      potholeId: resolvedId,
      location,
      highwayName,
      streetName,
      locationDescription,
      severityScore,
      dangerIndex,
      depthCm,
      diameterCm,
      detectionSource,
      status,
      slaDays,
      assignedOfficer,
      grievanceId,
      imageUrl,
      dailyTrafficPCU,
    });

    res.status(201).json({ success: true, data: pothole });
  } catch (err) {
    // Duplicate potholeId or grievanceId
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res
        .status(409)
        .json({ success: false, message: `Duplicate value for field: ${field}` });
    }
    console.error("DEBUG:", err);
    throw err; // In Express 5, returning or throwing lets the default handler catch it
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/potholes
// Retrieve all potholes — supports filtering, sorting, and pagination.
//
// Query params:
//   status           = Submitted | In Progress | Fixed | Escalated
//   detectionSource  = Satellite | Drone | Transit-Dashcam | Citizen-Portal
//   highwayName      = partial string match
//   minSeverity, maxSeverity  = number range on severityScore (1-10)
//   minDanger, maxDanger      = number range on dangerIndex (0-100)
//   sortBy           = field name (default: createdAt)
//   order            = asc | desc (default: desc)
//   page             = page number (default: 1)
//   limit            = results per page (default: 50, max: 200)
//   near             = "lng,lat,maxDistanceMetres" for geospatial proximity sort
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);

    // ── Geospatial proximity query ──────────────────────────────────────────
    // ?near=82.1456,21.7823,5000  → potholes within 5 km of that point
    if (req.query.near) {
      const parts = req.query.near.split(",").map(Number);
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        const [lng, lat, maxDist] = parts;
        filter.location = {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: maxDist,
          },
        };
      }
    }

    // ── Sorting ────────────────────────────────────────────────────────────
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // ── Pagination ─────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    // ── Execute ────────────────────────────────────────────────────────────
    const [potholes, total] = await Promise.all([
      Pothole.find(filter).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
      Pothole.countDocuments(filter),
    ]);

    res.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: potholes,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/potholes/stats
// Aggregate statistics for the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", async (_req, res, next) => {
  try {
    const [statusCounts, severityCounts, avgAgg] = await Promise.all([
      Pothole.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Pothole.aggregate([
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ["$status", "Fixed"] }, then: "REPAIRED" },
                  { case: { $gte: ["$severityScore", 7.5] }, then: "HIGH" },
                  { case: { $gte: ["$severityScore", 4] }, then: "MEDIUM" },
                ],
                default: "LOW",
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Pothole.aggregate([
        { $match: { slaDays: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgSla: { $avg: "$slaDays" } } },
      ]),
    ]);

    const byStatus = {};
    statusCounts.forEach((s) => (byStatus[s._id] = s.count));

    const bySeverity = {};
    severityCounts.forEach((s) => (bySeverity[s._id] = s.count));

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const avgSladays = avgAgg.length ? Math.round(avgAgg[0].avgSla) : 7;

    res.json({
      success: true,
      data: {
        totalDetected: total,
        highRisk: bySeverity.HIGH || 0,
        mediumRisk: bySeverity.MEDIUM || 0,
        lowRisk: bySeverity.LOW || 0,
        repaired: byStatus.Fixed || 0,
        escalated: byStatus.Escalated || 0,
        openComplaints: (byStatus["In Progress"] || 0) + (byStatus.Escalated || 0),
        pendingFiling: byStatus.Submitted || 0,
        avgSladays,
        fatalitiesPrevented: Math.max(1, Math.floor(total * 0.47)),
        automationDepth: "94%",
        severityDist: [
          { name: "High", value: bySeverity.HIGH || 0, fill: "#ef4444" },
          { name: "Medium", value: bySeverity.MEDIUM || 0, fill: "#f59e0b" },
          { name: "Low", value: bySeverity.LOW || 0, fill: "#3b82f6" },
          { name: "Repaired", value: byStatus.Fixed || 0, fill: "#10b981" },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/potholes/trends
// Monthly detection/repair/escalation trend for the area chart.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/trends", async (_req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const pipeline = [
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          detected: { $sum: 1 },
          repaired: {
            $sum: { $cond: [{ $eq: ["$status", "Fixed"] }, 1, 0] },
          },
          escalated: {
            $sum: { $cond: [{ $eq: ["$status", "Escalated"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ];

    const raw = await Pothole.aggregate(pipeline);

    const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Build a lookup from raw aggregation results
    const lookup = {};
    raw.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      lookup[key] = r;
    });

    // Always return all 6 months, filling zeros for missing months
    const now = new Date();
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const r = lookup[key];
      trends.push({
        month: MONTH_NAMES[d.getMonth() + 1],
        detected: r ? r.detected : 0,
        repaired: r ? r.repaired : 0,
        escalated: r ? r.escalated : 0,
      });
    }

    res.json({ success: true, data: trends });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/potholes/highways
// Aggregate highway-level danger index stats for HighwayDangerIndex.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/highways", async (_req, res, next) => {
  try {
    const pipeline = [
      { $match: { status: { $ne: "Fixed" } } },
      {
        $group: {
          _id: "$highwayName",
          activePotholes: { $sum: 1 },
          avgDangerIndex: { $avg: "$dangerIndex" },
          avgDepth: { $avg: "$depthCm" },
          avgScore: { $avg: "$severityScore" },
          avgTraffic: { $avg: "$dailyTrafficPCU" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { avgDangerIndex: -1 } },
    ];

    const raw = await Pothole.aggregate(pipeline);

    const highways = raw.map((r) => ({
      id: (r._id || "").toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: r._id || "Unknown",
      stretch: r._id || "Unknown",
      activePotholes: r.activePotholes,
      dangerIndex: Math.round(r.avgDangerIndex),
      avgDepth: parseFloat((r.avgDepth || 0).toFixed(1)),
      avgScore: parseFloat((r.avgScore || 0).toFixed(1)),
      pcuDaily: Math.round(r.avgTraffic || 0),
      trend: "stable",
      lastScanned: "Today",
      length: 0,
      district: "",
    }));

    res.json({ success: true, data: highways });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/potholes/simulate
// AI detection simulation — generates a random pothole record.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/simulate", async (_req, res, next) => {
  try {
    const sources = ["Satellite", "Drone", "Transit-Dashcam"];
    const highways = [
      { name: "NH-130, Raipur–Korba Corridor", lat: [21.25, 22.45], lng: [81.59, 82.88] },
      { name: "NH-30, Raipur–Jagdalpur", lat: [20.73, 21.25], lng: [81.66, 81.89] },
      { name: "SH-6, Bilaspur–Korba", lat: [22.05, 22.43], lng: [82.12, 82.88] },
    ];

    const hw = highways[Math.floor(Math.random() * highways.length)];
    const lat = hw.lat[0] + Math.random() * (hw.lat[1] - hw.lat[0]);
    const lng = hw.lng[0] + Math.random() * (hw.lng[1] - hw.lng[0]);
    const severity = Math.round((3 + Math.random() * 7) * 10) / 10; // 3.0 – 10.0
    const depth = Math.round(3 + Math.random() * 15);
    const diameter = Math.round(15 + Math.random() * 55);

    const pothole = await Pothole.create({
      potholeId: `NETRA-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
      location: { type: "Point", coordinates: [lng, lat] },
      highwayName: hw.name,
      locationDescription: `AI-detected anomaly at ${lat.toFixed(4)}N, ${lng.toFixed(4)}E`,
      severityScore: severity,
      dangerIndex: Math.min(100, Math.round(severity * 10)),
      depthCm: depth,
      diameterCm: diameter,
      detectionSource: sources[Math.floor(Math.random() * sources.length)],
      status: "Submitted",
      slaDays: severity >= 7.5 ? 7 : severity >= 4 ? 14 : 21,
      dailyTrafficPCU: Math.round(2000 + Math.random() * 12000),
    });

    res.status(201).json({ success: true, data: pothole });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/potholes/:id
// Retrieve a single pothole by its potholeId string (e.g. NETRA-2025-00001)
// or by MongoDB _id.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/live-frame", (req, res) => {
    const liveFramePath = path.resolve(__dirname, "../../NETRA-AI/output/live_frame.jpg");
    res.sendFile(liveFramePath, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } }, (err) => {
      if (err) {
        res.status(204).end();
      }
    });
  });

router.get("/live-meta", (req, res) => {
  const liveMetaPath = path.resolve(__dirname, "../../NETRA-AI/output/live_meta.json");
  if (!fs.existsSync(liveMetaPath)) {
    return res.status(204).end();
  }
  res.sendFile(liveMetaPath, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
});

  router.get("/live-logs", (req, res) => {
    const liveLogPath = path.resolve(__dirname, "../../NETRA-AI/output/live_log.txt");
    if (fs.existsSync(liveLogPath)) {
      res.sendFile(liveLogPath, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } });
    } else {
      res.status(204).end();
    }
  });
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Accept either a MongoDB ObjectId or the human-readable potholeId
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { potholeId: id.toUpperCase() };

    const pothole = await Pothole.findOne(query).lean({ virtuals: true });
    if (!pothole) {
      return res.status(404).json({ success: false, message: `Pothole '${id}' not found` });
    }

    res.json({ success: true, data: pothole });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/potholes/:id/status
// Update the lifecycle status of a specific pothole.
//
// Body: { "status": "In Progress" }
// Optional body fields also accepted: repairImageUrl, assignedOfficer
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, repairImageUrl, assignedOfficer } = req.body;

    // ── Validate incoming status ────────────────────────────────────────────
    if (!status) {
      return res.status(400).json({ success: false, message: "Request body must include 'status'" });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // ── Find the record ─────────────────────────────────────────────────────
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { potholeId: id.toUpperCase() };
    const pothole = await Pothole.findOne(query);

    if (!pothole) {
      return res.status(404).json({ success: false, message: `Pothole '${id}' not found` });
    }

    // ── Enforce valid state transition ──────────────────────────────────────
    const allowed = STATUS_TRANSITIONS[pothole.status];
    if (!allowed.includes(status)) {
      return res.status(422).json({
        success: false,
        message: `Cannot transition from '${pothole.status}' → '${status}'. Allowed: [${allowed.join(", ") || "none — terminal state"}]`,
      });
    }

    // ── Apply updates ────────────────────────────────────────────────────────
    pothole.status = status;
    if (repairImageUrl !== undefined) pothole.repairImageUrl = repairImageUrl;
    if (assignedOfficer !== undefined) pothole.assignedOfficer = assignedOfficer;

    await pothole.save(); // triggers pre-save hook (SLA auto-escalation)

    res.json({
      success: true,
      message: `Status updated to '${status}'`,
      data: pothole.toObject({ virtuals: true }),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/potholes/:id/assign
// Assign a PWD officer and/or link a PG Portal grievance ID.
//
// Body: { "assignedOfficer": "Er. R.K. Sahu", "grievanceId": "CPGR-2025-009" }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/assign", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedOfficer, grievanceId } = req.body;

    if (!assignedOfficer && !grievanceId) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one of: assignedOfficer, grievanceId",
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { potholeId: id.toUpperCase() };

    const updateFields = {};
    if (assignedOfficer) updateFields.assignedOfficer = assignedOfficer;
    if (grievanceId)     updateFields.grievanceId     = grievanceId;

    const pothole = await Pothole.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });

    if (!pothole) {
      return res.status(404).json({ success: false, message: `Pothole '${id}' not found` });
    }

    res.json({ success: true, data: pothole });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: `Duplicate grievanceId: '${req.body.grievanceId}'` });
    }
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/potholes/analyze-video
// Upload a video and run the NETRA-AI pipeline
// \n
router.post("/analyze-video", upload.single("video"), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No video file provided" });
  }

  const videoPath = path.resolve(req.file.path);
  // NETRA-AI directory relative to netra-api
  const aiDir = path.resolve(__dirname, "../../NETRA-AI");
  
  const isImage = /\.(jpg|jpeg|png|bmp)$/i.test(req.file.originalname);
  const liveMetaPath = path.resolve(aiDir, "output/live_meta.json");
  
  console.log(`[NETRA-API] Starting AI analysis on ${videoPath}`);

  // Reset progress metadata at request start so UI never reuses previous run's 100% snapshot.
  try {
    fs.mkdirSync(path.dirname(liveMetaPath), { recursive: true });
    fs.writeFileSync(
      liveMetaPath,
      JSON.stringify(
        {
          sourceFps: 0,
          previewTargetFps: 0,
          realtimeMode: true,
          sourceType: isImage ? "image" : "video",
          totalFrames: 0,
          processedFrames: 0,
          progressPct: 0,
          done: false,
          updatedAt: Date.now() / 1000,
        },
        null,
        0
      )
    );
  } catch (metaErr) {
    console.warn("[NETRA-API] Failed to reset live_meta.json", metaErr);
  }

  // Spawn the python process
  // Adjust 'python' to 'python3' if needed, but since user is on Windows running 'python', we use 'python'
  const pythonPath = process.env.PYTHON_PATH || path.join("..", "NETRA-AI", ".venv", "Scripts", "python.exe");
  const aiProcess = spawn(pythonPath, [
    "-u",
    "pipeline.py",
    "--source", videoPath,
    "--sync-api",
    "--no-gui",
    "--save-vid",
    "--realtime-mode"
  ], {
    cwd: aiDir,
    // Add environment variable for API URL to point to this exact server
    env: {
      ...process.env,
      API_URL: `http://localhost:${process.env.PORT || 5000}/api/potholes`
    }
  });

  let outputLog = "";
    const liveLogFile = path.resolve(aiDir, "output/live_log.txt");
    fs.writeFileSync(liveLogFile, ""); // Reset log for new run

    aiProcess.stdout.on("data", (data) => {
      console.log(`[AI]: ${data}`);
      outputLog += data.toString();
      fs.appendFileSync(liveLogFile, data.toString());
    });

    aiProcess.stderr.on("data", (data) => {
      console.error(`[AI Error]: ${data}`);
      outputLog += data.toString();
      fs.appendFileSync(liveLogFile, data.toString());
    });

    aiProcess.on("close", (code) => {
    console.log(`[NETRA-API] AI Process exited with code ${code}`);
    // Clean up the uploaded file
    fs.unlink(videoPath, (err) => {
      if (err) console.error(`[NETRA-API] Failed to delete temp file: ${err}`);
    });

    if (code === 0) {
      const resultPath = isImage ? "/outputs/annotated_image.jpg" : "/outputs/annotated_video.webm";
      
      let totalDetected = 0;
      let potholesList = [];
      try {
        const uniquePath = path.resolve(aiDir, "output/unique_potholes.json");
        if (fs.existsSync(uniquePath)) {
          const contents = fs.readFileSync(uniquePath, "utf-8");
          const parsed = JSON.parse(contents);
          totalDetected = parsed.length;
          potholesList = parsed;
        }
      } catch (err) {
        console.error("Failed to parse unique_potholes.json", err);
      }

      res.json({
        success: true,
        message: "Analysis complete and data synced.",
        log: outputLog,
        totalPotholes: totalDetected,
        potholesList: potholesList,
        csvUrl: `http://localhost:${process.env.PORT || 5000}/outputs/unique_potholes.csv?t=${Date.now()}`,
        outputUrl: `http://localhost:${process.env.PORT || 5000}${resultPath}?t=${Date.now()}`
      });
    } else {
      res.status(500).json({ success: false, message: `AI process failed with code ${code}`, log: outputLog });
    }
  });
});

module.exports = router;
