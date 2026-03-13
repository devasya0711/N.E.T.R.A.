import { useState } from "react";
import { usePotholeList } from "../hooks/usePotholes";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Per-officer resolution summary ─────────────────────────────────────────
function buildOfficerStats(potholes) {
  const map = {};
  potholes.forEach((p) => {
    if (!p.officer || p.officer === "Unassigned") return;
    if (!map[p.officer]) map[p.officer] = { filed: 0, verified: 0, escalated: 0, totalSla: 0, slaCount: 0 };
    if (p.filingStatus === "Filed" || p.filingStatus === "File") map[p.officer].filed++;
    if (p.verificationStatus === "Verified") map[p.officer].verified++;
    if (p.verificationStatus === "Escalated") map[p.officer].escalated++;
    if (p.sladays) { map[p.officer].totalSla += p.sladays; map[p.officer].slaCount++; }
  });
  return Object.entries(map).map(([officer, s]) => ({
    officer,
    filed:    s.filed,
    verified: s.verified,
    escalated:s.escalated,
    avgSla:   s.slaCount ? Math.round(s.totalSla / s.slaCount) : null,
  }));
}

const VER_CONFIG = {
  Verified:         { dot: "#059669", label: "Verified",        cls: "text-emerald-600" },
  "Awaiting Repair":{ dot: "#94a3b8", label: "Awaiting Repair", cls: "text-slate-500"   },
  Escalated:        { dot: "#1e3a8a", label: "Escalated",       cls: "text-[#1e3a8a]" },
};

function StatusDot({ status }) {
  const cfg = VER_CONFIG[status] || { dot: "#94a3b8", label: status, cls: "text-gray-400" };
  return (
    <span className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.cls}`}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

const TIMELINE_STEPS = [
  { step: "Detection",         desc: "CV model flags anomaly from drone/satellite/dashcam",  icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.8"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { step: "Severity Score",    desc: "Depth + diameter + traffic → score computed (0–10)",   icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="1.8"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { step: "Geo-tagging",       desc: "GPS coordinates extracted and cluster-deduped",        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="1.8"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { step: "Auto-Filing",       desc: "Grievance dispatched via PG Portal API (automated)",  icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { step: "Post-Repair Scan",  desc: "Same location re-scanned after SLA window",           icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { step: "Verification",      desc: "Repair confirmed or complaint re-escalated",          icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];

export default function ResolutionPage() {
  const [expandId, setExpandId] = useState(null);
  const { potholes: POTHOLES, loading } = usePotholeList({ limit: 200 });
  const officerStats = buildOfficerStats(POTHOLES);

  const filedPotholes = POTHOLES.filter(
    (p) => p.filingStatus === "Filed" || p.filingStatus === "File"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Resolution Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">
          End-to-end loop closure: auto-filing → repair verification → re-escalation if unresolved.
        </p>
      </div>

      {/* Lifecycle pipeline */}
      <div className="netra-panel p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-5">Automated Resolution Pipeline</h2>
        <div className="flex items-start justify-between min-w-[500px] gap-2 overflow-x-auto pb-4">
          {TIMELINE_STEPS.map((s, i) => (
            <div key={s.step} className="flex items-start gap-2 flex-1">
              <div className="flex flex-col items-center flex-shrink-0 w-24">
                <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-blue-200 flex items-center justify-center text-lg z-10 shrink-0">
                  {s.icon}
                </div>
                <div className="text-center mt-2">
                  <p className="text-[11px] font-bold text-blue-900">{s.step}</p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{s.desc}</p>
                </div>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className="flex-1 h-px bg-gradient-to-r from-blue-300 to-blue-100 mx-1 mt-5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Per-complaint resolution tracker */}
      <div className="netra-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700">Active Complaints — Resolution Status</h2>
          <p className="text-[11px] text-slate-500">{filedPotholes.length} complaints filed via PG Portal API</p>
        </div>
        <div className="divide-y divide-slate-200">
          {filedPotholes.map((p) => (
            <div key={p.id}>
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                onClick={() => setExpandId(expandId === p.id ? null : p.id)}
              >
                {/* Status dot */}
                <ProgressOrb status={p.verificationStatus} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-900">{p.id}</span>
                    {p.grievanceId && (
                      <span className="text-[10px] text-slate-400">· {p.grievanceId}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{p.location}</p>
                </div>

                {/* SLA progress */}
                <div className="hidden md:flex flex-col items-end gap-1 w-28 flex-shrink-0">
                  <StatusDot status={p.verificationStatus} />
                  {p.sladays != null && (
                    <span className="text-[10px] text-slate-400">SLA: {p.sladays}d elapsed</span>
                  )}
                </div>

                {/* Severity badge */}
                <SevBadgeSmall sev={p.severity} />

                {/* Expand chevron */}
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${expandId === p.id ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded detail */}
              {expandId === p.id && (
                <div className="px-6 pb-5 bg-slate-50 border-t border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                    <DetailField label="Officer / Zone" value={p.officer} />
                    <DetailField label="Detection Source" value={p.source} />
                    <DetailField label="GPS"         value={`${p.lat.toFixed(4)}°N, ${p.lng.toFixed(4)}°E`} />
                    <DetailField label="Filed At"    value={p.filedAt ? new Date(p.filedAt).toLocaleString("en-IN") : "—"} />
                    <DetailField label="Depth"       value={p.severity === "REPAIRED" ? "—" : `${p.depth} cm`} />
                    <DetailField label="Diameter"    value={p.severity === "REPAIRED" ? "—" : `${p.diameter} cm`} />
                    <DetailField label="Severity Score" value={p.score > 0 ? `${p.score}/10` : "—"} highlight />
                    <DetailField label="SLA Days"    value={p.sladays != null ? `${p.sladays} days` : "Pending"} />
                  </div>
                  {/* Loop-closure action */}
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {p.verificationStatus === "Awaiting Repair" && (
                      <ActionChip label="Trigger re-scan (72h window)" color="amber" />
                    )}
                    {p.verificationStatus === "Verified" && (
                      <ActionChip label="Loop closed — archived" color="green" disabled />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Officer performance bar chart */}
      <div className="netra-panel p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-1">Officer / Zone — Resolution Performance</h2>
        <p className="text-[11px] text-slate-500 mb-5">Filed vs Verified complaints by PWD zone</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={officerStats} margin={{ top: 0, right: 10, left: -20, bottom: 60 }}>
            <XAxis
              dataKey="officer"
              tick={{ fill: "#64748b", fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#475569" }}
            />
            <Bar dataKey="filed"    name="Filed"    radius={[3,3,0,0]} fill="#1e3a8a" />
            <Bar dataKey="verified" name="Verified" radius={[3,3,0,0]} fill="#059669" />
            <Bar dataKey="escalated"name="Escalated"radius={[3,3,0,0]} fill="#1e3a8a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function ProgressOrb({ status }) {
  const cfg = {
    Verified:         { color: "#10b981", glow: "#10b98144" },
    "Awaiting Repair":{ color: "#94a3b8", glow: "#94a3b822" },
    Escalated:        { color: "#a855f7", glow: "#a855f744" },
  }[status] || { color: "#94a3b8", glow: "#94a3b822" };
  return (
    <div
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.glow}` }}
    />
  );
}

function SevBadgeSmall({ sev }) {
  const cfg = {
    HIGH:     "bg-red-50 text-red-600 border-red-200",
    MEDIUM:   "bg-amber-50 text-amber-600 border-amber-200",
    LOW:      "bg-blue-50 text-blue-600 border-blue-200",
    REPAIRED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  }[sev] || "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`border px-2 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0 ${cfg}`}>
      {sev}
    </span>
  );
}

function DetailField({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-xs font-semibold ${highlight ? "text-blue-900" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}

function ActionChip({ icon, label, color, disabled }) {
  const colorCls = {
    red:   "border-red-200 text-red-600   hover:bg-red-50",
    amber: "border-amber-200 text-amber-600 hover:bg-amber-50",
    green: "border-emerald-200 text-emerald-600 cursor-default opacity-60",
    cyan:  "border-blue-200 text-blue-900  hover:bg-blue-50",
  }[color] || "border-slate-200 text-slate-500";
  return (
    <button
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${colorCls}`}
    >
      <span>{icon}</span>{label}
    </button>
  );
}
