import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from "react-leaflet";
import { usePotholeList } from "../hooks/usePotholes";
import { useComplaints } from "../context/ComplaintContext";
import { chhattisgarhData } from "../data/chhattisgarh";

// ─── Severity colour config ────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  HIGH:     { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.85, radius: 10 },
  MEDIUM:   { color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.80, radius: 8  },
  LOW:      { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.75, radius: 6  },
  REPAIRED: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.70, radius: 7  },
};

// ─── URL-based fly-to (supports heatmap click-to-zoom) ───────────────────
function MapInitializer() {
  const [params] = useSearchParams();
  const map = useMap();
  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));
  const zoom = parseInt(params.get("zoom"), 10);
  if (!isNaN(lat) && !isNaN(lng)) {
    map.flyTo([lat, lng], isNaN(zoom) ? 13 : zoom, { duration: 1.2 });
  }
  return null;
}

// ─── Fly-to helper (must live inside MapContainer) ────────────────────────
function FlyToMarker({ position }) {
  const map = useMap();
  if (position) {
    map.flyTo(position, 13, { duration: 1.2 });
  }
  return null;
}

// Removes Leaflet default prefix (flag + "Leaflet" link) if attribution control is present.
function AttributionCleaner() {
  const map = useMap();
  useEffect(() => {
    if (map?.attributionControl) {
      map.attributionControl.setPrefix("");
    }
  }, [map]);
  return null;
}

// ─── Pothole Popup content ────────────────────────────────────────────────
function PotholePopup({ p }) {
  const badges = {
    HIGH:     "netra-badge-high",
    MEDIUM:   "netra-badge-medium",
    LOW:      "netra-badge-low",
    REPAIRED: "netra-badge-repaired",
  };
  const filingBadge = {
    Filed:   "netra-badge-filed",
    Pending: "netra-badge-pending",
    File:    "netra-badge-filed",
  };
  const verBadge = {
    Verified:        "netra-badge-repaired",
    "Awaiting Repair":"netra-badge-pending",
    Escalated:       "netra-badge-escalated",
  };

  return (
    <div className="min-w-[240px] text-xs space-y-2" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-blue-900 text-sm">{p.id}</span>
        <span className={badges[p.severity] || "netra-badge-pending"}>{p.severity}</span>
      </div>
      <p className="text-slate-600 text-[11px]">{p.location}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-200 pt-2">
        <PopupRow label="Score"     value={p.severity === "REPAIRED" ? "N/A" : `${p.score}/10`} />
        <PopupRow label="Source"    value={p.source} />
        <PopupRow label="Depth"     value={p.severity === "REPAIRED" ? "—" : `${p.depth} cm`} />
        <PopupRow label="Diameter"  value={p.severity === "REPAIRED" ? "—" : `${p.diameter} cm`} />
        <PopupRow label="Lat"       value={p.lat.toFixed(4)} />
        <PopupRow label="Lng"       value={p.lng.toFixed(4)} />
      </div>

      <div className="flex gap-2 flex-wrap border-t border-slate-200 pt-2">
        <span className={filingBadge[p.filingStatus] || "netra-badge-pending"}>
          {p.filingStatus}
        </span>
        <span className={verBadge[p.verificationStatus] || "netra-badge-pending"}>
          {p.verificationStatus}
        </span>
      </div>

      {p.grievanceId && (
        <p className="text-[10px] text-slate-400">
          Grievance ID: <span className="text-blue-700">{p.grievanceId}</span>
        </p>
      )}
    </div>
  );
}

function PopupRow({ label, value }) {
  return (
    <>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-semibold">{value}</span>
    </>
  );
}

// ─── Filter Toolbar ───────────────────────────────────────────────────────
const FILTERS = ["ALL", "HIGH", "MEDIUM", "LOW", "REPAIRED"];

function FilterBar({ active, onChange }) {
  const colors = {
    ALL:      "border-slate-300 text-slate-500 hover:border-slate-400",
    HIGH:     "border-red-200   text-red-600   hover:border-red-400",
    MEDIUM:   "border-amber-200 text-amber-600 hover:border-amber-400",
    LOW:      "border-blue-200  text-blue-600  hover:border-blue-400",
    REPAIRED: "border-emerald-200 text-emerald-600 hover:border-emerald-400",
  };
  const activeColors = {
    ALL:      "border-slate-400   bg-slate-100  text-slate-800",
    HIGH:     "border-red-400    bg-red-50   text-red-700",
    MEDIUM:   "border-amber-400  bg-amber-50 text-amber-700",
    LOW:      "border-blue-400   bg-blue-50  text-blue-700",
    REPAIRED: "border-emerald-400 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all duration-150
            ${active === f ? activeColors[f] : colors[f]}`}
        >
          {f === "ALL" ? "All Potholes" : f + " Risk"}
        </button>
      ))}
    </div>
  );
}

// ─── Source Filter ────────────────────────────────────────────────────────
const SOURCE_FILTERS = ["ALL", "AI Detected", "Citizen Reported"];

function SourceFilterBar({ active, onChange }) {
  const colors = {
    ALL:                "border-slate-300 text-slate-500 hover:border-slate-400",
    "AI Detected":      "border-indigo-200 text-indigo-600 hover:border-indigo-400",
    "Citizen Reported": "border-teal-200 text-teal-600 hover:border-teal-400",
  };
  const activeColors = {
    ALL:                "border-slate-400 bg-slate-100 text-slate-800",
    "AI Detected":      "border-indigo-400 bg-indigo-50 text-indigo-700",
    "Citizen Reported": "border-teal-400 bg-teal-50 text-teal-700",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {SOURCE_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all duration-150
            ${active === f ? activeColors[f] : colors[f]}`}
        >
          {f === "ALL" ? "All Sources" : f}
        </button>
      ))}
    </div>
  );
}

// ─── Main Map Component ───────────────────────────────────────────────────
export default function LiveMap() {
  const [filter, setFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [focusPos, setFocusPos] = useState(null);
  const { citizenPotholes } = useComplaints();
  const { potholes: apiPotholes, loading } = usePotholeList({ limit: 500 });
  
  const allPotholes = [...apiPotholes, ...citizenPotholes];
  
  const sourcedPotholes = sourceFilter === "ALL"
    ? allPotholes
    : sourceFilter === "Citizen Reported"
      ? allPotholes.filter(p => p.source === "Citizen-Portal")
      : allPotholes.filter(p => p.source !== "Citizen-Portal");
  
  const visiblePotholes = filter === "ALL"
    ? sourcedPotholes
    : sourcedPotholes.filter((p) => p.severity === filter);
  
  const counts = {
    HIGH:     sourcedPotholes.filter(p => p.severity === "HIGH").length,
    MEDIUM:   sourcedPotholes.filter(p => p.severity === "MEDIUM").length,
    LOW:      sourcedPotholes.filter(p => p.severity === "LOW").length,
    REPAIRED: sourcedPotholes.filter(p => p.severity === "REPAIRED").length,
  };
  
  const chhattisgarhBoundary = {
    type: "Feature",
    properties: { name: "Chhattisgarh" },
    geometry: chhattisgarhData[0]?.geojson,
  };
  
  return (
    <div className="overflow-hidden flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Map toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-700">
            Live Pothole Map — Chhattisgarh State Highway Network
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Active monitoring across NH/SH network · {visiblePotholes.length} markers visible
          </p>
        </div>
        <FilterBar active={filter} onChange={setFilter} />
      </div>

      {/* Source filter strip */}
      <div className="flex items-center justify-between gap-3 px-5 py-2 border-b border-slate-200">
        <SourceFilterBar active={sourceFilter} onChange={setSourceFilter} />
      </div>

      {/* Legend strip */}
      <div className="flex items-center gap-5 px-5 py-2.5 bg-slate-50 border-b border-slate-200">
        {[
          { label: `High Risk (${counts.HIGH})`,     color: "#ef4444" },
          { label: `Medium Risk (${counts.MEDIUM})`, color: "#f59e0b" },
          { label: `Low Risk (${counts.LOW})`,       color: "#3b82f6" },
          { label: `Repaired (${counts.REPAIRED})`,  color: "#10b981" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Click any marker for full details
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="flex-1">
        <MapContainer
          center={[21.7, 82.1]}   // roughly Raipur–Korba midpoint
          zoom={8}
          minZoom={5}
          maxBounds={[[6, 68], [37, 98]]}
          maxBoundsViscosity={1.0}
          className="w-full h-full"
          zoomControl={true}
          attributionControl={false}
        >
          {/* English-only labels tile layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <AttributionCleaner />

          <GeoJSON
            data={chhattisgarhBoundary}
            style={{
              color: "#000000",
              weight: 1,
              opacity: 0.45,
              fillOpacity: 0,
            }}
          />

          {focusPos && <FlyToMarker position={focusPos} />}
          <MapInitializer />

          {visiblePotholes.map((p) => {
            const cfg = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.LOW;
            return (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={cfg.radius}
                pathOptions={{
                  color:       cfg.color,
                  fillColor:   cfg.fillColor,
                  fillOpacity: cfg.fillOpacity,
                  weight:      p.severity === "HIGH" ? 2.5 : 1.5,
                }}
                eventHandlers={{
                  click: () => setFocusPos([p.lat, p.lng]),
                }}
              >
                <Popup minWidth={260} maxWidth={300}>
                  <PotholePopup p={p} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
