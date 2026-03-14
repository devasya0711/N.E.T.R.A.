import { useState, useMemo } from "react";
import { usePotholeList } from "../hooks/usePotholes";

export default function RepairVerificationPage() {
  const { potholes, loading } = usePotholeList({ limit: 200 });
  const [closedIds, setClosedIds] = useState(new Set());
  const [filter, setFilter] = useState("all");

  const verifiable = useMemo(() => {
    const items = potholes
      .filter((p) => p.status === "In Progress" || p.status === "Fixed" || p.status === "Escalated")
      .map((p) => {
        const elapsed = p.filedAt ? Math.floor((Date.now() - new Date(p.filedAt).getTime()) / 86400000) : 0;
        const slaBreached = elapsed > (p.sladays || 7);
        return { ...p, elapsed, slaBreached, closed: closedIds.has(p.id) };
      });
    if (filter === "all") return items;
    if (filter === "overdue") return items.filter((p) => p.slaBreached && !p.closed);
    if (filter === "closed") return items.filter((p) => p.closed || p.status === "Fixed");
    if (filter === "pending") return items.filter((p) => !p.closed && p.status !== "Fixed");
    return items;
  }, [potholes, closedIds, filter]);

  const overdueCount = verifiable.filter((p) => p.slaBreached && !p.closed).length;

  const handleClose = (id) => setClosedIds((prev) => new Set([...prev, id]));

  if (loading) return <div className="text-center py-12 text-slate-500">Loading repair verification data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Repair Verification</h1>
        <p className="text-xs text-slate-500 mt-1">
          Contractors upload timestamped "after" photos to officially close out active incident tickets · SLA tracking with visual flags
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Active</p><p className="text-3xl font-black text-blue-900 mt-1">{verifiable.length}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">SLA Overdue</p><p className="text-3xl font-black text-red-600 mt-1">{overdueCount}</p><p className="text-[10px] text-red-400 mt-0.5">{overdueCount > 0 ? "⚠ Requires immediate attention" : "All within SLA"}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Verified Closed</p><p className="text-3xl font-black text-emerald-600 mt-1">{closedIds.size}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Awaiting Photos</p><p className="text-3xl font-black text-amber-600 mt-1">{verifiable.filter((p) => !p.closed && p.status !== "Fixed").length}</p></div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        {["all", "pending", "overdue", "closed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${filter === f ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {verifiable.map((p) => {
          const isClosed = p.closed || p.status === "Fixed";
          return (
            <div key={p.id} className={`netra-panel p-5 ${p.slaBreached && !isClosed ? "ring-1 ring-red-300" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isClosed ? "bg-emerald-500" : p.slaBreached ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
                  <span className="text-sm font-bold text-blue-900 font-mono">{p.id}</span>
                  {p.slaBreached && !isClosed && (
                    <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">SLA BREACHED</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{p.elapsed}d / {p.sladays || 7}d SLA</span>
                  {!isClosed ? (
                    <button onClick={() => handleClose(p.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                      ✓ Close Ticket
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">CLOSED</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div><span className="text-[10px] text-slate-400 uppercase block">Location</span><span className="text-slate-700 font-medium">{p.location || "—"}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase block">Severity</span><span className={`font-bold ${p.score >= 7.5 ? "text-red-600" : p.score >= 4 ? "text-amber-600" : "text-blue-600"}`}>{p.severity} ({p.score}/10)</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase block">Officer</span><span className="text-slate-700">{p.officer}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase block">Source</span><span className="text-slate-600">{p.source}</span></div>
                <div><span className="text-[10px] text-slate-400 uppercase block">CPGRAMS ID</span><span className="text-blue-700 font-mono font-bold">{p.grievanceId || "N/A"}</span></div>
              </div>

              {/* SLA progress bar */}
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (p.elapsed / (p.sladays || 7)) * 100)}%`,
                      background: p.slaBreached ? "#ef4444" : p.elapsed / (p.sladays || 7) > 0.7 ? "#f59e0b" : "#059669",
                    }}
                  />
                </div>
              </div>

              {/* Mock photo upload area */}
              {!isClosed && (
                <div className="mt-3 rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-blue-300 transition-colors cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" className="w-6 h-6 mx-auto mb-1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="text-[11px] text-slate-400">Drop repair photo here (timestamped)</p>
                </div>
              )}
            </div>
          );
        })}
        {verifiable.length === 0 && (
          <div className="netra-panel p-12 text-center text-slate-400 text-sm">No active incidents for verification.</div>
        )}
      </div>
    </div>
  );
}
