import { useState, useMemo } from "react";
import { usePotholeList } from "../hooks/usePotholes";

const SEV_COLORS = {
  HIGH: { text: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  MEDIUM: { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  LOW: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  REPAIRED: { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

export default function TriagePage() {
  const { potholes, loading } = usePotholeList({ limit: 200 });
  const [sortBy, setSortBy] = useState("composite");

  const triaged = useMemo(() => {
    const active = potholes.filter((p) => p.severity !== "REPAIRED" && p.status !== "Fixed");
    const scored = active.map((p) => {
      const sevWeight = p.score >= 7.5 ? 1 : p.score >= 4 ? 0.6 : 0.3;
      const depthWeight = Math.min(1, (p.depth || 0) / 20);
      const trafficWeight = Math.min(1, (p.dangerIndex || 0) / 100);
      const composite = Math.round((sevWeight * 40 + depthWeight * 35 + trafficWeight * 25));
      return { ...p, composite, sevWeight, depthWeight, trafficWeight };
    });

    if (sortBy === "composite") scored.sort((a, b) => b.composite - a.composite);
    else if (sortBy === "depth") scored.sort((a, b) => (b.depth || 0) - (a.depth || 0));
    else if (sortBy === "severity") scored.sort((a, b) => b.score - a.score);
    else if (sortBy === "danger") scored.sort((a, b) => (b.dangerIndex || 0) - (a.dangerIndex || 0));

    return scored;
  }, [potholes, sortBy]);

  const criticalCount = triaged.filter((p) => p.composite >= 70).length;
  const highCount = triaged.filter((p) => p.composite >= 50 && p.composite < 70).length;

  if (loading) return <div className="text-center py-12 text-slate-500">Loading triage data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Severity Triage System</h1>
        <p className="text-xs text-slate-500 mt-1">
          Rank verified incidents by size and depth estimations to prioritize critical repairs on high-traffic roads
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Active Incidents</p><p className="text-3xl font-black text-blue-900 mt-1">{triaged.length}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Critical Priority</p><p className="text-3xl font-black text-red-600 mt-1">{criticalCount}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">High Priority</p><p className="text-3xl font-black text-amber-600 mt-1">{highCount}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Avg Triage Score</p><p className="text-3xl font-black text-slate-700 mt-1">{triaged.length ? Math.round(triaged.reduce((s,p) => s+p.composite, 0) / triaged.length) : 0}</p></div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 font-semibold">Sort by:</span>
        {[
          { key: "composite", label: "Priority Score" },
          { key: "severity", label: "Severity" },
          { key: "depth", label: "Depth" },
          { key: "danger", label: "Danger Index" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              sortBy === s.key ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Triage list */}
      <div className="netra-panel overflow-hidden">
        <div className="divide-y divide-slate-200">
          {triaged.map((p, i) => {
            const sev = SEV_COLORS[p.severity] || SEV_COLORS.LOW;
            const priColor = p.composite >= 70 ? "bg-red-500" : p.composite >= 50 ? "bg-amber-500" : p.composite >= 30 ? "bg-blue-500" : "bg-slate-400";
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <span className="text-sm font-bold text-slate-400 w-8 text-right font-mono">#{i + 1}</span>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm ${priColor}`}>
                  {p.composite}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900 font-mono">{p.id}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${sev.text} ${sev.bg} ${sev.border}`}>{p.severity}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.location || "Unknown location"}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs text-center shrink-0">
                  <div><p className="text-[9px] text-slate-400 uppercase">Depth</p><p className="font-bold text-slate-700">{p.depth || 0}cm</p></div>
                  <div><p className="text-[9px] text-slate-400 uppercase">Diameter</p><p className="font-bold text-slate-700">{p.diameter || 0}cm</p></div>
                  <div><p className="text-[9px] text-slate-400 uppercase">Danger</p><p className="font-bold text-slate-700">{p.dangerIndex || 0}</p></div>
                </div>
                {/* Priority bar */}
                <div className="w-20 shrink-0">
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${priColor}`} style={{ width: `${p.composite}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
          {triaged.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">No active incidents to triage.</div>
          )}
        </div>
      </div>
    </div>
  );
}
