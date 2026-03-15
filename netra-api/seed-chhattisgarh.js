/**
 * N.E.T.R.A. — seed-chhattisgarh.js  (v3 — all major highways + traffic-based danger)
 *
 * Potholes placed on roads via interpolation + perpendicular jitter (±30m).
 * Danger index per highway = f(pothole_density_per_km, avg_traffic_PCU, avg_severity).
 *
 * Run:  node seed-chhattisgarh.js
 */

"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const Pothole  = require("./models/Pothole");

const TARGET = 97;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rand(a, b) { return Math.random() * (b - a) + a; }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function lerp(p1, p2, t) {
  return { lat: p1.lat + (p2.lat - p1.lat) * t, lng: p1.lng + (p2.lng - p1.lng) * t };
}

const OFFICERS = [
  "PWD Zone-1, Raipur", "PWD Zone-2, Raipur", "PWD Zone-3, Raipur", "PWD Naya Raipur",
  "PWD Bilaspur Zone-1", "PWD Bilaspur Zone-2", "PWD Durg District", "PWD Bhilai Municipal",
  "PWD Korba District", "PWD Rajnandgaon", "PWD Mahasamund", "PWD Mungeli",
  "PWD Janjgir-Champa", "PWD Raigarh", "PWD Dhamtari", "PWD Jagdalpur",
  "PWD Kanker", "PWD Kondagaon", "PWD Ambikapur", "PWD Kawardha",
  "NHAI Raipur Division", "NHAI Bilaspur Division", "NHAI Durg Division",
];

// ══════════════════════════════════════════════════════════════════════════════
//  ALL MAJOR CHHATTISGARH HIGHWAYS — with metadata + waypoints
//  avgTrafficPCU = real-world estimated average traffic on that stretch
//  lengthKm = approximate stretch length
// ══════════════════════════════════════════════════════════════════════════════

const HIGHWAYS = [
  // ────────────────────────── NATIONAL HIGHWAYS ──────────────────────────────
  {
    name: "NH-130",
    stretch: "Raipur – Bilaspur",
    district: "Raipur / Bilaspur",
    lengthKm: 120,
    avgTrafficPCU: 12400,
    weight: 5,
    points: [
      [21.2365, 81.6305, "Bhatagaon Chowk, Raipur"],
      [21.2550, 81.6380, "Jaistambh Chowk"],
      [21.2850, 81.6520, "Vivekanand Nagar"],
      [21.3280, 81.7050, "Arang Bypass"],
      [21.3900, 81.7680, "Tilda Road"],
      [21.4250, 81.8000, "Tilda Town"],
      [21.5000, 81.8600, "Simga Approach"],
      [21.5350, 81.8810, "Simga Toll Plaza"],
      [21.6200, 81.9050, "Bhatapara South"],
      [21.6580, 81.9200, "Bhatapara Town"],
      [21.7500, 81.9500, "Beltara Approach"],
      [21.8000, 81.9700, "Beltara Junction"],
      [21.9013, 82.0124, "Beltara–Takhatpur Km 112"],
      [21.9500, 82.0400, "Takhatpur Approach"],
      [22.0000, 82.0700, "Takhatpur Town"],
      [22.0400, 82.1000, "Bilaspur South Entry"],
      [22.0759, 82.1476, "Bilaspur Bypass"],
    ],
  },
  {
    name: "NH-30",
    stretch: "Raipur – Durg – Rajnandgaon",
    district: "Raipur / Durg / Rajnandgaon",
    lengthKm: 80,
    avgTrafficPCU: 14200,
    weight: 5,
    points: [
      [21.2365, 81.6305, "GE Road Raipur Start"],
      [21.2400, 81.5950, "GE Road Telibandha"],
      [21.2430, 81.5550, "Mowa Bridge"],
      [21.2350, 81.5050, "Urla Industrial Area"],
      [21.2200, 81.4550, "Kumhari Town"],
      [21.2050, 81.4050, "Bhilai Charoda Entry"],
      [21.1950, 81.3550, "Bhilai Sector 1 Gate"],
      [21.1900, 81.3050, "Bhilai Civic Centre"],
      [21.1800, 81.2550, "Durg Power House Chowk"],
      [21.1650, 81.2300, "Durg Railway Station"],
      [21.1500, 81.2050, "Durg Bus Stand"],
      [21.1200, 81.1500, "Dongargarh Road Junction"],
      [21.0900, 81.0400, "Rajnandgaon Bus Stand"],
      [21.1000, 80.9900, "Rajnandgaon Market"],
    ],
  },
  {
    name: "NH-43",
    stretch: "Raipur – Dhamtari – Jagdalpur",
    district: "Raipur / Dhamtari / Bastar",
    lengthKm: 300,
    avgTrafficPCU: 7800,
    weight: 3,
    points: [
      [21.2200, 81.6350, "Raipur Gudhiyari"],
      [21.1700, 81.6450, "Serikhedi Naka"],
      [21.1000, 81.6500, "Mandir Hasaud"],
      [21.0200, 81.6500, "Nawagaon"],
      [20.9300, 81.6200, "Ravishankar Sagar Dam"],
      [20.8700, 81.5700, "Dhamtari City"],
      [20.6000, 81.6000, "Kanker District Entry"],
      [20.4700, 81.7600, "Kanker Town"],
      [20.2700, 81.5800, "Kondagaon Highway"],
      [20.0000, 81.7000, "Narayanpur Approach"],
      [19.8500, 81.8500, "Jagdalpur North"],
      [19.0800, 82.0200, "Jagdalpur City"],
    ],
  },
  {
    name: "NH-200",
    stretch: "Raipur – Mahasamund – Raigarh",
    district: "Raipur / Mahasamund / Raigarh",
    lengthKm: 250,
    avgTrafficPCU: 6500,
    weight: 2,
    points: [
      [21.2700, 81.6800, "Raipur Pachpedi Naka"],
      [21.3040, 81.7600, "Naya Raipur Mantralaya"],
      [21.3400, 81.8500, "Mahasamund Road Junction"],
      [21.2200, 82.0800, "Mahasamund Town"],
      [21.3800, 82.5000, "Sarangarh Town"],
      [21.5500, 82.9000, "Kharsia Junction"],
      [21.7500, 83.2000, "Raigarh West Entry"],
      [21.8900, 83.3900, "Raigarh City"],
    ],
  },
  {
    name: "NH-130E",
    stretch: "Bilaspur – Champa – Korba",
    district: "Bilaspur / Janjgir-Champa / Korba",
    lengthKm: 110,
    avgTrafficPCU: 8900,
    weight: 3,
    points: [
      [22.0900, 82.1600, "Bilaspur East Exit"],
      [22.1500, 82.2800, "Akaltara Approach"],
      [22.1890, 82.3311, "Akaltara Town"],
      [22.2600, 82.4800, "Janjgir Town"],
      [22.3100, 82.5500, "Champa Town"],
      [22.3500, 82.6800, "Korba South Entry"],
      [22.3700, 82.7501, "Korba Industrial Area"],
      [22.4100, 82.8500, "Katghora Road"],
      [22.4280, 82.8820, "Katghora Town"],
    ],
  },
  {
    name: "NH-111",
    stretch: "Ambikapur – Manendragarh",
    district: "Surguja / Korea",
    lengthKm: 95,
    avgTrafficPCU: 4200,
    weight: 2,
    points: [
      [23.1200, 83.2000, "Ambikapur City"],
      [23.0300, 83.1500, "Wadrafnagar"],
      [22.9500, 83.1000, "Lakhanpur Approach"],
      [22.8200, 83.0500, "Manendragarh Junction"],
      [22.7000, 83.0000, "Manendragarh–Korba Link"],
      [22.6000, 82.9500, "Korba North"],
    ],
  },
  {
    name: "NH-353A",
    stretch: "Jagdalpur – Dantewada – Sukma",
    district: "Bastar / Dantewada / Sukma",
    lengthKm: 167,
    avgTrafficPCU: 3800,
    weight: 2,
    points: [
      [19.0800, 82.0200, "Jagdalpur South Exit"],
      [18.9500, 81.9800, "Tokapal Crossing"],
      [18.8500, 81.9500, "Lohandiguda"],
      [18.7600, 81.8000, "Dantewada Approach"],
      [18.6800, 81.7200, "Kirandul Junction"],
      [18.5000, 81.6500, "Sukma Town"],
    ],
  },
  {
    name: "NH-49",
    stretch: "Ambikapur – Renukoot (CG section)",
    district: "Surguja / Balrampur",
    lengthKm: 130,
    avgTrafficPCU: 5100,
    weight: 2,
    points: [
      [23.1200, 83.2000, "Ambikapur City North"],
      [23.2000, 83.2500, "Mainpat Road"],
      [23.3000, 83.3000, "Sitapur"],
      [23.4000, 83.3500, "Balrampur Approach"],
      [23.5000, 83.4000, "Balrampur Town"],
      [23.6100, 83.4500, "CG–UP Border Approach"],
    ],
  },
  {
    name: "NH-930",
    stretch: "Bilaspur – Mungeli – Kawardha",
    district: "Bilaspur / Mungeli / Kabirdham",
    lengthKm: 140,
    avgTrafficPCU: 5800,
    weight: 2,
    points: [
      [22.0759, 82.1476, "Bilaspur West Exit"],
      [22.0300, 82.0500, "Kota Road"],
      [22.0000, 81.9500, "Mungeli Approach"],
      [21.9500, 81.8500, "Mungeli Town"],
      [21.8500, 81.7000, "Patharia Road"],
      [21.8000, 81.5500, "Kawardha Approach"],
      [21.7500, 81.4000, "Kawardha Town"],
    ],
  },
  {
    name: "NH-30A",
    stretch: "Rajnandgaon – Dongargarh – Mohla",
    district: "Rajnandgaon",
    lengthKm: 85,
    avgTrafficPCU: 4600,
    weight: 2,
    points: [
      [21.0900, 81.0400, "Rajnandgaon South"],
      [21.0200, 80.9800, "Chhuria Junction"],
      [20.9500, 80.8500, "Dongargarh Approach"],
      [20.8700, 80.7500, "Dongargarh Temple Town"],
      [20.7500, 80.6500, "Mohla Road"],
    ],
  },

  // ────────────────────────── STATE HIGHWAYS ─────────────────────────────────
  {
    name: "SH-6",
    stretch: "Raipur – Gariaband – Mahasamund",
    district: "Raipur / Gariaband / Mahasamund",
    lengthKm: 97,
    avgTrafficPCU: 7200,
    weight: 2,
    points: [
      [21.2634, 81.6015, "Ring Road Khamardih"],
      [21.2800, 81.7000, "Naya Raipur Entry"],
      [21.3000, 81.7800, "Airport Road Junction"],
      [21.3200, 81.8600, "Chhura Crossing"],
      [21.2800, 81.9200, "Gariaband Town"],
      [21.2400, 82.0800, "Mahasamund Town"],
    ],
  },
  {
    name: "SH-5",
    stretch: "Raigarh – Saria – Dharamjaigarh",
    district: "Raigarh",
    lengthKm: 78,
    avgTrafficPCU: 4800,
    weight: 2,
    points: [
      [21.8900, 83.3900, "Raigarh City"],
      [21.9500, 83.5000, "Gharghoda Road"],
      [22.0500, 83.6000, "Saria Approach"],
      [22.1500, 83.6500, "Dharamjaigarh"],
    ],
  },
  {
    name: "SH-10",
    stretch: "Bhilai – Dalli Rajhara",
    district: "Durg / Balod",
    lengthKm: 112,
    avgTrafficPCU: 6800,
    weight: 2,
    points: [
      [21.1900, 81.2900, "Bhilai SAIL Township"],
      [21.1400, 81.2400, "Durg South Exit"],
      [21.0700, 81.2000, "Balod Road Junction"],
      [20.9500, 81.1500, "Balod Town"],
      [20.8000, 81.1000, "Dalli Rajhara Approach"],
      [20.7000, 81.0500, "Dalli Rajhara Town"],
    ],
  },
  {
    name: "SH-11",
    stretch: "Raipur – Durg Express Corridor",
    district: "Raipur / Durg",
    lengthKm: 45,
    avgTrafficPCU: 11800,
    weight: 3,
    points: [
      [21.2421, 81.5912, "Sector 9, Raipur"],
      [21.2380, 81.5500, "Ring Road Kumhari Mor"],
      [21.2300, 81.5050, "Urla CSIR Road"],
      [21.2200, 81.4700, "Kumhari Bypass"],
      [21.2100, 81.4400, "Charoda Junction"],
      [21.2000, 81.4000, "Bhilai Charoda"],
    ],
  },
  {
    name: "SH-17",
    stretch: "Dhamtari – Kanker",
    district: "Dhamtari / Kanker",
    lengthKm: 143,
    avgTrafficPCU: 3900,
    weight: 1,
    points: [
      [20.8700, 81.5700, "Dhamtari South"],
      [20.7500, 81.5500, "Nagri Approach"],
      [20.6000, 81.5000, "Charama Road"],
      [20.4700, 81.7600, "Kanker Town"],
    ],
  },
  {
    name: "SH-22",
    stretch: "Kawardha – Dongargarh",
    district: "Kabirdham / Rajnandgaon",
    lengthKm: 89,
    avgTrafficPCU: 2800,
    weight: 1,
    points: [
      [21.7500, 81.4000, "Kawardha Town"],
      [21.6000, 81.2000, "Pandariya Crossing"],
      [21.4500, 81.0000, "Bemetara Link"],
      [20.8700, 80.7500, "Dongargarh"],
    ],
  },

  // ────────────────────── CITY ARTERIAL ROADS ────────────────────────────────
  {
    name: "GE Road",
    stretch: "Great Eastern Road, Raipur",
    district: "Raipur",
    lengthKm: 12,
    avgTrafficPCU: 18500,
    weight: 4,
    points: [
      [21.2365, 81.6305, "Bhatagaon Chowk"],
      [21.2400, 81.6200, "Fafadih Chowk"],
      [21.2380, 81.6150, "Jaistambh Chowk"],
      [21.2350, 81.6050, "MG Road Crossing"],
      [21.2340, 81.5950, "Pandri Bus Stand"],
      [21.2380, 81.5750, "Railway Station Road"],
      [21.2430, 81.5550, "Mowa Bridge Approach"],
    ],
  },
  {
    name: "VIP Road",
    stretch: "VIP Road, Raipur (Telibandha–Airport)",
    district: "Raipur",
    lengthKm: 9,
    avgTrafficPCU: 12000,
    weight: 3,
    points: [
      [21.2300, 81.6350, "Telibandha Lake Road"],
      [21.2200, 81.6450, "Shankar Nagar Main"],
      [21.2100, 81.6550, "WRS Colony Gate"],
      [21.2000, 81.6650, "Mana Camp Crossing"],
      [21.1900, 81.6800, "Airport Circle"],
      [21.1851, 81.7044, "Airport Gate"],
    ],
  },
  {
    name: "Ring Road",
    stretch: "Raipur Ring Road",
    district: "Raipur",
    lengthKm: 22,
    avgTrafficPCU: 15000,
    weight: 4,
    points: [
      [21.2680, 81.6410, "Tatibandh Ring Road"],
      [21.2634, 81.6015, "Khamardih Ring Road"],
      [21.2550, 81.5800, "Mowa Ring Road"],
      [21.2421, 81.5912, "Sector 9 Ring Road"],
      [21.2300, 81.6100, "Shankar Nagar Ring"],
      [21.2200, 81.6350, "Gudhiyari Ring Road"],
      [21.2500, 81.6700, "Pachpedi Naka Ring"],
      [21.2680, 81.6600, "Tatibandh East"],
    ],
  },
  {
    name: "Station Road",
    stretch: "Raipur Station Road (Pandri–Railway Stn)",
    district: "Raipur",
    lengthKm: 4,
    avgTrafficPCU: 9500,
    weight: 2,
    points: [
      [21.2350, 81.5950, "Pandri Market"],
      [21.2300, 81.5900, "Budhapara"],
      [21.2250, 81.5850, "Purani Basti"],
      [21.2200, 81.5800, "Raipur Junction Station"],
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
//  POTHOLE GENERATION — all on roads
// ══════════════════════════════════════════════════════════════════════════════

function generatePool() {
  const pool = [];
  for (const hw of HIGHWAYS) {
    const pts = hw.points;
    // Base pothole count on length of highway + small weight multiplier
    // A 100km highway gets ~10-15 base points, modified by weight.
    const count = Math.ceil((hw.lengthKm / 15) * (1 + hw.weight * 0.5));
    for (let j = 0; j < count; j++) {
      const seg = randInt(0, pts.length - 2);
      const p1 = { lat: pts[seg][0], lng: pts[seg][1] };
      const p2 = { lat: pts[seg + 1][0], lng: pts[seg + 1][1] };
      const t = Math.random();
      const pos = lerp(p1, p2, t);
      // Perpendicular jitter ±0.0003° ≈ ±33m
      const dx = p2.lng - p1.lng, dy = p2.lat - p1.lat;
      const len = Math.hypot(dx, dy) || 0.001;
      const jitter = rand(-0.0003, 0.0003);
      pool.push({
        lat: +(pos.lat + (-dx / len) * jitter).toFixed(6),
        lng: +(pos.lng + (dy / len) * jitter).toFixed(6),
        highwayName: hw.name,
        desc: pts[t < 0.5 ? seg : seg + 1][2],
        avgTrafficPCU: hw.avgTrafficPCU,
        weight: hw.weight,
      });
    }
  }
  return pool;
}

function buildRecords(pool) {
  const selected = pool.sort(() => Math.random() - 0.5).slice(0, TARGET);
  selected.sort((a, b) => b.weight - a.weight || Math.random() - 0.5);
  const total = selected.length;

  return selected.map((raw, i) => {
    const rankRatio = i / total;
    let severityScore;
    if (rankRatio < 0.18) severityScore = +(rand(7.5, 10)).toFixed(1);
    else if (rankRatio < 0.65) severityScore = +(rand(4.0, 7.4)).toFixed(1);
    else if (rankRatio < 0.88) severityScore = +(rand(1.5, 3.9)).toFixed(1);
    else severityScore = 1;

    const dangerIndex = Math.max(0, Math.min(100, Math.round(
      severityScore * 7 + rand(0, 12) + raw.weight * 3
    )));
    const depthCm = severityScore <= 1 ? 0 : +(rand(2 + severityScore * 1.2, 4 + severityScore * 2.8)).toFixed(1);
    const diameterCm = severityScore <= 1 ? 0 : +(rand(8 + severityScore * 4, 18 + severityScore * 11)).toFixed(1);

    // Traffic from highway metadata + some per-pothole variance
    const dailyTrafficPCU = raw.avgTrafficPCU + randInt(-1500, 1500);

    let status;
    if (rankRatio >= 0.88) status = "Fixed";
    else {
      const r = Math.random();
      status = severityScore >= 7.5
        ? (r < 0.30 ? "Escalated" : r < 0.60 ? "In Progress" : "Submitted")
        : severityScore >= 4
        ? (r < 0.10 ? "Fixed" : r < 0.35 ? "In Progress" : r < 0.55 ? "Escalated" : "Submitted")
        : (r < 0.15 ? "Fixed" : r < 0.40 ? "In Progress" : "Submitted");
    }

    const slaDays = severityScore >= 8 ? randInt(3, 5) : severityScore >= 5 ? randInt(5, 9) : randInt(7, 14);
    const daysAgo = randInt(1, 75);
    const filedAt = new Date(Date.now() - daysAgo * 86400000);
    const srcRoll = Math.random();
    const detectionSource = srcRoll < 0.28 ? "Satellite" : srcRoll < 0.52 ? "Drone" : srcRoll < 0.82 ? "Transit-Dashcam" : "Citizen-Portal";
    const potholeId = `PTH-CG-${filedAt.getFullYear()}-${String(i + 1).padStart(3, "0")}`;
    const isNH = raw.highwayName.startsWith("NH");
    const isSH = raw.highwayName.startsWith("SH");

    return {
      potholeId,
      location: { type: "Point", coordinates: [raw.lng, raw.lat] },
      highwayName: (isNH || isSH) ? raw.highwayName : undefined,
      streetName: (!isNH && !isSH) ? raw.highwayName : undefined,
      locationDescription: `${raw.highwayName}, ${raw.desc}`,
      severityScore,
      dangerIndex,
      depthCm,
      diameterCm,
      dailyTrafficPCU: Math.max(1000, dailyTrafficPCU),
      detectionSource,
      status,
      slaDays,
      assignedOfficer: status !== "Submitted" ? pick(OFFICERS) : undefined,
      grievanceId: (status !== "Submitted" || Math.random() > 0.4) ? `PG-CG-${24000 + i}` : undefined,
      createdAt: filedAt,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  SEED
// ══════════════════════════════════════════════════════════════════════════════

async function seed() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) { console.error("❌  MONGO_URI not set"); process.exit(1); }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  N.E.T.R.A. — CG All-Highway Seed v3 (Traffic-Based Danger) ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const pool = generatePool();
  console.log(`🛣️   Generated ${pool.length} locations across ${HIGHWAYS.length} highways`);

  const potholes = buildRecords(pool);

  // Per-highway stats
  const hwStats = {};
  HIGHWAYS.forEach(h => { hwStats[h.name] = { count: 0, totalSev: 0, totalDepth: 0, totalTraffic: 0, lengthKm: h.lengthKm }; });
  potholes.forEach(p => {
    const key = p.highwayName || p.streetName;
    if (hwStats[key]) {
      hwStats[key].count++;
      hwStats[key].totalSev += p.severityScore;
      hwStats[key].totalDepth += p.depthCm;
      hwStats[key].totalTraffic += p.dailyTrafficPCU;
    }
  });

  console.log(`\n📊  ${potholes.length} potholes across ${Object.keys(hwStats).filter(k => hwStats[k].count > 0).length} highways:\n`);
  console.log("  Highway        | Count | Density/km | Avg Traffic | Danger Index (predicted)");
  console.log("  ───────────────┼───────┼────────────┼─────────────┼─────────────────────────");

  for (const [name, s] of Object.entries(hwStats)) {
    if (s.count === 0) continue;
    const density = s.count / s.lengthKm;
    const avgTraffic = Math.round(s.totalTraffic / s.count);
    const avgSev = s.totalSev / s.count;
    // Danger Index = weighted combination of: pothole density, traffic, severity
    // Max density ~3/km, max traffic ~18000, max sev ~10
    // Formula: 30*(density/3) + 40*(traffic/18000) + 30*(avgSev/10) → capped 0-100
    const dangerIndex = Math.min(100, Math.round(
      30 * Math.min(density / 2, 1) + 40 * Math.min(avgTraffic / 15000, 1) + 30 * Math.min(avgSev / 8, 1)
    ));
    console.log(`  ${name.padEnd(16)} | ${String(s.count).padStart(5)} | ${density.toFixed(2).padStart(10)} | ${String(avgTraffic).padStart(11)} | ${String(dangerIndex).padStart(24)}`);
  }

  // DB operations
  console.log("\n🔌  Connecting to MongoDB Atlas…");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected");

  const deleted = await Pothole.deleteMany({});
  console.log(`🗑️   Cleared ${deleted.deletedCount} existing records`);

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < potholes.length; i += BATCH) {
    try {
      const res = await Pothole.insertMany(potholes.slice(i, i + BATCH), { ordered: false });
      inserted += res.length;
    } catch (err) {
      if (err.insertedDocs) inserted += err.insertedDocs.length;
      console.warn(`⚠️  Batch error: ${err.message.slice(0, 80)}`);
    }
  }
  console.log(`✅  Inserted ${inserted} pothole records`);

  // Verify
  const geo = await Pothole.aggregate([{
    $group: {
      _id: null,
      minLat: { $min: { $arrayElemAt: ["$location.coordinates", 1] } },
      maxLat: { $max: { $arrayElemAt: ["$location.coordinates", 1] } },
      minLng: { $min: { $arrayElemAt: ["$location.coordinates", 0] } },
      maxLng: { $max: { $arrayElemAt: ["$location.coordinates", 0] } },
    },
  }]);
  if (geo[0]) {
    console.log(`\n🌍  Bounds: ${geo[0].minLat.toFixed(2)}°N–${geo[0].maxLat.toFixed(2)}°N, ${geo[0].minLng.toFixed(2)}°E–${geo[0].maxLng.toFixed(2)}°E`);
  }

  await mongoose.connection.close();
  console.log("\n🎉  All-highway CG seed complete!");
}

seed().catch(err => {
  console.error("❌  Fatal:", err);
  mongoose.connection.close();
  process.exit(1);
});
