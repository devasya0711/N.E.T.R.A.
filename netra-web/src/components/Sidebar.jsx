import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    group: "core",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: "/dashboard/livemap",
    label: "Live Map",
    group: "core",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    to: "/dashboard/database",
    label: "Pothole Database",
    group: "core",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    to: "/dashboard/heatmaps",
    label: "Risk Heatmaps",
    group: "core",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    to: "/dashboard/resolution",
    label: "Resolution Tracking",
    group: "core",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/dashboard/complaints",
    label: "Complaint Tracker",
    group: "services",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/dashboard/citizen",
    label: "Citizen Portal",
    group: "services",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/dashboard/highways",
    label: "Highway Danger Index",
    group: "services",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 flex flex-col z-30"
      style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.5)' }}
    >

      <nav className="flex flex-col gap-1 px-3 pt-5 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Command Center
        </p>
        {NAV_ITEMS.filter((i) => i.group === "core").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="mx-3 my-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.5)' }} />

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Services
        </p>
        {NAV_ITEMS.filter((i) => i.group === "services").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: System Status */}
      <div className="px-4 pb-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.5)' }}>
        <div className="rounded-lg border p-3" style={{ background: 'rgba(245,240,235,0.6)', borderColor: 'rgba(255,255,255,0.5)' }}>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">System Status</p>
          <StatusRow label="Drone Fleet"     status="ONLINE"   color="emerald" />
          <StatusRow label="Satellite Feed"  status="ACTIVE"   color="emerald" />
          <StatusRow label="PG Portal API"   status="LINKED"   color="blue"    />
          <StatusRow label="CV Model v2.3"   status="RUNNING"  color="emerald" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-slate-500">Live · Updated 2s ago</span>
        </div>
      </div>
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
