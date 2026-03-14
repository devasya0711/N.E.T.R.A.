import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  ArrowUpDown,
  MapPin,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Download,
  RefreshCw,
} from "lucide-react";
import { useComplaints } from "../context/ComplaintContext";
import { usePotholeList } from "../hooks/usePotholes";

// ─── Map API pothole → complaint row shape ────────────────────────────────────
function toComplaint(p) {
  const statusMap = { "Fixed": "Fixed", "Escalated": "Escalated", "In Progress": "In Progress" };
  const status = statusMap[p.status] || "Submitted";
  const severity = p.severity || (p.score >= 7.5 ? "HIGH" : p.score >= 4 ? "MEDIUM" : "LOW");
  return {
    id: p.id,
    highway: p.location || "",
    location: p.location || "",
    gps: `${p.lat?.toFixed(4) || 0}\u00B0 N, ${p.lng?.toFixed(4) || 0}\u00B0 E`,
    depth: p.depth || 0,
    severity,
    dateDetected: p.filedAt ? new Date(p.filedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    status,
    officer: p.officer || "Unassigned",
    slaDays: p.sladays || 7,
    daysElapsed: p.filedAt ? Math.floor((Date.now() - new Date(p.filedAt).getTime()) / 86400000) : 0,
  };
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Submitted: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    icon: <FileText size={11} />,
    pulse: false,
  },
  "In Progress": {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: <Clock size={11} />,
    pulse: false,
  },
  Fixed: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    icon: <CheckCircle2 size={11} />,
    pulse: false,
  },
  Escalated: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: <AlertTriangle size={11} />,
    pulse: true,
  },
};

const SEVERITY_COLOR = {
  HIGH: { text: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  MEDIUM: { text: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  LOW: { text: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
};

const TABS = ["All", "Submitted", "In Progress", "Fixed", "Escalated"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cfg.pulse ? "animate-pulse" : ""}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon}
      {status}
    </span>
  );
}

// ─── Summary KPI cards ────────────────────────────────────────────────────────
function KpiRow({ data }) {
  const counts = TABS.slice(1).reduce((acc, s) => {
    acc[s] = data.filter((c) => c.status === s).length;
    return acc;
  }, {});
  const kpis = [
    { label: "Total", value: data.length, color: "#1e3a8a" },
    { label: "Submitted", value: counts["Submitted"], color: "#3b82f6" },
    { label: "In Progress", value: counts["In Progress"], color: "#f59e0b" },
    { label: "Fixed", value: counts["Fixed"], color: "#10b981" },
    { label: "Escalated", value: counts["Escalated"], color: "#ef4444" },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-xl p-4 text-center bg-white border border-slate-200 shadow-sm"
        >
          <p className="text-2xl font-black" style={{ color: k.color }}>
            {k.value}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            {k.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function TableRow({ c, index }) {
  const sev = SEVERITY_COLOR[c.severity] || { text: "#10b981", bg: "rgba(16,185,129,0.1)" };
  const overSla = c.daysElapsed > c.slaDays;

  return (
    <tr
      className="group transition-colors duration-150 hover:bg-slate-50 border-b border-slate-100"
    >
      {/* ID */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-xs font-mono text-blue-900">{c.id}</span>
      </td>

      {/* Highway + Location */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col">
          <span className="text-xs font-mono font-extrabold text-blue-900">{c.highway}</span>
          {c.location && c.location !== c.highway && (
            <span className="text-[11px] font-mono text-blue-900/60 mt-0.5 max-w-[200px] truncate">{c.location}</span>
          )}
        </div>
      </td>

      {/* GPS */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <MapPin size={10} className="text-blue-600 shrink-0" />
          {c.gps}
        </div>
      </td>

      {/* Severity */}
      <td className="px-4 py-3.5">
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ color: sev.text, background: sev.bg }}
        >
          {c.severity}
        </span>
      </td>

      {/* Date Detected */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <CalendarDays size={11} className="text-slate-400 shrink-0" />
          {new Date(c.dateDetected).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      </td>

      {/* SLA */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span
          className={`text-xs font-bold ${overSla ? "text-red-600" : "text-slate-500"}`}
        >
          {c.daysElapsed}/{c.slaDays}d
          {overSla && <span className="text-[10px] ml-1 text-red-500">OVER</span>}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={c.status} />
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ComplaintTracker() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("dateDetected");
  const [sortAsc, setSortAsc] = useState(false);
  const { citizenComplaints } = useComplaints();
  const { potholes: apiPotholes, loading } = usePotholeList({ limit: 200 });

  const allComplaints = useMemo(
    () => [...citizenComplaints, ...apiPotholes.map(toComplaint)],
    [citizenComplaints, apiPotholes]
  );

  const handleSort = (field) => {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let rows = allComplaints;
    if (activeTab !== "All") rows = rows.filter((c) => c.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.highway.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.officer.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return rows;
  }, [activeTab, search, sortField, sortAsc, allComplaints]);

  const SortHeader = ({ label, field }) => (
    <th
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none
      text-slate-500 hover:text-blue-900 transition-colors duration-150 whitespace-nowrap group"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          size={10}
          className={`transition-colors ${sortField === field ? "text-blue-900" : "text-slate-300 group-hover:text-slate-500"}`}
        />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">

      {/* ── Section header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Complaint Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Auto-filed grievances via PG Portal API · Real-time status monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-500
            hover:text-blue-900 hover:bg-blue-50 border border-slate-200 transition-all duration-200">
            <RefreshCw size={12} />
            Sync PG Portal
          </button>
          <button
            onClick={() => {
              const headers = ["Complaint ID","Highway","Location","GPS Latitude","GPS Longitude","Severity","Date Detected","SLA Days","Days Elapsed","Status","Officer"];
              const rows = allComplaints.map((c) => {
                const gpsClean = (c.gps || "").replace(/[°NSEW\s]/g, "");
                const [lat, lng] = gpsClean.split(",").map((s) => s.trim());
                return [
                  c.id,
                  c.highway,
                  c.location,
                  lat || "",
                  lng || "",
                  c.severity,
                  c.dateDetected,
                  c.slaDays,
                  c.daysElapsed,
                  c.status,
                  c.officer,
                ];
              });
              const sevColor = { HIGH: "#dc2626", MEDIUM: "#d97706", LOW: "#2563eb" };
              const statusColor = { Submitted: "#3b82f6", "In Progress": "#f59e0b", Fixed: "#10b981", Escalated: "#ef4444" };
              const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>N.E.T.R.A. Complaint Report</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; }
  .header h1 { font-size: 20px; color: #1e3a8a; letter-spacing: 2px; }
  .header p { font-size: 11px; color: #64748b; }
  .meta { font-size: 10px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1e3a8a; color: #fff; padding: 8px 6px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9px; }
  td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #faf8f5; }
  tr:hover { background: #f1f5f9; }
  .sev { display: inline-block; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 9px; color: #fff; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 9px; }
  .over { color: #dc2626; font-weight: 700; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  @media print { body { padding: 0; } tr:hover { background: inherit; } }
</style></head><body>
<div class="header">
  <div><h1>N.E.T.R.A.</h1><p>Networked Edge Tracking For Road Anomalies</p></div>
  <div style="text-align:right"><p>Complaint Report</p><p>Generated: ${date}</p></div>
</div>
<div class="meta">Total Records: ${rows.length} &nbsp;|&nbsp; High: ${rows.filter(r=>r[5]==="HIGH").length} &nbsp;|&nbsp; Medium: ${rows.filter(r=>r[5]==="MEDIUM").length} &nbsp;|&nbsp; Low: ${rows.filter(r=>r[5]==="LOW").length} &nbsp;|&nbsp; Escalated: ${rows.filter(r=>r[9]==="Escalated").length} &nbsp;|&nbsp; Fixed: ${rows.filter(r=>r[9]==="Fixed").length}</div>
<table>
<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r, i) => {
                const overSla = Number(r[8]) > Number(r[7]);
                return `<tr>
  <td style="font-weight:600;font-family:monospace">${r[0]}</td>
  <td>${r[1]}</td>
  <td>${r[2]}</td>
  <td style="font-family:monospace">${r[3]}</td>
  <td style="font-family:monospace">${r[4]}</td>
  <td><span class="sev" style="background:${sevColor[r[5]] || "#94a3b8"}">${r[5]}</span></td>
  <td>${r[6]}</td>
  <td>${r[7]}</td>
  <td class="${overSla ? "over" : ""}">${r[8]}${overSla ? " OVER" : ""}</td>
  <td><span class="status" style="background:${statusColor[r[9]] || "#94a3b8"}20;color:${statusColor[r[9]] || "#94a3b8"}">${r[9]}</span></td>
  <td>${r[10]}</td>
</tr>`;}).join("")}</tbody>
</table>
<div class="footer"><span>N.E.T.R.A. Autonomous Pothole Intelligence System</span><span>Confidential - For Official Use Only</span></div>
<script>window.print();<\/script>
</body></html>`;
              const w = window.open("", "_blank");
              w.document.write(html);
              w.document.close();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-500
            hover:text-blue-900 hover:bg-blue-50 border border-slate-200 transition-all duration-200">
            <Download size={12} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── KPI summary row ── */}
      <KpiRow data={allComplaints} />

      {/* ── Filter / Search bar ── */}
      <div
        className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm"
      >

        {/* Tab bar */}
        <div className="flex items-end gap-0 px-4 pt-4 border-b border-slate-200">
          {TABS.map((tab) => {
            const cfg = STATUS_CONFIG[tab];
            const count = tab === "All"
              ? allComplaints.length
              : allComplaints.filter((c) => c.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all duration-200
                  border-b-2 -mb-px
                  ${activeTab === tab
                    ? "text-blue-900 border-blue-900"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                  }`}
              >
                {tab === "Escalated" && activeTab !== "Escalated" && count > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
                {cfg && activeTab === tab && (
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                )}
                {tab}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by complaint ID, highway, location or officer..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs text-slate-700 placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all duration-200 bg-slate-50 border border-slate-200"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <SortHeader label="Complaint ID" field="id" />
                <SortHeader label="Highway / Location" field="highway" />
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">GPS</th>
                <SortHeader label="Severity" field="severity" />
                <SortHeader label="Date Detected" field="dateDetected" />
                <SortHeader label="SLA (Days)" field="daysElapsed" />
                <SortHeader label="Status" field="status" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 text-sm">
                    <Filter size={32} className="mx-auto mb-3 opacity-30" />
                    No complaints match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => <TableRow key={c.id} c={c} index={i} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Showing <span className="text-slate-700 font-semibold">{filtered.length}</span> of{" "}
            <span className="text-slate-700 font-semibold">{allComplaints.length}</span> complaints
          </span>
          <span className="text-[11px] text-slate-500">
            Auto-synced from PG Portal · Last sync:{" "}
            <span className="text-blue-700 font-mono">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
