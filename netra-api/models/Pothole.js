/**
 * N.E.T.R.A. API — models/Pothole.js
 * Mongoose schema: single source of truth for every detected road anomaly.
 */

"use strict";

const mongoose = require("mongoose");

// ─── Sub-schema: GeoJSON Point ────────────────────────────────────────────────
// MongoDB requires GeoJSON to be stored as { type: "Point", coordinates: [lng, lat] }
// Note: GeoJSON coordinate order is [LONGITUDE, LATITUDE] — opposite of the common
// "lat, lng" mental model. Enforced via the validator below.
const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator(coords) {
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message:
          "coordinates must be [longitude, latitude] with lng ∈ [-180,180] and lat ∈ [-90,90]",
      },
    },
  },
  { _id: false } // embedded sub-doc, no separate _id
);

// ─── Main Schema ──────────────────────────────────────────────────────────────
const PotholeSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    potholeId: {
      type: String,
      required: [true, "potholeId is required"],
      unique: true,
      trim: true,
      uppercase: true,
      // Example format: NETRA-2025-00001
      match: [/^[A-Z0-9\-]+$/, "potholeId must be alphanumeric with dashes"],
    },

    // ── Geospatial ─────────────────────────────────────────────────────────────
    location: {
      type: GeoPointSchema,
      required: [true, "location (GeoJSON Point) is required"],
    },

    highwayName: {
      type: String,
      trim: true,
      maxlength: [200, "highwayName must be ≤ 200 characters"],
    },

    streetName: {
      type: String,
      trim: true,
      maxlength: [200, "streetName must be ≤ 200 characters"],
    },

    // Human-readable landmark / milestone description
    locationDescription: {
      type: String,
      trim: true,
      maxlength: [500, "locationDescription must be ≤ 500 characters"],
    },

    // ── Risk metrics ───────────────────────────────────────────────────────────
    severityScore: {
      type: Number,
      required: [true, "severityScore (1–10) is required"],
      min: [1, "severityScore minimum is 1"],
      max: [10, "severityScore maximum is 10"],
    },

    dangerIndex: {
      type: Number,
      required: [true, "dangerIndex (0–100) is required"],
      min: [0, "dangerIndex minimum is 0"],
      max: [100, "dangerIndex maximum is 100"],
    },

    // Physical measurements
    depthCm: {
      type: Number,
      min: [0, "depthCm cannot be negative"],
    },

    diameterCm: {
      type: Number,
      min: [0, "diameterCm cannot be negative"],
    },

    // ── Detection metadata ─────────────────────────────────────────────────────
    detectionSource: {
      type: String,
      required: [true, "detectionSource is required"],
      enum: {
        values: ["Satellite", "Drone", "Transit-Dashcam", "Citizen-Portal"],
        message:
          "detectionSource must be one of: Satellite, Drone, Transit-Dashcam, Citizen-Portal",
      },
    },

    // ── Lifecycle status ───────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ["Submitted", "In Progress", "Fixed", "Escalated"],
        message: "status must be one of: Submitted, In Progress, Fixed, Escalated",
      },
      default: "Submitted",
    },

    // SLA tracking
    slaDays: {
      type: Number,
      default: 7,
      min: 1,
    },

    // Officer assigned in PWD/NHAI
    assignedOfficer: {
      type: String,
      trim: true,
    },

    // PG Portal / CPGRAMS grievance reference
    grievanceId: {
      type: String,
      trim: true,
      sparse: true, // allow null/undefined without uniqueness conflict
      unique: true,
    },

    // ── Images ────────────────────────────────────────────────────────────────
    imageUrl: {
      type: String,
      trim: true,
      // Validate URL format — only from known trusted domains or relative paths
      validate: {
        validator(v) {
          if (!v) return true; // optional field
          return /^(https?:\/\/|\/)[^\s]+$/.test(v);
        },
        message: "imageUrl must be a valid URL or relative path",
      },
    },

    repairImageUrl: {
      type: String,
      trim: true,
      validate: {
        validator(v) {
          if (!v) return true;
          return /^(https?:\/\/|\/)[^\s]+$/.test(v);
        },
        message: "repairImageUrl must be a valid URL or relative path",
      },
    },

    // ── Traffic context ────────────────────────────────────────────────────────
    dailyTrafficPCU: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    versionKey: false,
    // Return virtuals when converting to JSON / plain object
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── 2dsphere index for geospatial queries ────────────────────────────────────
// Enables $near, $geoWithin, $geoIntersects queries on the location field.
PotholeSchema.index({ location: "2dsphere" });

// ─── Compound indexes for common dashboard queries ────────────────────────────
PotholeSchema.index({ status: 1, createdAt: -1 });           // filter by status, sort newest first
PotholeSchema.index({ detectionSource: 1, severityScore: -1 }); // filter by source, sort by risk
PotholeSchema.index({ highwayName: 1, dangerIndex: -1 });      // highway-level aggregations

// ─── Virtual: days elapsed since detection ────────────────────────────────────
PotholeSchema.virtual("daysElapsed").get(function () {
  if (!this.createdAt) return null;
  return Math.floor((Date.now() - this.createdAt.getTime()) / 86_400_000);
});

// ─── Virtual: SLA breached ────────────────────────────────────────────────────
PotholeSchema.virtual("slaBreached").get(function () {
  if (this.status === "Fixed") return false;
  return (this.daysElapsed ?? 0) > (this.slaDays ?? 7);
});

// ─── Pre-save: auto-escalate if SLA breached and still Submitted/In Progress ──
PotholeSchema.pre("save", function (next) {
  if (
    this.slaBreached &&
    (this.status === "Submitted" || this.status === "In Progress")
  ) {
    this.status = "Escalated";
  }
  next();
});

module.exports = mongoose.model("Pothole", PotholeSchema);
