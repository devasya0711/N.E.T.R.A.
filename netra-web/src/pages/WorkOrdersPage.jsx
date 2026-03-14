import { useMemo, useState } from "react";
import { usePotholeList } from "../hooks/usePotholes";

// ── Simple geo-clustering: group potholes within ~500m of each other ──────────
function clusterPotholes(potholes, maxDistKm = 0.5) {
  const used = new Set();
  const clusters = [];

  potholes.forEach((p, i) => {
    if (used.has(i) || p.severity === "REPAIRED" || p.status === "Fixed") return;
    const cluster = [p];
    used.add(i);

    potholes.forEach((q, j) => {
      if (used.has(j) || j === i || q.severity === "REPAIRED" || q.status === "Fixed") return;
      const dist = haversine(p.lat, p.lng, q.lat, q.lng);
      if (dist <= maxDistKm) {
        cluster.push(q);
        used.add(j);
      }
    });

    if (cluster.length > 0) {
      clusters.push({
        id: `WO-${String(clusters.length + 1).padStart(4, "0")}`,
        potholes: cluster,
        centroidLat: cluster.reduce((s, c) => s + c.lat, 0) / cluster.length,
        centroidLng: cluster.reduce((s, c) => s + c.lng, 0) / cluster.length,
        totalSeverity: cluster.reduce((s, c) => s + (c.score || 0), 0),
        avgSeverity: +(cluster.reduce((s, c) => s + (c.score || 0), 0) / cluster.length).toFixed(1),
        location: cluster[0]?.location || "Unknown area",
      });
    }
  });

  clusters.sort((a, b) => b.totalSeverity - a.totalSeverity);
  return clusters;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

  const MOCK_CONTRACTORS = [
    "CG Roadworks Pvt. Ltd.",
    "Raipur Highway Repairs",
    "National Infra Solutions",
    "Bilaspur Civil Works",
    "Korba Construction Co.",
    "Bhilai Infra Developers",
    "Durg Road Systems",
  ];

  export default function WorkOrdersPage() {
  const { potholes, loading } = usePotholeList({ limit: 200 });
  const [expandId, setExpandId] = useState(null);

  const clusters = useMemo(() => clusterPotholes(potholes), [potholes]);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading your assigned work orders...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Assigned Work Orders</h1>
        <p className="text-xs text-slate-500 mt-1">
          Your active repair assignments, grouped by proximity to optimize driving routes.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Active Orders</p><p className="text-3xl font-black text-blue-900 mt-1">{clusters.length}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Potholes</p><p className="text-3xl font-black text-slate-700 mt-1">{clusters.reduce((s,c) => s + c.potholes.length, 0)}</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Completed</p><p className="text-3xl font-black text-emerald-600 mt-1">0</p></div>
        <div className="netra-panel p-5"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Pending Repairs</p><p className="text-3xl font-black text-amber-600 mt-1">{clusters.length}</p></div>
      </div>

      {/* Work order cards */}
      <div className="space-y-4">
        {clusters.map((wo) => {
          const isExpanded = expandId === wo.id;
          const contractor = MOCK_CONTRACTORS[Math.floor(Math.abs(wo.centroidLat * 1000) % MOCK_CONTRACTORS.length)];
          const urgency = wo.avgSeverity >= 7 ? "CRITICAL" : wo.avgSeverity >= 4.5 ? "HIGH" : "NORMAL";
          const urgencyColor = urgency === "CRITICAL" ? "text-red-600 bg-red-50 border-red-200" : urgency === "HIGH" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-blue-600 bg-blue-50 border-blue-200";

          return (
            <div key={wo.id} className="netra-panel overflow-hidden">
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setExpandId(isExpanded ? null : wo.id)}
              >
                <div className="w-3 h-3 rounded-full shrink-0 bg-blue-500 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-900 font-mono">{wo.id}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${urgencyColor}`}>{urgency}</span>
                    <span className="text-[10px] text-slate-400">{wo.potholes.length} pothole{wo.potholes.length > 1 ? "s" : ""} · avg score {wo.avgSeverity}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{wo.location}</p>
                </div>
                <div className="text-right shrink-0 pr-4">
                  <p className="text-[10px] text-slate-400 uppercase">Assigned Contractor</p>
                  <p className="text-xs font-semibold text-slate-700">{contractor}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 bg-slate-50 border-t border-slate-200">
                  <div className="grid grid-cols-3 gap-3 mt-3 mb-4 text-xs">
                    <div><span className="text-[10px] text-slate-400 uppercase block">Centroid</span><span className="font-mono text-slate-700">{wo.centroidLat.toFixed(4)}°N, {wo.centroidLng.toFixed(4)}°E</span></div>
                    <div><span className="text-[10px] text-slate-400 uppercase block">Total Severity</span><span className="font-bold text-slate-700">{wo.totalSeverity.toFixed(1)}</span></div>
                    <div><span className="text-[10px] text-slate-400 uppercase block">Status</span><span className="font-bold text-blue-600">Pending Repair</span></div>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Included Potholes:</p>
                  <div className="space-y-1">
                    {wo.potholes.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div>
                          <span className="text-xs font-bold text-slate-700 font-mono">{p.id}</span>
                          <span className="text-[11px] text-slate-500 ml-2">{p.location || "—"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500">{p.depth || 0}cm deep</span>
                          <span className={`font-bold ${p.score >= 7.5 ? "text-red-600" : p.score >= 4 ? "text-amber-600" : "text-blue-600"}`}>{p.score}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          );
        })}
        {clusters.length === 0 && (
          <div className="netra-panel p-12 text-center text-slate-400 text-sm">You have no pending work orders.</div>
        )}
      </div>
    </div>
  );
}
