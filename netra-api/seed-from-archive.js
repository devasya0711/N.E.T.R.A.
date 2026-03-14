/**
 * N.E.T.R.A. — seed-from-archive.js
 *
 * Reads geotagged accident data from archive/AccidentsBig.csv,
 * clusters accident-dense locations, and generates realistic pothole
 * records with severity parameters calibrated to accident density.
 *
 * Replaces ALL existing pothole data in MongoDB.
 *
 * Run:  node seed-from-archive.js
 */

"use strict";

require("dotenv").config();
const fs       = require("fs");
const path     = require("path");
const readline = require("readline");
const mongoose = require("mongoose");
const Pothole  = require("./models/Pothole");

// ─── Config ───────────────────────────────────────────────────────────────────
const CSV_PATH        = path.join(__dirname, "..", "archive", "AccidentsBig.csv");
const TARGET_POTHOLES = 121;             // how many potholes to generate
const GRID_PRECISION  = 3;               // decimal places for geo-grid (3 = ~110m cells)
const MIN_ACCIDENTS   = 1;               // min accidents in a cell to consider (1 ensures maximum scattering)

// ─── Chhattisgarh highway corridor names (for road name generation) ──────────
const HIGHWAYS = [
  "NH-130", "NH-130E", "NH-30", "NH-43", "NH-200", "NH-111",
  "SH-6", "SH-10", "SH-11", "SH-5", "SH-9", "SH-12",
];
const CITIES = {
  "Raipur": [21.2514, 81.6296],
  "Bilaspur": [22.0797, 82.1409],
  "Durg": [21.1938, 81.2849],
  "Bhilai": [21.2121, 81.3831],
  "Korba": [22.3595, 82.7501],
  "Rajnandgaon": [21.1047, 81.0315],
  "Raigarh": [21.8974, 83.3950],
  "Jagdalpur": [19.0760, 82.0270],
  "Ambikapur": [23.1355, 83.1818],
  "Mahasamund": [21.1065, 82.0963],
  "Dhamtari": [20.7062, 81.5496],
  "Kawardha": [22.0152, 81.2268],
  "Mungeli": [22.0664, 81.6888],
  "Janjgir": [22.0163, 82.5607],
  "Champa": [22.0400, 82.6600],
  "Akaltara": [22.0242, 82.4243],
  "Bemetara": [21.6967, 81.5540],
  "Balod": [20.7291, 81.2033],
  "Dongargarh": [21.1856, 80.7601],
  "Pithora": [21.2676, 82.5186],
  "Arang": [21.1963, 81.9688]
};
const CITY_NAMES = Object.keys(CITIES);
const ROAD_DESCS = [
  "Near Flyover", "Junction Overpass", "Bypass Stretch", "City Road",
  "Industrial Approach", "Market Road", "Highway Crossing", "Service Road",
  "Ring Road Stretch", "Toll Plaza Approach", "Bus Stop Vicinity",
  "School Zone", "Hospital Access Road", "Bridge Approach", "Railway Crossing",
];
const OFFICERS = [
  "PWD Zone-1, Raipur", "PWD Zone-2, Raipur", "PWD Zone-3, Raipur",
  "PWD Bilaspur Zone-1", "PWD Bilaspur Zone-2", "PWD Durg District",
  "PWD Korba District", "PWD Korba North", "PWD Rajnandgaon",
  "PWD Mahasamund", "PWD Mungeli", "PWD Janjgir-Champa",
  "PWD Raigarh", "PWD Dhamtari", "PWD Kawardha", "PWD Jagdalpur",
  "NHAI Raipur Division", "NHAI Bilaspur Division",
];
const SOURCES = ["Satellite", "Drone", "Transit-Dashcam", "Citizen-Portal"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function gridKey(lat, lng) {
  const f = Math.pow(10, GRID_PRECISION);
  return `${Math.round(lat * f) / f},${Math.round(lng * f) / f}`;
}

// ─── Step 1 : Parse CSV and build accident density grid ───────────────────────

async function parseAccidentCSV() {
  console.log("📂  Reading accident archive:", CSV_PATH);
  const grid = new Map();   // gridKey → { lat, lng, count, totalSeverity, maxSeverity, casualties, vehicles }
  let rowCount = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header = null;
  for await (const line of rl) {
    if (!header) { header = line.split(","); continue; }

    const cols = line.split(",");
    const lng = parseFloat(cols[1]);
    const lat = parseFloat(cols[2]);
    const severity = parseInt(cols[4], 10);       // 1=Fatal, 2=Serious, 3=Slight
    const numVehicles = parseInt(cols[5], 10);
    const numCasualties = parseInt(cols[6], 10);
    const speedLimit = parseInt(cols[13], 10);
    const roadSurface = parseInt(cols[23], 10);    // 1=Dry, 2=Wet, 3=Snow, 4=Ice, 5=Flood, -1=Unknown

    if (isNaN(lat) || isNaN(lng)) continue;
    // Only accept valid Chhattisgarh coordinates
    if (lng < 80.0 || lng > 84.5 || lat < 17.5 || lat > 24.5) continue;

    const key = gridKey(lat, lng);
    if (!grid.has(key)) {
      grid.set(key, {
        lat, lng,
        count: 0, totalSeverity: 0, maxSeverity: 3,
        casualties: 0, vehicles: 0, speedSum: 0,
        wetRoadCount: 0,
      });
    }
    const cell = grid.get(key);
    cell.count++;
    cell.totalSeverity += severity;
    cell.maxSeverity = Math.min(cell.maxSeverity, severity); // 1=most severe
    cell.casualties += (numCasualties || 0);
    cell.vehicles += (numVehicles || 0);
    cell.speedSum += (speedLimit || 30);
    if (roadSurface >= 2 && roadSurface <= 5) cell.wetRoadCount++;
    // Average position in cell
    cell.lat = cell.lat + (lat - cell.lat) / cell.count;
    cell.lng = cell.lng + (lng - cell.lng) / cell.count;

    rowCount++;
  }

  console.log(`   Parsed ${rowCount.toLocaleString()} accident records`);
  console.log(`   Built ${grid.size.toLocaleString()} geo-grid cells`);
  return grid;
}

// ─── Step 2 : Rank cells by accident density and generate potholes ────────────

function generatePotholes(grid) {
  // Filter cells with enough accidents
  const hotspots = [...grid.values()]
    .filter(c => c.count >= MIN_ACCIDENTS)
    .sort((a, b) => {
      const scoreA = a.count * (4 - a.maxSeverity) * Math.max(a.casualties, 1);
      const scoreB = b.count * (4 - b.maxSeverity) * Math.max(b.casualties, 1);
      return scoreB - scoreA;
    });

  console.log(`   Found ${hotspots.length} accident hotspots (≥${MIN_ACCIDENTS} accidents)`);

  // Proper Fisher-Yates shuffle to guarantee completely even geographic scattering
  const shuffled = [...hotspots];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, TARGET_POTHOLES);
  const total = selected.length;

  const potholes = selected.map((cell, i) => {
    // ── Rank-based severity distribution ──────────────────────────────
    // Position ratio: 0 = most dangerous, 1 = least dangerous
    const rankRatio = i / total;

    let severityScore;
    if (rankRatio < 0.20) {
      // Top 20% → HIGH severity (7.5 – 10.0)
      severityScore = +(rand(7.5, 10)).toFixed(1);
    } else if (rankRatio < 0.70) {
      // Middle 50% → MEDIUM severity (4.0 – 7.4)
      severityScore = +(rand(4.0, 7.4)).toFixed(1);
    } else if (rankRatio < 0.90) {
      // Next 20% → LOW severity (1.5 – 3.9)
      severityScore = +(rand(1.5, 3.9)).toFixed(1);
    } else {
      // Bottom 10% → REPAIRED (score = 1, status will be Fixed)
      severityScore = 1;
    }

    // ── Danger index correlates with severity + accident data ─────────
    const avgSeverity = cell.totalSeverity / cell.count;
    const severityWeight = (4 - avgSeverity) / 3;
    const densityRatio = cell.count / (selected[0]?.count || 1);
    const dangerIndex = Math.max(0, Math.min(100, Math.round(
      (severityScore * 7) + (severityWeight * 15) + (densityRatio * 10) + randInt(0, 8)
    )));

    // ── Physical dimensions scale with severity ──────────────────────
    const depthCm = severityScore <= 1
      ? 0
      : +(rand(2 + severityScore * 1.5, 5 + severityScore * 2.5)).toFixed(1);
    const diameterCm = severityScore <= 1
      ? 0
      : +(rand(10 + severityScore * 5, 20 + severityScore * 12)).toFixed(1);

    // ── Traffic estimate from accident data ───────────────────────────
    const avgSpeed = cell.speedSum / cell.count;
    const dailyTrafficPCU = Math.round(cell.vehicles * rand(80, 200) + avgSpeed * rand(10, 50));

    // ── Status distribution ──────────────────────────────────────────
    let status;
    if (rankRatio >= 0.90) {
      status = "Fixed";   // Repaired potholes
    } else {
      const r = Math.random();
      if (severityScore >= 7.5) {
        status = r < 0.35 ? "Escalated" : r < 0.65 ? "In Progress" : "Submitted";
      } else if (severityScore >= 4) {
        status = r < 0.10 ? "Fixed" : r < 0.40 ? "In Progress" : r < 0.60 ? "Escalated" : "Submitted";
      } else {
        status = r < 0.15 ? "Fixed" : r < 0.40 ? "In Progress" : "Submitted";
      }
    }

    // ── SLA days (tighter for severe) ────────────────────────────────
    const slaDays = severityScore >= 8 ? randInt(3, 5) : severityScore >= 5 ? randInt(5, 9) : randInt(7, 14);

    // ── Filing date ──────────────────────────────────────────────────
    const daysAgo = randInt(1, 60);
    const filedAt = new Date(Date.now() - daysAgo * 86400000);

    // ── Grievance ID (if filed) ──────────────────────────────────────
    const hasFiling = status !== "Submitted" || Math.random() > 0.5;
    const grievanceId = hasFiling ? `PG-CG-${25000 + i}` : null;

    // ── Source selection (weighted) ──────────────────────────────────
    const srcRoll = Math.random();
    const detectionSource = srcRoll < 0.30 ? "Satellite"
      : srcRoll < 0.55 ? "Drone"
      : srcRoll < 0.85 ? "Transit-Dashcam"
      : "Citizen-Portal";

    // ── Location name ────────────────────────────────────────────────
    const highway = pick(HIGHWAYS);
    const city = CITY_NAMES[i % CITY_NAMES.length]; // guarantee even distribution
    const cityCoords = CITIES[city];
    const desc = pick(ROAD_DESCS);
    const km = randInt(1, 200);
    const locationDescription = `${highway}, ${city} – ${desc}, Km ${km}`;

    // ── Generate pothole ID ──────────────────────────────────────────
    const potholeId = `NETRA-${filedAt.getFullYear()}-${String(i + 1).padStart(5, "0")}`;

    // ── Wide jitter to spread pins across highways (approx 15-20km radius from city) ──────────────────────
    const jLat = cityCoords[0] + rand(-0.15, 0.15);
    const jLng = cityCoords[1] + rand(-0.15, 0.15);

    return {
      potholeId,
      location: {
        type: "Point",
        coordinates: [+jLng.toFixed(6), +jLat.toFixed(6)],
      },
      highwayName: highway,
      locationDescription,
      severityScore,
      dangerIndex,
      depthCm,
      diameterCm,
      dailyTrafficPCU,
      detectionSource,
      status,
      slaDays,
      assignedOfficer: status !== "Submitted" ? pick(OFFICERS) : undefined,
      grievanceId: grievanceId || undefined,
      createdAt: filedAt,
    };
  });

  // Summary stats
  const byStatus = {};
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0, REPAIRED: 0 };
  potholes.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    if (p.status === "Fixed" && p.severityScore <= 1) bySeverity.REPAIRED++;
    else if (p.severityScore >= 7.5) bySeverity.HIGH++;
    else if (p.severityScore >= 4) bySeverity.MEDIUM++;
    else bySeverity.LOW++;
  });

  console.log(`\n📊  Generated ${potholes.length} potholes from accident hotspot data:`);
  console.log(`    Status:   ${JSON.stringify(byStatus)}`);
  console.log(`    Severity: ${JSON.stringify(bySeverity)}`);

  return potholes;
}

// ─── Step 3 : Seed MongoDB ────────────────────────────────────────────────────

async function seedDatabase(potholes) {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌  MONGO_URI not set in .env");
    process.exit(1);
  }

  console.log("\n🔌  Connecting to MongoDB Atlas…");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected");

  // ── Drop ALL existing pothole data ──────────────────────────────────────
  const deleted = await Pothole.deleteMany({});
  console.log(`🗑️   Cleared ${deleted.deletedCount} existing pothole records`);

  // ── Insert in batches ───────────────────────────────────────────────────
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < potholes.length; i += BATCH) {
    const batch = potholes.slice(i, i + BATCH);
    try {
      const res = await Pothole.insertMany(batch, { ordered: false });
      inserted += res.length;
    } catch (err) {
      // Some may fail due to duplicate keys, that's OK
      if (err.insertedDocs) inserted += err.insertedDocs.length;
      console.warn(`⚠️  Batch ${Math.floor(i / BATCH) + 1}: ${err.message.slice(0, 80)}`);
    }
  }

  console.log(`✅  Inserted ${inserted} pothole records into MongoDB`);

  // ── Verify ──────────────────────────────────────────────────────────────
  const counts = await Pothole.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort:  { _id: 1 } },
  ]);
  console.log("\n📊  Records by status in MongoDB:");
  counts.forEach(({ _id, count }) => console.log(`    ${_id.padEnd(12)} → ${count}`));

  const geo = await Pothole.aggregate([
    { $group: {
      _id: null,
      minLat: { $min: { $arrayElemAt: ["$location.coordinates", 1] } },
      maxLat: { $max: { $arrayElemAt: ["$location.coordinates", 1] } },
      minLng: { $min: { $arrayElemAt: ["$location.coordinates", 0] } },
      maxLng: { $max: { $arrayElemAt: ["$location.coordinates", 0] } },
    }},
  ]);
  if (geo[0]) {
    console.log(`\n🌍  Geographic bounds:`);
    console.log(`    Lat: ${geo[0].minLat.toFixed(4)}°N – ${geo[0].maxLat.toFixed(4)}°N`);
    console.log(`    Lng: ${geo[0].minLng.toFixed(4)}°E – ${geo[0].maxLng.toFixed(4)}°E`);
  }

  await mongoose.connection.close();
  console.log("\n🎉  Seed complete! All pothole data replaced from accident archive.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  N.E.T.R.A. — Pothole Data Generation from Accident Archive  ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const grid = await parseAccidentCSV();
  const potholes = generatePotholes(grid);
  await seedDatabase(potholes);
}

main().catch(err => {
  console.error("❌  Fatal:", err);
  mongoose.connection.close();
  process.exit(1);
});
