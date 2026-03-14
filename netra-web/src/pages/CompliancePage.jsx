import { useMemo, useCallback } from "react";
import { useStats, useTrends, usePotholeList } from "../hooks/usePotholes";

export default function CompliancePage() {
  const { data: stats, loading: statsLoading } = useStats();
  const { data: trends, loading: trendsLoading } = useTrends();
  const { potholes, loading: potholesLoading } = usePotholeList({ limit: 200 });

  const loading = statsLoading || trendsLoading || potholesLoading;

  const metrics = useMemo(() => {
    if (!stats) return null;
    const slaCompliant = potholes.filter((p) => {
      if (p.status === "Fixed") return true;
      const elapsed = p.filedAt ? Math.floor((Date.now() - new Date(p.filedAt).getTime()) / 86400000) : 0;
      return elapsed <= (p.sladays || 7);
    }).length;
    const slaRate = potholes.length ? Math.round((slaCompliant / potholes.length) * 100) : 0;
    return { ...stats, slaRate, slaCompliant, totalPotholes: potholes.length };
  }, [stats, potholes]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Pothole ID","Location","Severity","Score","Depth (cm)","Diameter (cm)","Status","SLA Days","Officer","Detection Source","Filed At"];
    const rows = potholes.map((p) => [
      p.id, p.location || "", p.severity, p.score, p.depth || 0, p.diameter || 0, p.status,
      p.sladays || "", p.officer || "", p.source || "", p.filedAt || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `netra-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }, [potholes]);

  const handleExportPDF = useCallback(() => {
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>N.E.T.R.A. Compliance Report</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 24px; }
  .header { border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #1e3a8a; letter-spacing: 2px; }
  .header p { font-size: 11px; color: #64748b; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; color: #1e3a8a; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .kpi { background: #faf8f5; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi .value { font-size: 24px; font-weight: 900; color: #1e3a8a; }
  .kpi .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1e3a8a; color: #fff; padding: 8px 6px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9px; }
  td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #faf8f5; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <h1>N.E.T.R.A. COMPLIANCE REPORT</h1>
  <p>Networked Edge Tracking For Road Anomalies · CHiPS · NHAI</p>
  <p>Report Generated: ${date}</p>
</div>
<div class="section">
  <h2>Executive Summary</h2>
  <div class="grid">
    <div class="kpi"><div class="value">${metrics?.totalDetected || 0}</div><div class="label">Total Detected</div></div>
    <div class="kpi"><div class="value">${metrics?.repaired || 0}</div><div class="label">Repaired</div></div>
    <div class="kpi"><div class="value">${metrics?.escalated || 0}</div><div class="label">Escalated</div></div>
    <div class="kpi"><div class="value">${metrics?.slaRate || 0}%</div><div class="label">SLA Compliance</div></div>
  </div>
</div>
<div class="section">
  <h2>Monthly Trend</h2>
  <table>
    <thead><tr><th>Month</th><th>Detected</th><th>Repaired</th><th>Escalated</th></tr></thead>
    <tbody>${(trends || []).map((t) => `<tr><td>${t.month}</td><td>${t.detected}</td><td>${t.repaired}</td><td>${t.escalated}</td></tr>`).join("")}</tbody>
  </table>
</div>
<div class="section">
  <h2>Pothole Inventory (Top 50)</h2>
  <table>
    <thead><tr><th>ID</th><th>Location</th><th>Severity</th><th>Score</th><th>Status</th><th>SLA</th><th>Officer</th></tr></thead>
    <tbody>${potholes.slice(0, 50).map((p) => `<tr><td>${p.id}</td><td>${p.location || "—"}</td><td>${p.severity}</td><td>${p.score}/10</td><td>${p.status}</td><td>${p.sladays || "—"}d</td><td>${p.officer || "—"}</td></tr>`).join("")}</tbody>
  </table>
</div>
<div class="footer"><span>N.E.T.R.A. Autonomous Pothole Intelligence System</span><span>Confidential — For Official Use Only</span></div>
<script>window.print();<\/script>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html); w.document.close();
  }, [metrics, trends, potholes]);

  if (loading) return <div className="text-center py-12 text-slate-500">Loading compliance data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Automated Compliance Reporting</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate instant PDF or CSV exports of repair metrics for state-level or CHIPS stakeholder meetings
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="px-4 py-2 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export CSV
          </button>
          <button onClick={handleExportPDF} className="px-4 py-2 rounded-lg text-[11px] font-bold bg-blue-900 text-white hover:bg-blue-800 transition-colors flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            Generate PDF Report
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Detected</p>
          <p className="text-3xl font-black text-blue-900 mt-1">{metrics?.totalDetected || 0}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Verified Repaired</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{metrics?.repaired || 0}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Escalated</p>
          <p className="text-3xl font-black text-red-600 mt-1">{metrics?.escalated || 0}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">SLA Compliance Rate</p>
          <p className="text-3xl font-black mt-1" style={{ color: metrics?.slaRate >= 80 ? "#059669" : metrics?.slaRate >= 60 ? "#f59e0b" : "#ef4444" }}>
            {metrics?.slaRate || 0}%
          </p>
        </div>
      </div>

      {/* Trend table */}
      <div className="netra-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-700">Monthly Detection · Repair · Escalation Trend</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Month</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Detected</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Repaired</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Escalated</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Repair Rate</th>
            </tr>
          </thead>
          <tbody>
            {(trends || []).map((t) => {
              const rate = t.detected > 0 ? Math.round((t.repaired / t.detected) * 100) : 0;
              return (
                <tr key={t.month} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{t.month}</td>
                  <td className="px-4 py-3 text-xs text-blue-900 font-bold">{t.detected}</td>
                  <td className="px-4 py-3 text-xs text-emerald-600 font-bold">{t.repaired}</td>
                  <td className="px-4 py-3 text-xs text-red-600 font-bold">{t.escalated}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[100px]">
                        <div className="h-full rounded-full" style={{ width: `${rate}%`, background: rate >= 70 ? "#059669" : rate >= 40 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Severity breakdown */}
      <div className="netra-panel p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Severity Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          {(metrics?.severityDist || []).map((s) => (
            <div key={s.name} className="rounded-xl p-4 text-center border" style={{ borderColor: s.fill + "33", background: s.fill + "0a" }}>
              <p className="text-2xl font-black" style={{ color: s.fill }}>{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
