import { useMemo } from "react";
import { useComplaints } from "../context/ComplaintContext";
import { usePotholeList, useStats } from "../hooks/usePotholes";
import { Link } from "react-router-dom";

export default function CitizenDashboardPage() {
  const { citizenComplaints } = useComplaints();
  const { potholes: apiPotholes } = usePotholeList({ limit: 50 });
  const { data: stats } = useStats();
  const myReports = citizenComplaints;

  const recentFixed = useMemo(() => apiPotholes.filter((p) => p.status === "Fixed").slice(0, 5), [apiPotholes]);

  const statusCounts = useMemo(() => {
    const counts = { Submitted: 0, "In Progress": 0, Fixed: 0, Escalated: 0 };
    myReports.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });
    return counts;
  }, [myReports]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Welcome, Citizen</h1>
        <p className="text-xs text-slate-500 mt-1">
          Your N.E.T.R.A. dashboard — report road damage, track complaints, and stay informed
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/dashboard/citizen"
          className="netra-panel p-6 flex items-center gap-4 hover:shadow-md transition-all group cursor-pointer"
          style={{ borderColor: "rgba(30,58,138,0.2)" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.8" className="w-7 h-7">
              <line x1="22" y1="2" x2="11" y2="13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Report Road Damage</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload photos and GPS coordinates for AI processing</p>
          </div>
        </Link>

        <Link
          to="/dashboard/my-reports"
          className="netra-panel p-6 flex items-center gap-4 hover:shadow-md transition-all group cursor-pointer"
          style={{ borderColor: "rgba(5,150,105,0.2)" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" className="w-7 h-7">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">View My Reports</p>
            <p className="text-xs text-slate-500 mt-0.5">Track the status of your submitted complaints</p>
          </div>
        </Link>
      </div>

      {/* My report stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">My Reports</p>
          <p className="text-3xl font-black text-blue-900 mt-1">{myReports.length}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">In Progress</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{statusCounts["In Progress"]}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Resolved</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{statusCounts.Fixed}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Pending</p>
          <p className="text-3xl font-black text-slate-600 mt-1">{statusCounts.Submitted}</p>
        </div>
      </div>

      {/* Recent reports */}
      {myReports.length > 0 && (
        <div className="netra-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Recent Submissions</p>
            <Link to="/dashboard/my-reports" className="text-[11px] font-semibold text-blue-700 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-slate-200">
            {myReports.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  r.status === "Fixed" ? "bg-emerald-500" : r.status === "Escalated" ? "bg-red-500" : r.status === "In Progress" ? "bg-amber-400" : "bg-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-blue-900 font-mono">{r.id}</span>
                  <p className="text-[11px] text-slate-500 truncate">{r.highway || r.location}</p>
                </div>
                <span className={`text-[10px] font-bold ${
                  r.status === "Fixed" ? "text-emerald-600" : r.status === "Escalated" ? "text-red-500" : r.status === "In Progress" ? "text-amber-600" : "text-blue-600"
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System-wide info */}
      <div className="netra-panel p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">City-wide Road Health</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-blue-900">{stats?.totalDetected || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Potholes Detected</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{stats?.repaired || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Repaired</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">{stats?.openComplaints || 0}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Open Complaints</p>
          </div>
        </div>
      </div>

      {/* Recent repairs - Automated updates */}
      {recentFixed.length > 0 && (
        <div className="netra-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <p className="text-sm font-bold text-slate-700">🔔 Recent Repairs Completed</p>
            <p className="text-[11px] text-slate-500">Automated notifications for nearby repairs</p>
          </div>
          <div className="divide-y divide-slate-200">
            {recentFixed.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-emerald-50/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-700">{p.location || p.id}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">✓ REPAIRED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
