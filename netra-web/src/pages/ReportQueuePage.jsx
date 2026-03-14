import { useState, useMemo } from "react";
import { usePotholeList } from "../hooks/usePotholes";
import { useComplaints } from "../context/ComplaintContext";

// ── Mock trust scores ─────────────────────────────────────────────────────────
const MOCK_USERS = {
  "citizen-1": { name: "Ramesh K.", trustScore: 92, reports: 14, verified: 12 },
  "citizen-2": { name: "Priya M.", trustScore: 85, reports: 8, verified: 6 },
  "citizen-3": { name: "Sunil D.", trustScore: 65, reports: 5, verified: 2 },
  "citizen-4": { name: "Anita R.", trustScore: 45, reports: 3, verified: 0 },
  "citizen-5": { name: "Vijay S.", trustScore: 78, reports: 11, verified: 8 },
};

const USER_KEYS = Object.keys(MOCK_USERS);

export default function ReportQueuePage() {
  const { potholes: apiPotholes, loading } = usePotholeList({ limit: 200, detectionSource: "Citizen-Portal" });
  const { citizenComplaints } = useComplaints();
  const [filter, setFilter] = useState("pending");
  const [actions, setActions] = useState({});

  const reports = useMemo(() => {
    const citizenPotholes = apiPotholes.filter((p) => p.source === "Citizen-Portal");
    const allReports = [...citizenComplaints.map((c, i) => ({
      id: c.id,
      location: c.location || c.highway,
      gps: c.gps,
      severity: c.severity,
      date: c.dateDetected,
      description: c.location,
      userId: USER_KEYS[i % USER_KEYS.length],
    })), ...citizenPotholes.map((p, i) => ({
      id: p.id,
      location: p.location,
      gps: `${p.lat?.toFixed(4) || 0}°N, ${p.lng?.toFixed(4) || 0}°E`,
      severity: p.severity,
      date: p.filedAt ? new Date(p.filedAt).toISOString().split("T")[0] : "—",
      description: p.location,
      userId: USER_KEYS[(i + 2) % USER_KEYS.length],
    }))];

    return allReports;
  }, [apiPotholes, citizenComplaints]);

  const filtered = useMemo(() => {
    if (filter === "pending") return reports.filter((r) => !actions[r.id]);
    if (filter === "verified") return reports.filter((r) => actions[r.id] === "verified");
    if (filter === "rejected") return reports.filter((r) => actions[r.id] === "rejected");
    if (filter === "merged") return reports.filter((r) => actions[r.id] === "merged");
    return reports;
  }, [reports, actions, filter]);

  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((r) => !actions[r.id]).length,
    verified: reports.filter((r) => actions[r.id] === "verified").length,
    rejected: reports.filter((r) => actions[r.id] === "rejected").length,
    merged: reports.filter((r) => actions[r.id] === "merged").length,
  }), [reports, actions]);

  const handleAction = (id, action) => setActions((prev) => ({ ...prev, [id]: action }));

  if (loading) return <div className="text-center py-12 text-slate-500">Loading citizen reports...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Crowdsourced Report Queue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify, merge duplicate reports, or reject manual pothole submissions from the citizen portal · User trust scoring
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Reports", value: counts.all, color: "#1e3a8a" },
          { label: "Pending Review", value: counts.pending, color: "#f59e0b" },
          { label: "Verified", value: counts.verified, color: "#059669" },
          { label: "Rejected", value: counts.rejected, color: "#ef4444" },
          { label: "Merged", value: counts.merged, color: "#7c3aed" },
        ].map((k) => (
          <div key={k.label} className="netra-panel p-4 text-center">
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        {["pending", "verified", "rejected", "merged", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${filter === f ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Report list */}
      <div className="netra-panel overflow-hidden divide-y divide-slate-200">
        {filtered.map((report) => {
          const user = MOCK_USERS[report.userId] || { name: "Unknown", trustScore: 50, reports: 0, verified: 0 };
          const trustColor = user.trustScore >= 80 ? "text-emerald-600" : user.trustScore >= 60 ? "text-amber-600" : "text-red-500";
          const action = actions[report.id];
          const sevColor = report.severity === "HIGH" ? "text-red-600 bg-red-50 border-red-200" : report.severity === "MEDIUM" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-blue-600 bg-blue-50 border-blue-200";

          return (
            <div key={report.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              {/* Trust score avatar */}
              <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${user.trustScore >= 80 ? "bg-emerald-50 border-emerald-200" : user.trustScore >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"} border`}>
                  <span className={trustColor}>{user.trustScore}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 font-mono">{report.id}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${sevColor}`}>{report.severity}</span>
                  <span className="text-[10px] text-slate-400">by {user.name}</span>
                  <span className="text-[10px] text-slate-400">· {user.reports} reports, {user.verified} verified</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{report.location || "Unknown location"} · {report.gps}</p>
              </div>

              <span className="text-[10px] text-slate-400 shrink-0">{report.date}</span>

              {!action ? (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleAction(report.id, "verified")} className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    ✓ Verify
                  </button>
                  <button onClick={() => handleAction(report.id, "merged")} className="px-2.5 py-1 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                    ⊕ Merge
                  </button>
                  <button onClick={() => handleAction(report.id, "rejected")} className="px-2.5 py-1 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                    ✗ Reject
                  </button>
                </div>
              ) : (
                <span className={`text-[10px] font-bold uppercase shrink-0 ${
                  action === "verified" ? "text-emerald-600" : action === "rejected" ? "text-red-500" : "text-violet-600"
                }`}>
                  {action}
                </span>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">No reports match the current filter.</div>
        )}
      </div>
    </div>
  );
}
