/**
 * N.E.T.R.A. API — seed.js
 * Uploads the 15 dummy pothole records (mirrored from netra-web/src/data/potholes.js)
 * into MongoDB Atlas.
 *
 * Run once:  node seed.js
 */

"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const Pothole  = require("./models/Pothole");

// ─── Dummy data (mirrors netra-web/src/data/potholes.js) ─────────────────────
// Field mapping:
//   id               → potholeId
//   lat/lng          → location GeoJSON Point  ([lng, lat])
//   location (str)   → locationDescription
//   score            → severityScore  (min 1; REPAIRED fixed as 1)
//   score * 10       → dangerIndex
//   depth            → depthCm
//   diameter         → diameterCm
//   source           → detectionSource  ("Bus Dashcam" → "Transit-Dashcam")
//   sladays          → slaDays
//   grievanceId      → grievanceId
//   officer          → assignedOfficer  (skip "Unassigned")
//   verificationStatus + filingStatus → status

const RAW = [
  // HIGH
  { id:"PTH-CG-2026-001", lat:21.2514, lng:81.6296, location:"NH-130, Raipur Junction Overpass",          severity:"HIGH",    score:9.1, depth:18, diameter:67, traffic:10000, source:"Satellite",    filingStatus:"Filed",   verificationStatus:"Escalated",      filedAt:"2026-02-28T14:11:00", sladays:9,  grievanceId:"PG-CG-24581", officer:"PWD Zone-3, Raipur" },
  { id:"PTH-CG-2026-002", lat:21.2634, lng:81.6015, location:"Ring Road, Raipur (Khamardih Stretch)",      severity:"HIGH",    score:8.7, depth:14, diameter:52, traffic:8500,  source:"Drone",        filingStatus:"Filed",   verificationStatus:"Awaiting Repair", filedAt:"2026-03-05T09:23:00", sladays:7,  grievanceId:"PG-CG-24612", officer:"PWD Zone-1, Raipur" },
  { id:"PTH-CG-2026-003", lat:22.3595, lng:82.7501, location:"NH-130E, Korba Industrial Approach",         severity:"HIGH",    score:8.4, depth:16, diameter:60, traffic:8000,  source:"Bus Dashcam",  filingStatus:"Filed",   verificationStatus:"Awaiting Repair", filedAt:"2026-03-06T07:45:00", sladays:6,  grievanceId:"PG-CG-24633", officer:"PWD Korba District" },
  { id:"PTH-CG-2026-004", lat:22.0759, lng:82.1476, location:"NH-130, Bilaspur Bypass – Km 48",            severity:"HIGH",    score:7.9, depth:12, diameter:48, traffic:7000,  source:"Drone",        filingStatus:"Filed",   verificationStatus:"Awaiting Repair", filedAt:"2026-03-07T11:10:00", sladays:5,  grievanceId:"PG-CG-24659", officer:"PWD Bilaspur Zone-2" },
  { id:"PTH-CG-2026-005", lat:21.2421, lng:81.5912, location:"Raipur–Durg SH-11, Sector 9 Crossing",       severity:"HIGH",    score:7.6, depth:11, diameter:44, traffic:6500,  source:"Satellite",    filingStatus:"Filed",   verificationStatus:"Escalated",      filedAt:"2026-02-20T08:30:00", sladays:17, grievanceId:"PG-CG-24438", officer:"PWD Zone-2, Raipur" },

  // MEDIUM
  { id:"PTH-CG-2026-006", lat:21.9013, lng:82.0124, location:"NH-130, Beltara Town – Km 112",              severity:"MEDIUM",  score:6.3, depth:9,  diameter:38, traffic:4000,  source:"Bus Dashcam",  filingStatus:"Filed",   verificationStatus:"Awaiting Repair", filedAt:"2026-03-04T16:22:00", sladays:8,  grievanceId:"PG-CG-24601", officer:"PWD Mungeli" },
  { id:"PTH-CG-2026-007", lat:21.3040, lng:81.7200, location:"SH-6 Raipur–Mahasamund – Km 22",             severity:"MEDIUM",  score:5.8, depth:8,  diameter:33, traffic:3500,  source:"Drone",        filingStatus:"Filed",   verificationStatus:"Awaiting Repair", filedAt:"2026-03-08T10:05:00", sladays:4,  grievanceId:"PG-CG-24671", officer:"PWD Mahasamund" },
  { id:"PTH-CG-2026-008", lat:22.1890, lng:82.3311, location:"NH-130, Akaltara – Km 77",                   severity:"MEDIUM",  score:5.4, depth:7,  diameter:29, traffic:3000,  source:"Bus Dashcam",  filingStatus:"Pending", verificationStatus:"Awaiting Repair", filedAt:null,                  sladays:null, grievanceId:null, officer:null },
  { id:"PTH-CG-2026-009", lat:21.1851, lng:81.7044, location:"VIP Road, Raipur – Near Airport Gate",        severity:"MEDIUM",  score:4.9, depth:7,  diameter:28, traffic:3200,  source:"Bus Dashcam",  filingStatus:"Pending", verificationStatus:"Awaiting Repair", filedAt:null,                  sladays:null, grievanceId:null, officer:null },
  { id:"PTH-CG-2026-010", lat:22.4280, lng:82.8820, location:"SH-10, Katghora – Km 14",                    severity:"MEDIUM",  score:4.5, depth:6,  diameter:25, traffic:2500,  source:"Drone",        filingStatus:"Filed",   verificationStatus:"Awaiting Repair", filedAt:"2026-03-08T14:30:00", sladays:4,  grievanceId:"PG-CG-24680", officer:"PWD Korba North" },

  // LOW
  { id:"PTH-CG-2026-011", lat:21.2700, lng:81.6600, location:"Tatibandh Link Road, Raipur",                 severity:"LOW",     score:3.2, depth:4,  diameter:18, traffic:1800,  source:"Bus Dashcam",  filingStatus:"Pending", verificationStatus:"Awaiting Repair", filedAt:null,                  sladays:null, grievanceId:null, officer:null },
  { id:"PTH-CG-2026-012", lat:22.3100, lng:82.6800, location:"Korba–Champa Road – Km 31",                   severity:"LOW",     score:2.8, depth:3,  diameter:15, traffic:1500,  source:"Satellite",    filingStatus:"Pending", verificationStatus:"Awaiting Repair", filedAt:null,                  sladays:null, grievanceId:null, officer:null },

  // REPAIRED
  { id:"PTH-CG-2026-013", lat:21.2300, lng:81.6100, location:"Shankar Nagar, Raipur – Internal Road",       severity:"REPAIRED",score:0,   depth:0,  diameter:0,  traffic:3000,  source:"Drone",        filingStatus:"Filed",   verificationStatus:"Verified",       filedAt:"2026-02-10T09:00:00", sladays:6,  grievanceId:"PG-CG-24201", officer:"PWD Zone-1, Raipur" },
  { id:"PTH-CG-2026-014", lat:22.0500, lng:82.1200, location:"Bilaspur City Road – Km 5",                   severity:"REPAIRED",score:0,   depth:0,  diameter:0,  traffic:7000,  source:"Bus Dashcam",  filingStatus:"Filed",   verificationStatus:"Verified",       filedAt:"2026-02-15T10:30:00", sladays:5,  grievanceId:"PG-CG-24310", officer:"PWD Bilaspur Zone-1" },
  { id:"PTH-CG-2026-015", lat:22.3800, lng:82.7100, location:"Korba Market Road Patch",                     severity:"REPAIRED",score:0,   depth:0,  diameter:0,  traffic:3000,  source:"Satellite",    filingStatus:"Filed",   verificationStatus:"Verified",       filedAt:"2026-02-22T11:00:00", sladays:4,  grievanceId:"PG-CG-24405", officer:"PWD Korba District" },
];

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapSource(src) {
  if (src === "Bus Dashcam") return "Transit-Dashcam";
  return src; // "Satellite" | "Drone" stay as-is
}

function mapStatus(raw) {
  if (raw.verificationStatus === "Verified")  return "Fixed";
  if (raw.verificationStatus === "Escalated") return "Escalated";
  if (raw.filingStatus === "Filed")           return "In Progress";
  return "Submitted"; // Pending
}

function toDoc(r) {
  const doc = {
    potholeId:           r.id,
    location: {
      type:        "Point",
      coordinates: [r.lng, r.lat],   // GeoJSON: [lng, lat]
    },
    locationDescription: r.location,
    severityScore:       r.score > 0 ? r.score : 1, // schema min is 1
    dangerIndex:         Math.min(Math.round(r.score * 10), 100),
    depthCm:             r.depth,
    diameterCm:          r.diameter,
    dailyTrafficPCU:     r.traffic,
    detectionSource:     mapSource(r.source),
    status:              mapStatus(r),
  };

  if (r.sladays)      doc.slaDays        = r.sladays;
  if (r.grievanceId)  doc.grievanceId    = r.grievanceId;
  if (r.officer)      doc.assignedOfficer = r.officer;

  return doc;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌  MONGO_URI not set in .env");
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB Atlas…");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected\n");

  // Wipe existing seed data to avoid duplicates on re-runs
  const deleted = await Pothole.deleteMany({
    potholeId: { $in: RAW.map((r) => r.id) },
  });
  if (deleted.deletedCount > 0)
    console.log(`🗑️   Removed ${deleted.deletedCount} existing records`);

  // Insert all 15 records
  const docs = RAW.map(toDoc);
  const inserted = await Pothole.insertMany(docs, { ordered: false });
  console.log(`✅  Inserted ${inserted.length} pothole records into MongoDB\n`);

  // Summary
  const counts = await Pothole.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort:  { _id: 1 } },
  ]);
  console.log("📊  Records by status:");
  counts.forEach(({ _id, count }) => console.log(`    ${_id.padEnd(12)} → ${count}`));

  await mongoose.connection.close();
  console.log("\n🎉  Seed complete. MongoDB Atlas is ready.");
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  mongoose.connection.close();
  process.exit(1);
});
