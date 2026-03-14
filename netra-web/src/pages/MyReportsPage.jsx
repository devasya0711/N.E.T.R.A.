import { useMemo } from "react";
import { useComplaints } from "../context/ComplaintContext";

const STATUS_STYLES = {
  Submitted:     { dot: "bg-blue-400", text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Submitted" },
  "In Progress": { dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "In Progress" },
  Fixed:         { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Repaired" },
  Escalated:     { dot: "bg-red-500 animate-pulse", text: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Escalated" },
};

const TIMELINE_STEPS = ["Submitted", "Under Review", "In Progress", "Repaired"];

function StatusTimeline({ status }) {
  const currentStep = status === "Fixed" ? 3 : status === "In Progress" ? 2 : status === "Escalated" ? 2 : 0;
  return (
    <div className="flex items-center gap-0 mt-3">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i <= currentStep;
        const active = i === currentStep;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                  done ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
                } ${active ? "ring-2 ring-blue-300 ring-offset-1" : ""}`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[8px] font-semibold whitespace-nowrap ${done ? "text-blue-900" : "text-slate-400"}`}>
                {step}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className="flex-1 h-px mx-1 mt-[-14px]" style={{ background: done ? "#1e3a8a" : "#e2e8f0" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MyReportsPage() {
  const { citizenComplaints } = useComplaints();

  const statusCounts = useMemo(() => {
    const counts = { Submitted: 0, "In Progress": 0, Fixed: 0, Escalated: 0 };
    citizenComplaints.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });
    return counts;
  }, [citizenComplaints]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">My Reports</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track the status of all your submitted road damage reports · Automated updates when repairs are completed
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-4 text-center"><p className="text-2xl font-black text-blue-900">{citizenComplaints.length}</p><p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Total</p></div>
        <div className="netra-panel p-4 text-center"><p className="text-2xl font-black text-blue-600">{statusCounts.Submitted}</p><p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Submitted</p></div>
        <div className="netra-panel p-4 text-center"><p className="text-2xl font-black text-amber-600">{statusCounts["In Progress"]}</p><p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">In Progress</p></div>
        <div className="netra-panel p-4 text-center"><p className="text-2xl font-black text-emerald-600">{statusCounts.Fixed}</p><p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Resolved</p></div>
      </div>

      {/* Report cards */}
      {citizenComplaints.length === 0 ? (
        <div className="netra-panel p-12 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-3 opacity-40">
            <line x1="22" y1="2" x2="11" y2="13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-slate-500 mb-1">No reports yet!</p>
          <p className="text-xs text-slate-400">Submit your first road damage report from the Citizen Portal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {citizenComplaints.map((report) => {
            const st = STATUS_STYLES[report.status] || STATUS_STYLES.Submitted;
            return (
              <div key={report.id} className="netra-panel p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                    <span className="text-sm font-bold text-blue-900 font-mono">{report.id}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${st.text} ${st.bg} ${st.border}`}>
                      {st.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{report.dateDetected}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-1">
                  <div><span className="text-[10px] text-slate-400 uppercase block">Location</span><span className="text-slate-700 font-medium">{report.highway || report.location}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase block">GPS</span><span className="text-slate-600 font-mono text-[11px]">{report.gps}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase block">Severity</span><span className={`font-bold ${report.severity === "HIGH" ? "text-red-600" : report.severity === "MEDIUM" ? "text-amber-600" : "text-blue-600"}`}>{report.severity}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase block">SLA</span><span className="text-slate-700">{report.daysElapsed || 0}d / {report.slaDays}d</span></div>
                </div>

                <StatusTimeline status={report.status} />

                {/* Notification badge for status changes */}
                {report.status === "Fixed" && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-600">🔔</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">Your report has been resolved! The pothole has been repaired.</span>
                  </div>
                )}
                {report.status === "In Progress" && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-blue-600">🔔</span>
                    <span className="text-[11px] text-blue-700 font-semibold">A repair crew has been assigned to your report.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
