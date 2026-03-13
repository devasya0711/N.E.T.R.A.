import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useStats, useTrends } from "../hooks/usePotholes";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accentColor, icon }) {
  return (
    <div
      className="netra-panel p-5 flex flex-col gap-2 relative overflow-hidden transition-all duration-300"
      style={{ borderColor: `${accentColor}33` }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 0 18px 4px ${accentColor}22, 0 2px 12px 0 ${accentColor}18`;
        e.currentTarget.style.borderColor = `${accentColor}66`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = `${accentColor}33`;
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-widest">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-4xl font-bold" style={{ color: accentColor }}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Custom Tooltip for area chart ───────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="netra-panel px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-500 mb-1 font-bold">{label} 2026</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsOverview() {
  const { data: STATS, loading: statsLoading } = useStats();
  const { data: MONTHLY_TREND, loading: trendsLoading } = useTrends();

  if (statsLoading || trendsLoading || !STATS) {
    return <div className="text-center py-12 text-slate-500">Loading dashboard data...</div>;
  }

  const SEVERITY_DIST = STATS.severityDist || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Fatalities Prevented"
          value={STATS.fatalitiesPrevented}
          sub="Simulated via risk modelling"
          accentColor="#ef4444"
        />
        <StatCard
          label="Open Complaints"
          value={STATS.openComplaints}
          sub={`${STATS.escalated} escalated beyond SLA`}
          accentColor="#f59e0b"
        />
        <StatCard
          label="Avg. SLA Repair Time"
          value={`${STATS.avgSladays}d`}
          sub="Target: 7 days (severe)"
          accentColor="#00d4ff"
        />
        <StatCard
          label="Automation Depth"
          value={STATS.automationDepth}
          sub="Detection -> Filing, no human"
          accentColor="#059669"
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Detected"    value={STATS.totalDetected}  sub="All-time this season" accentColor="#1e3a8a" />
        <StatCard label="High Risk Active"  value={STATS.highRisk}       sub="Require priority repair" accentColor="#ef4444" />
        <StatCard label="Verified Repaired" value={STATS.repaired}       sub="Post-repair re-scan ✓" accentColor="#059669" />
        <StatCard label="Pending Filing"    value={STATS.pendingFiling}  sub="Queued for API dispatch" accentColor="#94a3b8" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend Area Chart */}
        <div className="netra-panel p-5 col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Detection · Repair · Escalation Trend (Oct 2025 – Mar 2026)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_TREND} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDetect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1e3a8a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRepair" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEscalate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="detected"  name="Detected"  stroke="#1e3a8a" strokeWidth={2} fill="url(#gradDetect)"   />
              <Area type="monotone" dataKey="repaired"  name="Repaired"  stroke="#059669" strokeWidth={2} fill="url(#gradRepair)"   />
              <Area type="monotone" dataKey="escalated" name="Escalated" stroke="#ef4444" strokeWidth={2} fill="url(#gradEscalate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution Donut */}
        <div className="netra-panel p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Current Severity Distribution
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={SEVERITY_DIST}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {SEVERITY_DIST.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#64748b", fontSize: 11 }}>{value}</span>
                )}
              />
              <Tooltip
                formatter={(val, name) => [val, name]}
                contentStyle={{
                  background: "#ffffff", border: "1px solid #e2e8f0",
                  borderRadius: 8, fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div className="text-center mt-1">
            <p className="text-2xl font-bold text-slate-800">{STATS.totalDetected}</p>
            <p className="text-[11px] text-slate-500">Total Potholes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
