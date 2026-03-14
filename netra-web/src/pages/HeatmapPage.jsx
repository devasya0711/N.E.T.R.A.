import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePotholeList } from "../hooks/usePotholes";
import { useComplaints } from "../context/ComplaintContext";

// ─── Grid builder ─────────────────────────────────────────────────────────────
const LAT_MIN = 21.0, LAT_MAX = 22.6, LNG_MIN = 81.4, LNG_MAX = 83.0;
const RISK_WEIGHTS = { severity: 0.45, depth: 0.35, traffic: 0.20 };

const STATUS_OPTIONS = ["All", "Submitted", "In Progress", "Escalated", "Fixed"];
const SOURCE_OPTIONS = ["All", "Satellite", "Drone", "Transit-Dashcam", "Citizen-Portal"];

function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v) || 0));
}

function extractTrafficRatio(p) {
  if (typeof p.dangerIndex === "number" && p.dangerIndex > 0) {
    return clamp01(p.dangerIndex / 100);
  }

  const t = String(p.traffic || "").toLowerCase();
  if (t.includes("very heavy")) return 1;
  if (t.includes("heavy")) return 0.8;
  if (t.includes("moderate")) return 0.55;
  if (t.includes("light")) return 0.3;
  return 0.4;
}

function getPotholeRiskScore(p) {
  const sev = clamp01((Number(p.score) || 0) / 10);
  const depth = clamp01((Number(p.depth) || 0) / 20);
  const traffic = extractTrafficRatio(p);
  const composite =
    RISK_WEIGHTS.severity * sev +
    RISK_WEIGHTS.depth * depth +
    RISK_WEIGHTS.traffic * traffic;
  return Number((composite * 10).toFixed(2));
}

function parseDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRecordDate(p) {
  return parseDateOrNull(p.filedAt || p.detectedAt || p.createdAt);
}

function getCellBounds(row, col, latStep, lngStep, latBins) {
  // row is visual row (north-first), convert to south-first index.
  const actualRow = latBins - 1 - row;
  const latMin = LAT_MIN + actualRow * latStep;
  const latMax = latMin + latStep;
  const lngMin = LNG_MIN + col * lngStep;
  const lngMax = lngMin + lngStep;
  return { latMin, latMax, lngMin, lngMax };
}

function buildHeatGrid(potholes, latBins = 10, lngBins = 14) {
  const riskGrid = Array.from({ length: latBins }, () => Array(lngBins).fill(0));
  const countGrid = Array.from({ length: latBins }, () => Array(lngBins).fill(0));
  const latStep = (LAT_MAX - LAT_MIN) / latBins;
  const lngStep = (LNG_MAX - LNG_MIN) / lngBins;

  potholes.forEach((p) => {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const r = Math.floor((lat - LAT_MIN) / latStep);
    const c = Math.floor((lng - LNG_MIN) / lngStep);
    if (r >= 0 && r < latBins && c >= 0 && c < lngBins) {
      riskGrid[r][c] += getPotholeRiskScore(p);
      countGrid[r][c] += 1;
    }
  });

  return { riskGrid, countGrid, latBins, lngBins, latStep, lngStep };
}

// ─── Time filter logic ────────────────────────────────────────────────────────
const TIME_FILTERS = [
  { key: "7d",  label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "custom", label: "Custom" },
  { key: "all", label: "All Time" },
];

function getTimeWindow(filterKey, customFrom, customTo) {
  if (filterKey === "all") return null;

  if (filterKey === "custom") {
    const from = parseDateOrNull(customFrom);
    const to = parseDateOrNull(customTo);
    if (!from && !to) return null;
    const start = from || new Date(0);
    const end = to ? new Date(to.getTime() + 86400000 - 1) : new Date();
    return { start, end };
  }

  const now = new Date();
  const days = filterKey === "7d" ? 7 : 30;
  return { start: new Date(now.getTime() - days * 86400000), end: now };
}

function getPreviousWindow(window) {
  if (!window) return null;
  const duration = window.end.getTime() - window.start.getTime();
  const end = new Date(window.start.getTime() - 1);
  const start = new Date(end.getTime() - duration);
  return { start, end };
}

function filterByWindow(potholes, window) {
  if (!window) return potholes;
  return potholes.filter((p) => {
    const d = getRecordDate(p);
    return d ? d >= window.start && d <= window.end : true;
  });
}

function toSegmentName(p) {
  const base = String(p.location || "").trim();
  if (!base) return "Unknown Segment";
  const cut = base.split(",")[0].trim();
  return cut || "Unknown Segment";
}

function toRiskStatus(score) {
  if (score >= 8) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 3.5) return "MEDIUM";
  return "LOW";
}

function buildSegmentRisk(potholes, prevByName = new Map()) {
  const map = new Map();

  potholes.forEach((p) => {
    const name = toSegmentName(p);
    const risk = getPotholeRiskScore(p);
    const key = name.toLowerCase();
    const prev = map.get(key) || {
      id: key.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown-segment",
      name,
      count: 0,
      riskSum: 0,
      maxRisk: 0,
      criticalCount: 0,
      overdueCount: 0,
    };

    prev.count += 1;
    prev.riskSum += risk;
    prev.maxRisk = Math.max(prev.maxRisk, risk);
    if (risk >= 8) prev.criticalCount += 1;
    if ((p.sladays || 0) > 0 && p.filedAt) {
      const elapsed = Math.floor((Date.now() - new Date(p.filedAt).getTime()) / 86400000);
      if (elapsed > p.sladays) prev.overdueCount += 1;
    }
    map.set(key, prev);
  });

  const rows = Array.from(map.values()).map((s) => {
    const avgRisk = s.count > 0 ? s.riskSum / s.count : 0;
    const score = Number(Math.max(avgRisk, s.maxRisk * 0.8).toFixed(1));
    const status = toRiskStatus(score);
    const previousScore = Number(prevByName.get(s.name.toLowerCase()) || 0);
    const delta = Number((score - previousScore).toFixed(1));
    return {
      ...s,
      score,
      status,
      trend: delta > 0.2 ? "UP" : delta < -0.2 ? "DOWN" : "STABLE",
      delta,
    };
  });

  rows.sort((a, b) => b.score - a.score || b.count - a.count);
  return rows;
}

const STATUS_COLOR = {
  CRITICAL: { bar: "bg-red-500",    text: "text-red-600",    badge: "bg-red-50 border-red-200 text-red-600"    },
  HIGH:     { bar: "bg-orange-500", text: "text-orange-600", badge: "bg-orange-50 border-orange-200 text-orange-600" },
  MEDIUM:   { bar: "bg-amber-500",  text: "text-amber-600",  badge: "bg-amber-50 border-amber-200 text-amber-600"  },
  LOW:      { bar: "bg-blue-500",   text: "text-blue-600",   badge: "bg-blue-50 border-blue-200 text-blue-600"   },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function HeatmapPage() {
  const { citizenPotholes } = useComplaints();
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedSource, setSelectedSource] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const { potholes: apiPotholes, loading } = usePotholeList({ limit: 200 });

  const allPotholes = useMemo(() => {
    const merged = [...apiPotholes, ...citizenPotholes];
    const seen = new Set();
    return merged.filter((p) => {
      const key = String(p.id || `${p.lat}-${p.lng}-${p.createdAt || p.filedAt || ""}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [apiPotholes, citizenPotholes]);

  const window = useMemo(() => getTimeWindow(timeFilter, customFrom, customTo), [timeFilter, customFrom, customTo]);
  const previousWindow = useMemo(() => getPreviousWindow(window), [window]);

  const filtered = useMemo(() => {
    const base = filterByWindow(allPotholes, window);
    return base.filter((p) => {
      const statusOk = selectedStatus === "All" || p.status === selectedStatus;
      const sourceOk = selectedSource === "All" || p.source === selectedSource;
      const q = searchText.trim().toLowerCase();
      const searchOk = !q || String(p.location || "").toLowerCase().includes(q) || String(p.id || "").toLowerCase().includes(q);
      return statusOk && sourceOk && searchOk;
    });
  }, [allPotholes, window, selectedStatus, selectedSource, searchText]);

  const previousFiltered = useMemo(() => {
    const base = filterByWindow(allPotholes, previousWindow);
    return base.filter((p) => {
      const statusOk = selectedStatus === "All" || p.status === selectedStatus;
      const sourceOk = selectedSource === "All" || p.source === selectedSource;
      const q = searchText.trim().toLowerCase();
      const searchOk = !q || String(p.location || "").toLowerCase().includes(q) || String(p.id || "").toLowerCase().includes(q);
      return statusOk && sourceOk && searchOk;
    });
  }, [allPotholes, previousWindow, selectedStatus, selectedSource, searchText]);

  const prevSegmentMap = useMemo(() => {
    const map = new Map();
    const rows = buildSegmentRisk(previousFiltered, new Map());
    rows.forEach((r) => map.set(r.name.toLowerCase(), r.score));
    return map;
  }, [previousFiltered]);

  const segmentRisk = useMemo(() => buildSegmentRisk(filtered, prevSegmentMap), [filtered, prevSegmentMap]);

  const { riskGrid, countGrid, latBins, lngBins, latStep, lngStep } = useMemo(() => buildHeatGrid(filtered), [filtered]);
  const maxVal = useMemo(() => Math.max(...riskGrid.flat(), 0), [riskGrid]);

  // ── Summary stats ──────────────────────────────────────────────────────
  const activeZones = countGrid.flat().filter((v) => v > 0).length;
  const criticalSegments = segmentRisk.filter((s) => s.status === "CRITICAL").length;
  const highestRisk = segmentRisk[0] || { score: 0, name: "No segment data" };
  const avgScore = segmentRisk.length
    ? (segmentRisk.reduce((s, r) => s + r.score, 0) / segmentRisk.length).toFixed(1)
    : "0.0";

  const freshnessDate = useMemo(() => {
    const dated = filtered.map(getRecordDate).filter(Boolean);
    if (!dated.length) return "No dated records";
    const latest = new Date(Math.max(...dated.map((d) => d.getTime())));
    return latest.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [filtered]);

  const qualityScore = useMemo(() => {
    if (!filtered.length) return 0;
    let filled = 0;
    filtered.forEach((p) => {
      const hasCoords = Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
      const hasScore = Number.isFinite(Number(p.score));
      const hasDate = !!getRecordDate(p);
      if (hasCoords) filled += 1;
      if (hasScore) filled += 1;
      if (hasDate) filled += 1;
    });
    return Math.round((filled / (filtered.length * 3)) * 100);
  }, [filtered]);

  const prevActiveZones = useMemo(() => {
    const prev = buildHeatGrid(previousFiltered);
    return prev.countGrid.flat().filter((v) => v > 0).length;
  }, [previousFiltered]);
  const activeDelta = activeZones - prevActiveZones;

  const prevCritical = useMemo(() => buildSegmentRisk(previousFiltered).filter((s) => s.status === "CRITICAL").length, [previousFiltered]);
  const criticalDelta = criticalSegments - prevCritical;

  const prevAvg = useMemo(() => {
    const prev = buildSegmentRisk(previousFiltered);
    return prev.length ? prev.reduce((s, r) => s + r.score, 0) / prev.length : 0;
  }, [previousFiltered]);
  const avgDelta = Number(avgScore) - prevAvg;

  const cellPotholes = useMemo(() => {
    if (!selectedCell) return [];
    const bounds = getCellBounds(selectedCell.row, selectedCell.col, latStep, lngStep, latBins);
    return filtered.filter((p) =>
      Number(p.lat) >= bounds.latMin &&
      Number(p.lat) < bounds.latMax &&
      Number(p.lng) >= bounds.lngMin &&
      Number(p.lng) < bounds.lngMax
    );
  }, [selectedCell, filtered, latStep, lngStep, latBins]);

  const SUMMARY = [
    {
      label: "Active Risk Zones",
      value: activeZones,
      sub: `of ${latBins * lngBins} grid cells`,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      label: "Critical Segments",
      value: criticalSegments,
      sub: `${criticalDelta >= 0 ? "+" : ""}${criticalDelta} vs previous window`,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      label: "Highest Risk",
      value: highestRisk.score,
      sub: highestRisk.name,
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-200",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      label: "Avg Risk Score",
      value: avgScore,
      sub: `${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(1)} vs previous window`,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
  ];

  function exportSegmentCsv() {
    const headers = ["Rank", "Segment", "RiskScore", "Trend", "Delta", "Potholes", "CriticalCount", "OverdueCount"];
    const rows = segmentRisk.map((s, i) => [
      i + 1,
      s.name,
      s.score,
      s.trend,
      s.delta,
      s.count,
      s.criticalCount,
      s.overdueCount,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `netra-segment-risk-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Click handler — navigate to Live Map centered on cell + drilldown ───
  function handleCellClick(rowIdx, colIdx, val) {
    if (val <= 0) return;
    setSelectedCell({ row: rowIdx, col: colIdx });

    // rowIdx is inverted (north-first), so convert back
    const actualRow = latBins - 1 - rowIdx;
    const lat = LAT_MIN + (actualRow + 0.5) * latStep;
    const lng = LNG_MIN + (colIdx + 0.5) * lngStep;
    navigate(`/dashboard/livemap?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&zoom=13`);
  }

  return (
    <div className="space-y-8">
      {/* Header + Time filter */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Risk Heatmaps</h1>
          <p className="text-sm text-slate-500 mt-1">
            Accident risk ranked by severity score × traffic density across the NH-130 corridor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSegmentCsv}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                timeFilter === f.key
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Filters + model + data quality */}
      <div className="netra-panel p-4 md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search segment / location"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          />
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-[11px] font-semibold text-slate-500">Freshness:</span>
            <span className="text-[11px] font-bold text-slate-700 truncate">{freshnessDate}</span>
          </div>
        </div>

        {timeFilter === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Risk Formula</p>
            <p className="text-xs text-slate-700">
              Composite Risk (0-10) =
              {` ${RISK_WEIGHTS.severity * 100}% Severity + ${RISK_WEIGHTS.depth * 100}% Depth + ${RISK_WEIGHTS.traffic * 100}% Traffic`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Data Confidence</p>
              <p className="text-xs text-slate-700">Coverage of coordinates, score, and timestamps</p>
            </div>
            <span className={`text-lg font-black ${qualityScore >= 80 ? "text-emerald-600" : qualityScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {qualityScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={s.color}>{s.icon}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Grid heatmap */}
      <div className="netra-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-700">
              Spatial Risk Grid — Raipur to Korba (NH-130)
            </h2>
            <p className="text-[11px] text-slate-500">
              Lat 21.0°–22.6°N  ×  Lng 81.4°–83.0°E · Click a hot cell to view on Live Map
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            {[
              { color: "#e2e8f0", label: "No Data" },
              { color: "#dbeafe", label: "Low"    },
              { color: "#fbbf24", label: "Med"    },
              { color: "#fb923c", label: "High"   },
              { color: "#ef4444", label: "Crit"   },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-sm" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid render — rows = latitude bands, cols = longitude bands */}
        <div
          className="grid gap-0.5 rounded-lg overflow-hidden border border-slate-200"
          style={{ gridTemplateColumns: `repeat(${lngBins}, 1fr)` }}
        >
          {/* Render rows in reverse (north at top) */}
          {[...riskGrid].reverse().map((row, ri) =>
            row.map((val, ci) => {
              const intensity = val / Math.max(maxVal, 1);
              const hits = countGrid[latBins - 1 - ri][ci];
              let bg = "#e2e8f0";
              if (val > 0) {
                if (intensity < 0.2) bg = "#dbeafe";
                else if (intensity < 0.45) bg = "#93c5fd";
                else if (intensity < 0.65) bg = "#fbbf24";
                else if (intensity < 0.75) bg = "#fb923c";
                else bg = "#ef4444";
              }
              const lngCenter = LNG_MIN + (ci + 0.5) * lngStep;
              return (
                <div
                  key={`${ri}-${ci}`}
                  title={val > 0 ? `Composite risk: ${val.toFixed(1)} · Detections: ${hits} · ~${lngCenter.toFixed(2)}°E — Click to view on map` : "No detections in selected filters"}
                  className={`aspect-square transition-all hover:opacity-80 ${val > 0 ? "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:z-10" : "cursor-default"}`}
                  style={{ background: bg, minHeight: "18px" }}
                  onClick={() => handleCellClick(ri, ci, val)}
                />
              );
            })
          )}
        </div>

        {/* X-axis labels */}
        <div
          className="grid mt-1"
          style={{ gridTemplateColumns: `repeat(${lngBins}, 1fr)` }}
        >
          {Array.from({ length: lngBins }, (_, i) => (
            <span key={i} className="text-center text-[8px] text-slate-500 truncate">
              {(LNG_MIN + (i + 0.5) * lngStep).toFixed(1)}°
            </span>
          ))}
        </div>
      </div>

      {/* Cell drilldown */}
      <div className="netra-panel p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-1">Selected Cell Drilldown</h2>
        <p className="text-[11px] text-slate-500 mb-4">
          Click a non-empty heatmap cell to inspect potholes, status, and escalation readiness.
        </p>

        {!selectedCell && (
          <p className="text-xs text-slate-500">No cell selected yet.</p>
        )}

        {selectedCell && cellPotholes.length === 0 && (
          <p className="text-xs text-slate-500">Selected cell has no potholes after current filters.</p>
        )}

        {selectedCell && cellPotholes.length > 0 && (
          <div className="space-y-2">
            {cellPotholes.slice(0, 12).map((p) => {
              const score = getPotholeRiskScore(p);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{p.id}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[560px]">{p.location || "Unknown location"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{p.status || "Submitted"}</span>
                    <span className="text-sm font-black text-blue-700">{score.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ranked highway segment risk table */}
      <div className="netra-panel p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-1">
          Accident Risk Ranking by Highway Segment
        </h2>
        <p className="text-[11px] text-slate-500 mb-5">
          Sorted by composite risk score · urgency determines complaint escalation priority
        </p>
        <div className="space-y-3">
          {segmentRisk.length === 0 && (
            <p className="text-xs text-slate-500">No segment data available for current filters.</p>
          )}

          {segmentRisk.map((seg, i) => {
              const cfg = STATUS_COLOR[seg.status];
              return (
                <div key={seg.name} className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-500 w-5 text-right font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-700 font-medium">{seg.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{seg.count} pothole{seg.count > 1 ? "s" : ""}</span>
                        <span className={`text-[10px] font-bold ${seg.trend === "UP" ? "text-red-600" : seg.trend === "DOWN" ? "text-emerald-600" : "text-slate-500"}`}>
                          {seg.trend === "UP" ? "UP" : seg.trend === "DOWN" ? "DOWN" : "STABLE"} {seg.delta >= 0 ? "+" : ""}{seg.delta}
                        </span>
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded uppercase ${cfg.badge}`}>
                          {seg.status}
                        </span>
                        <span className={`text-sm font-bold ${cfg.text}`}>{seg.score}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${cfg.bar}`}
                        style={{ width: `${(seg.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
