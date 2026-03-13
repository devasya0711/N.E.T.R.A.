import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePotholeList } from "../hooks/usePotholes";
import { useComplaints } from "../context/ComplaintContext";

// ─── Grid builder ─────────────────────────────────────────────────────────────
const LAT_MIN = 21.0, LAT_MAX = 22.6, LNG_MIN = 81.4, LNG_MAX = 83.0;

function buildHeatGrid(potholes, latBins = 10, lngBins = 14) {
  const grid = Array.from({ length: latBins }, () => Array(lngBins).fill(0));
  const latStep = (LAT_MAX - LAT_MIN) / latBins;
  const lngStep = (LNG_MAX - LNG_MIN) / lngBins;

  potholes.forEach((p) => {
    const r = Math.floor((p.lat - LAT_MIN) / latStep);
    const c = Math.floor((p.lng - LNG_MIN) / lngStep);
    if (r >= 0 && r < latBins && c >= 0 && c < lngBins) {
      const weight = p.severity === "HIGH" ? 3 : p.severity === "MEDIUM" ? 2 : 1;
      grid[r][c] += weight;
    }
  });
  return { grid, latBins, lngBins, latStep, lngStep };
}

// ─── Time filter logic ────────────────────────────────────────────────────────
const TIME_FILTERS = [
  { key: "7d",  label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "all", label: "All Time" },
];

function filterByTime(potholes, filterKey) {
  if (filterKey === "all") return potholes;
  const now = new Date();
  const days = filterKey === "7d" ? 7 : 30;
  const cutoff = new Date(now.getTime() - days * 86400000);
  return potholes.filter((p) => {
    const d = p.filedAt || p.detectedAt || p.createdAt;
    return d ? new Date(d) >= cutoff : true; // keep entries without dates
  });
}

// ─── Segment risk data ────────────────────────────────────────────────────────
const SEGMENT_RISK = [
  { name: "Raipur Junction (NH-130 Entry)",  score: 9.1, count: 3, status: "CRITICAL" },
  { name: "Raipur Ring Road",                score: 8.7, count: 2, status: "CRITICAL" },
  { name: "Bilaspur Bypass – Km 48-65",      score: 7.9, count: 2, status: "HIGH" },
  { name: "Beltara – Km 110-125",            score: 6.3, count: 2, status: "MEDIUM" },
  { name: "Akaltara – Km 77-90",             score: 5.4, count: 1, status: "MEDIUM" },
  { name: "Korba Industrial Approach",       score: 8.4, count: 2, status: "HIGH" },
  { name: "Katghora–Korba SH-10",            score: 4.5, count: 1, status: "MEDIUM" },
  { name: "VIP Road, Raipur",                score: 4.9, count: 1, status: "MEDIUM" },
];

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
  const { potholes: apiPotholes, loading } = usePotholeList({ limit: 200 });

  const allPotholes = useMemo(() => [...apiPotholes, ...citizenPotholes], [apiPotholes, citizenPotholes]);
  const filtered = useMemo(() => filterByTime(allPotholes, timeFilter), [allPotholes, timeFilter]);

  const { grid, latBins, lngBins, latStep, lngStep } = useMemo(() => buildHeatGrid(filtered), [filtered]);
  const maxVal = Math.max(...grid.flat());

  // ── Summary stats ──────────────────────────────────────────────────────
  const activeZones = grid.flat().filter((v) => v > 0).length;
  const criticalSegments = SEGMENT_RISK.filter((s) => s.status === "CRITICAL").length;
  const highestRisk = [...SEGMENT_RISK].sort((a, b) => b.score - a.score)[0];
  const avgScore = (SEGMENT_RISK.reduce((s, r) => s + r.score, 0) / SEGMENT_RISK.length).toFixed(1);

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
      sub: "require immediate action",
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
      sub: "across all segments",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
  ];

  // ── Click handler — navigate to Live Map centered on cell ──────────────
  function handleCellClick(rowIdx, colIdx, val) {
    if (val === 0) return;
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
              { color: "#e2e8f0", label: "None"   },
              { color: "#93c5fd", label: "Low"    },
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
          {[...grid].reverse().map((row, ri) =>
            row.map((val, ci) => {
              const intensity = val / Math.max(maxVal, 1);
              let bg = "#f1f5f9";
              if (val > 0) {
                if (intensity < 0.15) bg = "#bfdbfe";
                else if (intensity < 0.35) bg = "#93c5fd";
                else if (intensity < 0.55) bg = "#fbbf24";
                else if (intensity < 0.75) bg = "#fb923c";
                else bg = "#ef4444";
              }
              const lngCenter = LNG_MIN + (ci + 0.5) * lngStep;
              return (
                <div
                  key={`${ri}-${ci}`}
                  title={val > 0 ? `Risk weight: ${val} · ~${lngCenter.toFixed(2)}°E — Click to view on map` : "No detections"}
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

      {/* Ranked highway segment risk table */}
      <div className="netra-panel p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-1">
          Accident Risk Ranking by Highway Segment
        </h2>
        <p className="text-[11px] text-slate-500 mb-5">
          Sorted by composite risk score · urgency determines complaint escalation priority
        </p>
        <div className="space-y-3">
          {[...SEGMENT_RISK]
            .sort((a, b) => b.score - a.score)
            .map((seg, i) => {
              const cfg = STATUS_COLOR[seg.status];
              return (
                <div key={seg.name} className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-500 w-5 text-right font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-700 font-medium">{seg.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{seg.count} pothole{seg.count > 1 ? "s" : ""}</span>
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
