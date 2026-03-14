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
  { id: "nh-130",  name: "NH-130",  stretch: "Raipur – Bilaspur",               length: 120, activePotholes: 42, dangerIndex: 78, avgDepth: 14.2, avgScore: 7.4, trend: "up",     lastScanned: "Today, 06:14 AM", district: "Raipur / Bilaspur",            pcuDaily: 12400 },
  { id: "nh-30",   name: "NH-30",   stretch: "Raipur – Durg – Rajnandgaon",     length: 80,  activePotholes: 38, dangerIndex: 82, avgDepth: 15.8, avgScore: 7.8, trend: "up",     lastScanned: "Today, 07:50 AM", district: "Raipur / Durg / Rajnandgaon",  pcuDaily: 14200 },
  { id: "nh-43",   name: "NH-43",   stretch: "Raipur – Dhamtari – Jagdalpur",    length: 300, activePotholes: 22, dangerIndex: 45, avgDepth: 10.1, avgScore: 5.2, trend: "stable", lastScanned: "Today, 08:30 AM", district: "Raipur / Dhamtari / Bastar",   pcuDaily: 7800  },
  { id: "nh-200",  name: "NH-200",  stretch: "Raipur – Mahasamund – Raigarh",    length: 250, activePotholes: 12, dangerIndex: 32, avgDepth: 7.6,  avgScore: 4.1, trend: "down",   lastScanned: "Today, 09:00 AM", district: "Raipur / Mahasamund / Raigarh",pcuDaily: 6500  },
  { id: "nh-130e", name: "NH-130E", stretch: "Bilaspur – Champa – Korba",        length: 110, activePotholes: 18, dangerIndex: 52, avgDepth: 11.4, avgScore: 5.8, trend: "stable", lastScanned: "Today, 05:30 AM", district: "Bilaspur / Janjgir-Champa",    pcuDaily: 8900  },
  { id: "nh-111",  name: "NH-111",  stretch: "Ambikapur – Manendragarh",         length: 95,  activePotholes:  8, dangerIndex: 28, avgDepth: 6.2,  avgScore: 3.5, trend: "down",   lastScanned: "Today, 10:20 AM", district: "Surguja / Korea",              pcuDaily: 4200  },
  { id: "nh-353a", name: "NH-353A", stretch: "Jagdalpur – Dantewada – Sukma",    length: 167, activePotholes: 10, dangerIndex: 25, avgDepth: 5.8,  avgScore: 3.2, trend: "stable", lastScanned: "Yesterday, 16:10",district: "Bastar / Dantewada / Sukma",   pcuDaily: 3800  },
  { id: "nh-49",   name: "NH-49",   stretch: "Ambikapur – Renukoot (CG section)",length: 130, activePotholes:  7, dangerIndex: 24, avgDepth: 5.5,  avgScore: 3.0, trend: "stable", lastScanned: "Today, 11:00 AM", district: "Surguja / Balrampur",          pcuDaily: 5100  },
  { id: "nh-930",  name: "NH-930",  stretch: "Bilaspur – Mungeli – Kawardha",    length: 140, activePotholes:  9, dangerIndex: 30, avgDepth: 6.8,  avgScore: 3.8, trend: "down",   lastScanned: "Today, 12:00 PM", district: "Bilaspur / Mungeli / Kabirdham",pcuDaily: 5800  },
  { id: "nh-30a",  name: "NH-30A",  stretch: "Rajnandgaon – Dongargarh – Mohla", length: 85,  activePotholes:  6, dangerIndex: 22, avgDepth: 5.0,  avgScore: 2.8, trend: "down",   lastScanned: "Today, 08:00 AM", district: "Rajnandgaon",                  pcuDaily: 4600  },
  { id: "sh-6",    name: "SH-6",    stretch: "Raipur – Gariaband – Mahasamund",  length: 97,  activePotholes: 14, dangerIndex: 42, avgDepth: 9.5,  avgScore: 5.0, trend: "stable", lastScanned: "Yesterday, 18:40",district: "Raipur / Gariaband",           pcuDaily: 7200  },
  { id: "sh-5",    name: "SH-5",    stretch: "Raigarh – Saria – Dharamjaigarh",  length: 78,  activePotholes:  5, dangerIndex: 20, avgDepth: 4.8,  avgScore: 2.5, trend: "down",   lastScanned: "Today, 04:45 AM", district: "Raigarh",                      pcuDaily: 4800  },
  { id: "sh-10",   name: "SH-10",   stretch: "Bhilai – Dalli Rajhara",           length: 112, activePotholes: 11, dangerIndex: 38, avgDepth: 8.2,  avgScore: 4.6, trend: "stable", lastScanned: "Today, 05:30 AM", district: "Durg / Balod",                 pcuDaily: 6800  },
  { id: "sh-11",   name: "SH-11",   stretch: "Raipur – Durg Express Corridor",   length: 45,  activePotholes: 16, dangerIndex: 68, avgDepth: 12.8, avgScore: 6.5, trend: "up",     lastScanned: "Today, 06:00 AM", district: "Raipur / Durg",                pcuDaily: 11800 },
  { id: "sh-17",   name: "SH-17",   stretch: "Dhamtari – Kanker",                length: 143, activePotholes:  4, dangerIndex: 15, avgDepth: 3.8,  avgScore: 2.0, trend: "down",   lastScanned: "Today, 10:20 AM", district: "Dhamtari / Kanker",            pcuDaily: 3900  },
  { id: "sh-22",   name: "SH-22",   stretch: "Kawardha – Dongargarh",            length: 89,  activePotholes:  3, dangerIndex: 12, avgDepth: 3.2,  avgScore: 1.8, trend: "stable", lastScanned: "Today, 08:30 AM", district: "Kabirdham / Rajnandgaon",      pcuDaily: 2800  },
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
            Aggregated risk scores across Chhattisgarh NH/SH network
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
