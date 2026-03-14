import { useState } from "react";

const MOCK_SENSORS = [
  { id: "CAM-R01", vehicle: "BRTS Bus #R-112", route: "NH-30, Raipur City", type: "Transit-Dashcam", status: "online", uptime: 99.2, lastHeartbeat: "2s ago", framesProcessed: 14832, lat: 21.2514, lng: 81.6296, firmware: "v3.1.2" },
  { id: "CAM-R02", vehicle: "PWD Patrol Van #07", route: "Ring Road, Raipur", type: "Patrol-Dashcam", status: "online", uptime: 97.8, lastHeartbeat: "5s ago", framesProcessed: 11204, lat: 21.2604, lng: 81.6406, firmware: "v3.1.2" },
  { id: "CAM-R03", vehicle: "BRTS Bus #R-218", route: "NH-30, Km 42–55", type: "Transit-Dashcam", status: "online", uptime: 95.4, lastHeartbeat: "8s ago", framesProcessed: 9821, lat: 21.3012, lng: 81.7135, firmware: "v3.0.8" },
  { id: "CAM-B01", vehicle: "City Bus #BL-044", route: "SH-6, Bilaspur–Korba", type: "Transit-Dashcam", status: "online", uptime: 98.1, lastHeartbeat: "3s ago", framesProcessed: 12993, lat: 22.0796, lng: 82.1391, firmware: "v3.1.2" },
  { id: "CAM-B02", vehicle: "PWD Patrol Van #14", route: "SH-6, Km 30–45", type: "Patrol-Dashcam", status: "degraded", uptime: 78.3, lastHeartbeat: "45s ago", framesProcessed: 5421, lat: 22.1102, lng: 82.2011, firmware: "v3.0.5" },
  { id: "CAM-K01", vehicle: "BRTS Bus #K-091", route: "NH-130, Korba Entry", type: "Transit-Dashcam", status: "online", uptime: 96.7, lastHeartbeat: "4s ago", framesProcessed: 10812, lat: 22.3490, lng: 82.6940, firmware: "v3.1.2" },
  { id: "CAM-K02", vehicle: "PWD Patrol Van #22", route: "NH-130, Km 90–105", type: "Patrol-Dashcam", status: "offline", uptime: 0, lastHeartbeat: "12m ago", framesProcessed: 9182, lat: 22.2601, lng: 82.5240, firmware: "v3.0.5" },
  { id: "CAM-D01", vehicle: "City Bus #DG-003", route: "NH-53, Durg Bypass", type: "Transit-Dashcam", status: "online", uptime: 94.5, lastHeartbeat: "6s ago", framesProcessed: 8211, lat: 21.1904, lng: 81.2849, firmware: "v3.1.0" },
];

const STATUS_STYLES = {
  online:   { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "ONLINE" },
  degraded: { dot: "bg-amber-500 animate-pulse", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "DEGRADED" },
  offline:  { dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "OFFLINE" },
};

export default function SensorFleetPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const filtered = filterStatus === "all" ? MOCK_SENSORS : MOCK_SENSORS.filter((s) => s.status === filterStatus);

  const counts = {
    all: MOCK_SENSORS.length,
    online: MOCK_SENSORS.filter((s) => s.status === "online").length,
    degraded: MOCK_SENSORS.filter((s) => s.status === "degraded").length,
    offline: MOCK_SENSORS.filter((s) => s.status === "offline").length,
  };

  const avgUptime = (MOCK_SENSORS.reduce((s, c) => s + c.uptime, 0) / MOCK_SENSORS.length).toFixed(1);
  const totalFrames = MOCK_SENSORS.reduce((s, c) => s + c.framesProcessed, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Sensor Fleet Status</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor uptime and live connectivity of autonomous cameras mounted on government and public transit vehicles
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sensors", value: counts.all, color: "#1e3a8a", icon: "📹" },
          { label: "Online", value: counts.online, color: "#059669", icon: "🟢" },
          { label: "Avg Uptime", value: `${avgUptime}%`, color: "#0369a1", icon: "⚡" },
          { label: "Frames Processed", value: totalFrames.toLocaleString(), color: "#7c3aed", icon: "🖼️" },
        ].map((k) => (
          <div key={k.label} className="netra-panel p-5">
            <div className="flex items-start justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{k.label}</p>
              <span className="text-lg">{k.icon}</span>
            </div>
            <p className="text-3xl font-black mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        {["all", "online", "degraded", "offline"].map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${
              filterStatus === f ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Sensor cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((sensor) => {
          const st = STATUS_STYLES[sensor.status];
          return (
            <div key={sensor.id} className="netra-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${st.dot}`} style={{ boxShadow: sensor.status === "online" ? "0 0 8px #10b98166" : sensor.status === "degraded" ? "0 0 8px #f59e0b66" : "none" }} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{sensor.id}</p>
                    <p className="text-[11px] text-slate-500">{sensor.vehicle}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${st.text} ${st.bg} ${st.border}`}>
                  {st.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Route</p>
                  <p className="text-slate-700 font-medium truncate">{sensor.route}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Last Heartbeat</p>
                  <p className={`font-semibold ${sensor.status === "offline" ? "text-red-500" : "text-slate-700"}`}>{sensor.lastHeartbeat}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Firmware</p>
                  <p className="text-slate-600 font-mono">{sensor.firmware}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Uptime</span>
                    <span className={`text-xs font-bold ${sensor.uptime >= 95 ? "text-emerald-600" : sensor.uptime >= 80 ? "text-amber-600" : "text-red-500"}`}>
                      {sensor.uptime}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${sensor.uptime}%`,
                        background: sensor.uptime >= 95 ? "#059669" : sensor.uptime >= 80 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Frames</p>
                  <p className="text-xs font-bold text-slate-700">{sensor.framesProcessed.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
