import { useState, useMemo } from "react";
import { usePotholeList } from "../hooks/usePotholes";

// ─── Badge helpers ─────────────────────────────────────────────────────────
const SEV_BADGE = {
  HIGH:     { cls: "bg-red-50 text-red-600 border-red-200",         label: "HIGH"    },
  MEDIUM:   { cls: "bg-amber-50 text-amber-600 border-amber-200",   label: "MEDIUM"  },
  LOW:      { cls: "bg-blue-50 text-blue-600 border-blue-200",      label: "LOW"     },
  REPAIRED: { cls: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "REPAIRED" },
};
const FILE_BADGE = {
  Filed:   { cls: "bg-blue-50 text-blue-700 border-blue-200",        label: "Filed"   },
  Pending: { cls: "bg-slate-100 text-slate-500 border-slate-200",         label: "Pending" },
  File:    { cls: "bg-blue-50 text-blue-700 border-blue-200",         label: "Filed"   },
};
const VER_BADGE = {
  Verified:         { cls: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Verified" },
  "Awaiting Repair":{ cls: "bg-slate-100 text-slate-500 border-slate-200",           label: "Awaiting" },
  Escalated:        { cls: "bg-blue-50 text-[#1e3a8a] border-blue-200",    label: "Escalated" },
};

function Badge({ config, fallbackLabel }) {
  const c = config || { cls: "bg-slate-100 text-slate-500 border-slate-200", label: fallbackLabel };
  return (
    <span className={`border px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  if (score === 0) return <span className="text-slate-400 text-xs">—</span>;
  const pct = (score / 10) * 100;
  const color = score >= 7.5 ? "#ef4444" : score >= 4 ? "#f59e0b" : "#3b82f6";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score.toFixed(1)}</span>
    </div>
  );
}

// ─── Main Table ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

export default function PotholeTable() {
  const [search,  setSearch]  = useState("");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage]       = useState(1);
  const { potholes: POTHOLES, loading } = usePotholeList({ limit: 200 });

  const filtered = useMemo(() => {
    let rows = [...POTHOLES];

    // Search across id/location/grievanceId
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.grievanceId || "").toLowerCase().includes(q)
      );
    }

    // Severity filter
    if (sevFilter !== "ALL") rows = rows.filter((p) => p.severity === sevFilter);

    // Sort
    rows.sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [POTHOLES, search, sevFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <span className="opacity-20">↕</span>;
    return <span className="text-blue-900">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const thCls = "px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap cursor-pointer select-none hover:text-slate-700 transition-colors";
  const tdCls = "px-4 py-3 text-xs text-slate-600 align-middle";

  return (
    <div className="netra-panel overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center px-5 py-4 border-b border-slate-200">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-700">Pothole Lifecycle Database</h2>
          <p className="text-[11px] text-slate-500">{filtered.length} records · sorted by {sortKey}</p>
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search ID / location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-4 py-1.5 text-xs rounded-lg bg-white border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 w-52 transition-colors"
          />
        </div>
        {/* Severity filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "ALL",      active: "bg-slate-100 border-slate-400 text-slate-800",   idle: "border-slate-200 text-slate-500 hover:border-slate-400" },
            { key: "HIGH",     active: "bg-red-50 border-red-400 text-red-700",           idle: "border-slate-200 text-red-400 hover:border-red-300" },
            { key: "MEDIUM",   active: "bg-amber-50 border-amber-400 text-amber-700",     idle: "border-slate-200 text-amber-500 hover:border-amber-300" },
            { key: "LOW",      active: "bg-blue-50 border-blue-400 text-blue-700",        idle: "border-slate-200 text-blue-400 hover:border-blue-300" },
            { key: "REPAIRED", active: "bg-green-50 border-green-400 text-green-700",     idle: "border-slate-200 text-green-500 hover:border-green-300" },
          ].map(({ key, active, idle }) => (
            <button
              key={key}
              onClick={() => { setSevFilter(key); setPage(1); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all
                ${sevFilter === key ? active : idle}`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={thCls} onClick={() => toggleSort("id")}>Pothole ID <SortIcon col="id" /></th>
              <th className={thCls} onClick={() => toggleSort("source")}>Source <SortIcon col="source" /></th>
              <th className={thCls}>GPS Coordinates</th>
              <th className={thCls} onClick={() => toggleSort("score")}>Severity Score <SortIcon col="score" /></th>
              <th className={thCls} onClick={() => toggleSort("filingStatus")}>Filing Status <SortIcon col="filingStatus" /></th>
              <th className={thCls} onClick={() => toggleSort("verificationStatus")}>Verification <SortIcon col="verificationStatus" /></th>
              <th className={thCls}>Grievance ID</th>
              <th className={thCls} onClick={() => toggleSort("sladays")}>SLA (days) <SortIcon col="sladays" /></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                  No records match your filters.
                </td>
              </tr>
            )}
            {pageRows.map((p, i) => (
              <tr
                key={p.id}
                className={`border-b border-slate-100 transition-colors hover:bg-slate-50
                  ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
              >
                {/* ID + location */}
                <td className={tdCls}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-blue-900 text-xs">{p.id}</span>
                    <span className="text-[10px] text-slate-400 max-w-[160px] truncate">{p.location}</span>
                  </div>
                </td>

                {/* Source icon */}
                <td className={tdCls}>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px]">{p.source}</span>
                  </span>
                </td>

                {/* GPS */}
                <td className={`${tdCls} font-mono`}>
                  <span className="text-[11px] text-slate-500">
                    {p.lat.toFixed(4)}°N,{" "}
                    {p.lng.toFixed(4)}°E
                  </span>
                </td>

                {/* Score */}
                <td className={tdCls}>
                  <ScoreBar score={p.score} />
                </td>

                {/* Filing status */}
                <td className={tdCls}>
                  <Badge config={FILE_BADGE[p.filingStatus]} fallbackLabel={p.filingStatus} />
                </td>

                {/* Verification */}
                <td className={tdCls}>
                  <Badge config={VER_BADGE[p.verificationStatus]} fallbackLabel={p.verificationStatus} />
                </td>

                {/* Grievance */}
                <td className={tdCls}>
                  {p.grievanceId
                    ? <span className="text-blue-700 text-[11px]">{p.grievanceId}</span>
                    : <span className="text-slate-300">—</span>}
                </td>

                {/* SLA */}
                <td className={tdCls}>
                  {p.sladays != null ? (
                    <span className={`text-xs font-bold ${p.sladays > 7 ? "text-red-600" : "text-amber-600"}`}>
                      {p.sladays}d
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
        <p className="text-[11px] text-slate-500">
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => setPage(pg)}
              className={`w-7 h-7 rounded text-xs font-bold transition-all
                ${page === pg
                  ? "bg-blue-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}
            >
              {pg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
