import { NavLink } from "react-router-dom";
import { useRole } from "../context/RoleContext";

// ── Icon helpers ──────────────────────────────────────────────────────────────
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M2 8a2 2 0 012-2h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8z" />
    <path d="M17 10l4-2v8l-4-2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9.5" cy="12" r="2.5" />
  </svg>
);
const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
const HeatmapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SatelliteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1.27c.34-.6.99-1 1.73-1a2 2 0 010 4c-.74 0-1.39-.4-1.73-1H20a7 7 0 01-7 7v1.27c.6.34 1 .99 1 1.73a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V23" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="14" r="3" />
  </svg>
);
const TriageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const InboxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M22 12h-6l-2 3H10l-2-3H2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CalculatorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10.01" />
    <line x1="12" y1="10" x2="12" y2="10.01" />
    <line x1="16" y1="10" x2="16" y2="10.01" />
    <line x1="8" y1="14" x2="8" y2="14.01" />
    <line x1="12" y1="14" x2="12" y2="14.01" />
    <line x1="16" y1="14" x2="16" y2="14.01" />
    <line x1="8" y1="18" x2="8" y2="18.01" />
    <line x1="12" y1="18" x2="16" y2="18" />
  </svg>
);
const FileReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <line x1="22" y1="2" x2="11" y2="13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PredictiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Admin navigation items ────────────────────────────────────────────────────
const ADMIN_NAV = [
  { group: "Command Center", items: [
    { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon />, end: true },
    { to: "/dashboard/livemap", label: "Live Map", icon: <MapIcon /> },
    { to: "/dashboard/dashcam", label: "AI Analysis", icon: <CameraIcon /> },
    { to: "/dashboard/database", label: "Pothole Database", icon: <DatabaseIcon /> },
    { to: "/dashboard/heatmaps", label: "Risk Heatmaps", icon: <HeatmapIcon /> },
  ]},
  { group: "AI & Fleet", items: [
    { to: "/dashboard/predictive-engine", label: "Predictive Engine", icon: <PredictiveIcon /> },
    { to: "/dashboard/yolo-queue", label: "YOLO Detection Queue", icon: <AiIcon /> },
    { to: "/dashboard/sensor-fleet", label: "Sensor Fleet Status", icon: <SatelliteIcon /> },
  ]},
  { group: "Incident Management", items: [
    { to: "/dashboard/triage", label: "Severity Triage", icon: <TriageIcon /> },
    { to: "/dashboard/work-orders", label: "Assigned Work Orders", icon: <TruckIcon /> },
    { to: "/dashboard/resolution", label: "SLA Tracking", icon: <CheckCircleIcon /> },
  ]},
  { group: "Citizen Moderation", items: [
    { to: "/dashboard/report-queue", label: "Report Queue", icon: <InboxIcon /> },
    { to: "/dashboard/complaints", label: "Complaint Tracker", icon: <ClipboardIcon /> },
  ]},
  { group: "Reports & Tools", items: [
    { to: "/dashboard/cost-estimator", label: "Cost Estimator", icon: <CalculatorIcon /> },
    { to: "/dashboard/compliance", label: "Compliance Reports", icon: <FileReportIcon /> },
  ]},
  { group: "Public Services", items: [
    { to: "/dashboard/citizen", label: "Citizen Portal", icon: <UserIcon /> },
    { to: "/dashboard/highways", label: "Highway Danger Index", icon: <WarningIcon /> },
  ]},
];

// ── Citizen navigation items ──────────────────────────────────────────────────
const CITIZEN_NAV = [
  { group: "My Dashboard", items: [
    { to: "/dashboard", label: "Overview", icon: <DashboardIcon />, end: true },
    { to: "/dashboard/my-reports", label: "My Reports", icon: <ListIcon /> },
  ]},
  { group: "Report", items: [
    { to: "/dashboard/citizen", label: "Submit Report", icon: <SendIcon /> },
  ]},
  { group: "Track", items: [
    { to: "/dashboard/complaints", label: "Complaint Status", icon: <ClipboardIcon /> },
    { to: "/dashboard/highways", label: "Road Conditions", icon: <WarningIcon /> },
  ]},
];

export default function Sidebar() {
  const { role, isAdmin, setRole } = useRole();
  const navGroups = isAdmin ? ADMIN_NAV : CITIZEN_NAV;

  return (
    <aside className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 flex flex-col z-30 overflow-y-auto"
      style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.5)' }}
    >
      {/* Role badge */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
            isAdmin
              ? "bg-blue-50 text-blue-900 border border-blue-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: isAdmin ? "#1e3a8a" : "#059669", boxShadow: `0 0 6px ${isAdmin ? "#1e3a8a" : "#059669"}` }}
          />
          {role}
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 pt-1 pb-3">
        {navGroups.map((group, gi) => (
          <div key={group.group}>
            {gi > 0 && (
              <div className="mx-3 my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.5)' }} />
            )}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1">
              {group.group}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end || false}
                className={({ isActive }) =>
                  `nav-link py-2 ${isActive ? "active" : ""}`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer: System Status (admin only) */}
      {isAdmin && (
        <div className="px-3 pb-0 pt-2 mt-auto mb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.5)' }}>
          <div className="rounded-lg border p-2.5" style={{ background: 'rgba(245,240,235,0.6)', borderColor: 'rgba(255,255,255,0.5)' }}>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">System Status</p>
            <StatusRow label="Drone Fleet"     status="ONLINE"   color="emerald" />
            <StatusRow label="Satellite Feed"  status="ACTIVE"   color="emerald" />
            <StatusRow label="PG Portal API"   status="LINKED"   color="blue"    />
            <StatusRow label="CV Model v2.3"   status="RUNNING"  color="emerald" />
          </div>
        </div>
      )}
    </aside>
  );
}

function StatusRow({ label, status, color }) {
  const colors = {
    emerald: "text-emerald-600",
    cyan:    "text-cyan-600",
    blue:    "text-blue-700",
    amber:   "text-amber-600",
    red:     "text-red-600",
  };
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-[10px] font-bold ${colors[color] || "text-slate-400"}`}>{status}</span>
    </div>
  );
}
