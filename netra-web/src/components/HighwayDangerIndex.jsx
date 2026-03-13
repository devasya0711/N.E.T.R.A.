import { useState, useEffect } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Map,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  Activity,
} from "lucide-react";
import { fetchHighways } from "../services/api";

// ─── Fallback highway data (used when API has no aggregated highways) ─────────
const FALLBACK_HIGHWAYS = [
  {
    id: "nh-130",
    name: "NH-130",
    stretch: "Raipur – Korba",
    length: 248,
    activePotholes: 38,
    dangerIndex: 82,
    avgDepth: 9.4,
    avgScore: 7.8,
    trend: "up",
    lastScanned: "Today, 06:14 AM",
    district: "Janjgir-Champa",
    pcuDaily: 12400,
  },
  {
    id: "nh-30",
    name: "NH-30",
    stretch: "Raipur – Jagdalpur",
    length: 294,
    activePotholes: 27,
    dangerIndex: 64,
    avgDepth: 7.1,
    avgScore: 6.2,
    trend: "down",
    lastScanned: "Today, 07:50 AM",
    district: "Bastar",
    pcuDaily: 9100,
  },
  {
    id: "nh-43",
    name: "NH-43",
    stretch: "Raipur – Ambikapur",
    length: 312,
    activePotholes: 19,
    dangerIndex: 47,
    avgDepth: 5.8,
    avgScore: 4.9,
    trend: "stable",
    lastScanned: "Yesterday, 22:00",
    district: "Surguja",
    pcuDaily: 7800,
  },
  {
    id: "nh-200",
    name: "NH-200",
    stretch: "Raipur – Sambalpur",
    length: 181,
    activePotholes: 11,
    dangerIndex: 29,
    avgDepth: 4.2,
    avgScore: 3.1,
    trend: "down",
    lastScanned: "Today, 09:00 AM",
    district: "Mahasamund",
    pcuDaily: 5400,
  },
  {
    id: "sh-10",
    name: "SH-10",
    stretch: "Bhilai – Rajhara",
    length: 112,
    activePotholes: 31,
    dangerIndex: 76,
    avgDepth: 8.9,
    avgScore: 7.2,
    trend: "up",
    lastScanned: "Today, 05:30 AM",
    district: "Durg",
    pcuDaily: 11200,
  },
  {
    id: "sh-6",
    name: "SH-6",
    stretch: "Bilaspur – Korba",
    length: 97,
    activePotholes: 22,
    dangerIndex: 55,
    avgDepth: 6.3,
    avgScore: 5.8,
    trend: "stable",
    lastScanned: "Yesterday, 18:40",
    district: "Korba",
    pcuDaily: 8300,
  },
  {
    id: "sh-17",
    name: "SH-17",
    stretch: "Dhamtari – Kanker",
    length: 143,
    activePotholes: 8,
    dangerIndex: 22,
    avgDepth: 3.5,
    avgScore: 2.4,
    trend: "down",
    lastScanned: "Today, 10:20 AM",
    district: "Dhamtari",
    pcuDaily: 3900,
  },
  {
    id: "sh-5",
    name: "SH-5",
    stretch: "Raigarh – Saria",
    length: 78,
    activePotholes: 44,
    dangerIndex: 91,
    avgDepth: 11.2,
    avgScore: 9.1,
    trend: "up",
    lastScanned: "Today, 04:45 AM",
    district: "Raigarh",
    pcuDaily: 14700,
  },
  {
    id: "nh-353a",
    name: "NH-353A",
    stretch: "Jagdalpur – Sukma",
    length: 167,
    activePotholes: 14,
    dangerIndex: 38,
    avgDepth: 5.1,
    avgScore: 4.0,
    trend: "stable",
    lastScanned: "Yesterday, 16:10",
    district: "Sukma",
    pcuDaily: 4600,
  },
  {
    id: "sh-22",
    name: "SH-22",
    stretch: "Kawardha – Dongargarh",
    length: 89,
    activePotholes: 5,
    dangerIndex: 14,
    avgDepth: 2.8,
    avgScore: 1.9,
    trend: "stable",
    lastScanned: "Today, 08:30 AM",
    district: "Kabirdham",
    pcuDaily: 2200,
  },
];

// ─── Danger level config ──────────────────────────────────────────────────────
function getDangerLevel(index) {
  if (index <= 30) return { label: "LOW RISK", color: "#059669", glow: "#059669", bg: "#ecfdf5", border: "#a7f3d0", barColor: "#059669" };
  if (index <= 70) return { label: "MODERATE", color: "#d97706", glow: "#d97706", bg: "#fffbeb", border: "#fde68a", barColor: "#d97706" };
  return { label: "CRITICAL", color: "#dc2626", glow: "#dc2626", bg: "#fef2f2", border: "#fecaca", barColor: "#dc2626" };
}

// ─── Trend icon ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }) {
  if (trend === "up")
    return <TrendingUp size={12} className="text-red-600" title="Worsening" />;
  if (trend === "down")
    return <TrendingDown size={12} className="text-emerald-600" title="Improving" />;
  return <Minus size={12} className="text-slate-400" title="Stable" />;
}

// ─── Danger progress bar ──────────────────────────────────────────────────────
function DangerBar({ index }) {
  const level = getDangerLevel(index);
  const isCritical = index > 70;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: level.color }}>
          {level.label}
        </span>
        <span className="text-sm font-black font-mono" style={{ color: level.color }}>
          {index}
          <span className="text-[10px] text-slate-400 font-normal">/100</span>
        </span>
      </div>

      {/* Track */}
      <div
        className="relative h-2.5 rounded-full overflow-hidden"
        style={{ background: "#e2e8f0" }}
      >
        {/* Filled bar */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out ${isCritical ? "animate-pulse" : ""}`}
          style={{
            width: `${index}%`,
            background: isCritical
              ? `linear-gradient(90deg, #dc2626, #ef4444, #f87171)`
              : index > 30
              ? `linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)`
              : `linear-gradient(90deg, #059669, #10b981, #34d399)`,
            boxShadow: "none",
          }}
        />

        {/* Danger threshold markers */}
        <div className="absolute top-0 bottom-0 w-px bg-slate-400" style={{ left: "30%" }} />
        <div className="absolute top-0 bottom-0 w-px bg-slate-400" style={{ left: "70%" }} />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[9px] text-slate-400 px-0.5">
        <span>0</span>
        <span className="text-slate-500">30</span>
        <span className="text-slate-500" style={{ marginLeft: "calc(40% - 8px)" }}>70</span>
        <span>100</span>
      </div>
    </div>
  );
}

// ─── Highway card ─────────────────────────────────────────────────────────────
function HighwayCard({ hw }) {
  const [expanded, setExpanded] = useState(false);
  const level = getDangerLevel(hw.dangerIndex);
  const isCritical = hw.dangerIndex > 70;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 hover:translate-y-[-2px]"
      style={{
        background: "#ffffff",
        border: `1px solid ${isCritical ? "#fecaca" : "#e2e8f0"}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Card header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-blue-900">{hw.name}</span>
              {isCritical && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase animate-pulse"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                  }}
                >
                  <AlertTriangle size={9} />
                  CRITICAL
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800 mt-0.5">{hw.stretch}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{hw.district} · {hw.length} km</p>
          </div>

          {/* Pothole count chip */}
          <div
            className="flex flex-col items-center px-3 py-2 rounded-xl shrink-0"
            style={{ background: level.bg, border: `1px solid ${level.border}` }}
          >
            <span className="text-lg font-black leading-none" style={{ color: level.color }}>
              {hw.activePotholes}
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5 whitespace-nowrap">Active</span>
          </div>
        </div>

        {/* Danger Index bar */}
        <DangerBar index={hw.dangerIndex} />
      </div>

      {/* Stats strip */}
      <div
        className="grid grid-cols-3 divide-x px-0"
        style={{
          borderTop: "1px solid #e2e8f0",
          divideColor: "#e2e8f0",
        }}
      >
        {[
          { label: "Avg Depth", value: `${hw.avgDepth} cm` },
          { label: "Risk Score", value: `${hw.avgScore}/10` },
          { label: "PCU/Day", value: hw.pcuDaily.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-2.5 px-3" style={{ borderRight: "1px solid #e2e8f0" }}>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
            <span className="text-xs font-bold text-slate-700 mt-0.5">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ borderTop: "1px solid #e2e8f0" }}
      >
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Activity size={9} />
          Last scan: <span className="text-slate-600">{hw.lastScanned}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <TrendIcon trend={hw.trend} />
            <span>{hw.trend === "up" ? "Worsening" : hw.trend === "down" ? "Improving" : "Stable"}</span>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded-md text-slate-500 hover:text-blue-900 hover:bg-blue-50 transition-colors"
          >
            <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-5 pb-4 pt-2 space-y-2 text-[11px] text-slate-500"
          style={{ borderTop: "1px solid rgba(255,255,255,0.5)", background: "#faf8f5" }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 uppercase tracking-wide text-[10px]">Stretch Length</span>
              <p className="text-slate-700 font-semibold mt-0.5">{hw.length} km</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide text-[10px]">District</span>
              <p className="text-slate-700 font-semibold mt-0.5">{hw.district}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide text-[10px]">Pothole Density</span>
              <p className="text-slate-700 font-semibold mt-0.5">
                {(hw.activePotholes / hw.length).toFixed(2)} per km
              </p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide text-[10px]">Accident Risk Band</span>
              <p className="font-bold mt-0.5" style={{ color: level.color }}>{level.label}</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 mt-1 text-blue-700 hover:text-blue-900 transition-colors">
            <ExternalLink size={11} /> View full stretch report
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sort / Filter bar ────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { label: "Danger Index ↓", key: "dangerIndex", asc: false },
  { label: "Danger Index ↑", key: "dangerIndex", asc: true },
  { label: "Active Potholes ↓", key: "activePotholes", asc: false },
  { label: "Highway Name A→Z", key: "name", asc: true },
  { label: "Stretch Length ↓", key: "length", asc: false },
];

const RISK_FILTERS = ["All", "Critical (71–100)", "Moderate (31–70)", "Low (0–30)"];

// ─── Main component ───────────────────────────────────────────────────────────
export default function HighwayDangerIndex() {
  const [sortIdx, setSortIdx] = useState(0);
  const [riskFilter, setRiskFilter] = useState("All");
  const [sortOpen, setSortOpen] = useState(false);
  const [HIGHWAYS, setHighways] = useState(FALLBACK_HIGHWAYS);

  useEffect(() => {
    fetchHighways()
      .then((res) => {
        if (res.data && res.data.length > 0) setHighways(res.data);
      })
      .catch(() => {}); // keep fallback
  }, []);

  const sorted = [...HIGHWAYS]
    .filter((hw) => {
      if (riskFilter === "All") return true;
      if (riskFilter === "Critical (71–100)") return hw.dangerIndex > 70;
      if (riskFilter === "Moderate (31–70)") return hw.dangerIndex >= 31 && hw.dangerIndex <= 70;
      if (riskFilter === "Low (0–30)") return hw.dangerIndex <= 30;
      return true;
    })
    .sort((a, b) => {
      const { key, asc } = SORT_OPTIONS[sortIdx];
      const va = a[key], vb = b[key];
      if (typeof va === "string") return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      return asc ? va - vb : vb - va;
    });

  const critCount = HIGHWAYS.filter((h) => h.dangerIndex > 70).length;
  const totalPotholes = HIGHWAYS.reduce((s, h) => s + h.activePotholes, 0);
  const avgDanger = Math.round(HIGHWAYS.reduce((s, h) => s + h.dangerIndex, 0) / HIGHWAYS.length);

  return (
    <div className="space-y-6">

      {/* ── Section header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Highway Danger Index</h2>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated risk scores across Chhattisgarh NH/SH network · Updated every 6 hours
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-500
          hover:text-blue-900 hover:bg-blue-50 border border-slate-200 transition-all duration-200">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* ── Top KPI strip ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Highways Monitored", value: HIGHWAYS.length, color: "#1e3a8a", sub: "NH + SH network" },
          { label: "Total Active Potholes", value: totalPotholes, color: "#d97706", sub: "Across all stretches" },
          { label: "Critical Stretches", value: critCount, color: "#dc2626", sub: "Index > 70" },
          { label: "Network Avg Danger", value: `${avgDanger}/100`, color: avgDanger > 70 ? "#dc2626" : avgDanger > 30 ? "#d97706" : "#059669", sub: "Composite index" },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl p-4"
            style={{
              background: "#ffffff",
              border: `1px solid #e2e8f0`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-tight">{k.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter + Sort bar ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Risk filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
          {RISK_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setRiskFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                riskFilter === f
                  ? "bg-blue-50 text-blue-900 border border-blue-300"
                  : "bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500
              border border-slate-200 hover:text-slate-700 hover:border-slate-300 transition-all duration-200"
          >
            <Map size={12} />
            {SORT_OPTIONS[sortIdx].label}
            <ChevronDown size={12} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-52 rounded-xl z-40 py-1"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                }}
              >
                {SORT_OPTIONS.map((o, i) => (
                  <button
                    key={o.label}
                    onClick={() => { setSortIdx(i); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                      sortIdx === i
                        ? "text-blue-900 bg-blue-50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Highway cards grid ── */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Map size={40} className="mx-auto mb-3 opacity-30" />
          No highways in this risk band.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((hw) => (
            <HighwayCard key={hw.id} hw={hw} />
          ))}
        </div>
      )}

      {/* ── Legend strip ── */}
      <div
        className="flex items-center gap-6 px-5 py-3 rounded-xl"
        style={{ background: "#faf8f5", border: "1px solid rgba(255,255,255,0.5)" }}
      >
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold shrink-0">Danger Index Scale</span>
        {[
          { color: "#059669", bar: "from-emerald-600 to-emerald-400", label: "0–30 Low Risk" },
          { color: "#d97706", bar: "from-amber-600 to-amber-400", label: "31–70 Moderate" },
          { color: "#dc2626", bar: "from-red-600 to-red-400", label: "71–100 Critical" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-8 h-2 rounded-full" style={{ background: l.color }} />
            <span className="text-[11px] font-semibold" style={{ color: l.color }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
