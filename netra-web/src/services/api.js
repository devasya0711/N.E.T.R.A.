const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/potholes";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

// ── Map API pothole → frontend shape used by components ───────────────────────
export function mapPothole(p) {
  const lat = p.location?.coordinates?.[1] ?? p.lat ?? 0;
  const lng = p.location?.coordinates?.[0] ?? p.lng ?? 0;
  const score = p.severityScore ?? p.score ?? 0;

  let severity;
  if (p.status === "Fixed") severity = "REPAIRED";
  else if (score >= 7.5) severity = "HIGH";
  else if (score >= 4) severity = "MEDIUM";
  else severity = "LOW";

  let filingStatus, verificationStatus;
  switch (p.status) {
    case "Fixed":
      filingStatus = "Filed"; verificationStatus = "Verified"; break;
    case "Escalated":
      filingStatus = "Filed"; verificationStatus = "Escalated"; break;
    case "In Progress":
      filingStatus = "Filed"; verificationStatus = "Awaiting Repair"; break;
    default:
      filingStatus = "Pending"; verificationStatus = "Awaiting Repair";
  }

  const pcu = p.dailyTrafficPCU ?? 0;
  let traffic;
  if (pcu >= 10000) traffic = `Very Heavy (${(pcu/1000).toFixed(0)}k PCUs)`;
  else if (pcu >= 7000) traffic = `Heavy (${(pcu/1000).toFixed(0)}k PCUs)`;
  else if (pcu >= 3000) traffic = `Moderate (${(pcu/1000).toFixed(1)}k PCUs)`;
  else if (pcu > 0) traffic = `Light (${(pcu/1000).toFixed(1)}k PCUs)`;
  else traffic = "Unknown";

  return {
    id: p.potholeId ?? p.id,
    lat, lng,
    location: p.locationDescription ?? p.highwayName ?? "",
    severity, score,
    status: p.status ?? "Submitted",
    depth: p.depthCm ?? p.depth ?? 0,
    diameter: p.diameterCm ?? p.diameter ?? 0,
    traffic,
    source: p.detectionSource ?? p.source ?? "",
    filingStatus, verificationStatus,
    filedAt: p.createdAt ?? null,
    sladays: p.slaDays ?? p.sladays ?? null,
    grievanceId: p.grievanceId ?? null,
    officer: p.assignedOfficer ?? p.officer ?? "Unassigned",
    detectedAt: p.createdAt ?? null,
    createdAt: p.createdAt ?? null,
    dangerIndex: p.dangerIndex ?? Math.min(100, Math.round(score * 10)),
  };
}

// ── Pothole CRUD ──────────────────────────────────────────────────────────────
export const fetchPotholes = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(qs ? `?${qs}` : "");
};

export const fetchPothole = (id) => request(`/${encodeURIComponent(id)}`);

export const createPothole = (data) =>
  request("", { method: "POST", body: JSON.stringify(data) });

export const updateStatus = (id, body) =>
  request(`/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify(body) });

export const assignOfficer = (id, body) =>
  request(`/${encodeURIComponent(id)}/assign`, { method: "PATCH", body: JSON.stringify(body) });

// ── Aggregations ──────────────────────────────────────────────────────────────
export const fetchStats = () => request("/stats");
export const fetchTrends = () => request("/trends");
export const fetchHighways = () => request("/highways");

// ── AI Simulation ─────────────────────────────────────────────────────────────
export const simulateDetection = () => request("/simulate", { method: "POST" });
