import { useState, useMemo } from "react";

// ── Mock YOLO detection data ──────────────────────────────────────────────────
const MOCK_DETECTIONS = [
  { id: "DET-001", frame: "cam-raipur-03/frame-04821.jpg", confidence: 0.94, bbox: [120, 200, 340, 380], severity: "HIGH", status: "pending", timestamp: "2026-03-14T10:23:00Z", camera: "CAM-R03", location: "NH-30, Km 42.5", class: "Pothole" },
  { id: "DET-002", frame: "cam-bilaspur-01/frame-01293.jpg", confidence: 0.87, bbox: [45, 310, 220, 450], severity: "MEDIUM", status: "pending", timestamp: "2026-03-14T10:18:00Z", camera: "CAM-B01", location: "SH-6, Near Bilaspur Toll", class: "Surface Crack" },
  { id: "DET-003", frame: "cam-korba-02/frame-09182.jpg", confidence: 0.72, bbox: [280, 150, 410, 290], severity: "LOW", status: "pending", timestamp: "2026-03-14T10:12:00Z", camera: "CAM-K02", location: "NH-130, Km 98.3", class: "Pothole" },
  { id: "DET-004", frame: "cam-raipur-01/frame-07331.jpg", confidence: 0.56, bbox: [90, 400, 200, 500], severity: "LOW", status: "pending", timestamp: "2026-03-14T09:55:00Z", camera: "CAM-R01", location: "NH-30, Km 12.1", class: "Shadow Artifact" },
  { id: "DET-005", frame: "cam-durg-01/frame-03821.jpg", confidence: 0.91, bbox: [150, 220, 380, 400], severity: "HIGH", status: "pending", timestamp: "2026-03-14T09:48:00Z", camera: "CAM-D01", location: "NH-53, Durg Bypass", class: "Road Cave-In" },
  { id: "DET-006", frame: "cam-raipur-02/frame-11023.jpg", confidence: 0.83, bbox: [200, 100, 350, 260], severity: "MEDIUM", status: "pending", timestamp: "2026-03-14T09:35:00Z", camera: "CAM-R02", location: "Ring Road, Raipur", class: "Pothole" },
  { id: "DET-007", frame: "cam-bilaspur-02/frame-05421.jpg", confidence: 0.45, bbox: [10, 380, 150, 450], severity: "LOW", status: "pending", timestamp: "2026-03-14T09:22:00Z", camera: "CAM-B02", location: "SH-6, Km 35.8", class: "Water Puddle" },
  { id: "DET-008", frame: "cam-korba-01/frame-08192.jpg", confidence: 0.96, bbox: [180, 250, 400, 420], severity: "HIGH", status: "pending", timestamp: "2026-03-14T09:10:00Z", camera: "CAM-K01", location: "NH-130, Korba Entry", class: "Pothole" },
];

const REJECT_REASONS = [
  "Shadow or lighting artifact",
  "Water puddle — not a pothole",
  "Road marking or paint",
  "Vehicle or debris occlusion",
  "Duplicate of existing detection",
  "Other false positive",
];

const SEV_COLORS = {
  HIGH: { text: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  MEDIUM: { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  LOW: { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
};

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? "#059669" : pct >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function BBoxPreview({ bbox, detection }) {
  const [x1, y1, x2, y2] = bbox;
  const w = 520, h = 300;
  const scaleX = w / 640, scaleY = h / 480;
  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-200" style={{ width: w, height: h, background: "#0f172a" }}>
      {/* Simulated camera feed background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-slate-800 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" className="w-8 h-8">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-slate-600 text-xs font-mono">{detection.camera} — {detection.frame.split("/")[1]}</p>
        </div>
      </div>
      {/* Bounding box overlay */}
      <div
        className="absolute border-2 rounded"
        style={{
          left: x1 * scaleX, top: y1 * scaleY,
          width: (x2 - x1) * scaleX, height: (y2 - y1) * scaleY,
          borderColor: detection.severity === "HIGH" ? "#ef4444" : detection.severity === "MEDIUM" ? "#f59e0b" : "#3b82f6",
          background: `${detection.severity === "HIGH" ? "rgba(239,68,68,0.15)" : detection.severity === "MEDIUM" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)"}`,
        }}
      >
        <span className="absolute -top-5 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
          background: detection.severity === "HIGH" ? "#ef4444" : detection.severity === "MEDIUM" ? "#f59e0b" : "#3b82f6",
          color: "#fff",
        }}>
          {detection.class} · {Math.round(detection.confidence * 100)}%
        </span>
      </div>
      {/* Timestamp overlay */}
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-[10px] text-white font-mono">
        {new Date(detection.timestamp).toLocaleString("en-IN")}
      </div>
    </div>
  );
}

export default function YoloQueuePage() {
  const [detections, setDetections] = useState(MOCK_DETECTIONS);
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return detections;
    return detections.filter((d) => d.status === filter);
  }, [detections, filter]);

  const counts = useMemo(() => ({
    all: detections.length,
    pending: detections.filter((d) => d.status === "pending").length,
    approved: detections.filter((d) => d.status === "approved").length,
    rejected: detections.filter((d) => d.status === "rejected").length,
  }), [detections]);

  const handleApprove = (id) => {
    setDetections((prev) => prev.map((d) => d.id === id ? { ...d, status: "approved" } : d));
    if (selected?.id === id) setSelected({ ...selected, status: "approved" });
  };

  const handleReject = (id, reason) => {
    setDetections((prev) => prev.map((d) => d.id === id ? { ...d, status: "rejected", rejectReason: reason } : d));
    if (selected?.id === id) setSelected({ ...selected, status: "rejected" });
    setRejectModal(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">YOLO Detection Queue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review autonomous camera feeds, bounding boxes, and AI confidence scores · Flag false positives for model retraining
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Detections", value: counts.all, color: "#1e3a8a" },
          { label: "Pending Review", value: counts.pending, color: "#f59e0b" },
          { label: "Approved", value: counts.approved, color: "#059669" },
          { label: "Rejected (False +)", value: counts.rejected, color: "#ef4444" },
        ].map((k) => (
          <div key={k.label} className="netra-panel p-4 text-center">
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${
              filter === f ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-6">
        {/* Detection list */}
        <div className="netra-panel overflow-hidden">
          <div className="divide-y divide-slate-200">
            {filtered.map((det) => {
              const sev = SEV_COLORS[det.severity] || SEV_COLORS.LOW;
              return (
                <button
                  key={det.id}
                  onClick={() => setSelected(det)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${
                    selected?.id === det.id ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    det.status === "approved" ? "bg-emerald-500" : det.status === "rejected" ? "bg-red-500" : "bg-amber-400 animate-pulse"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-900 font-mono">{det.id}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${sev.text} ${sev.bg} ${sev.border}`}>{det.severity}</span>
                      <span className="text-[10px] text-slate-400">{det.class}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{det.location} · {det.camera}</p>
                  </div>
                  <ConfidenceBar value={det.confidence} />
                  <div className="flex gap-1.5 shrink-0">
                    {det.status === "pending" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(det.id); }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >✓</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRejectModal(det.id); }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                        >✗</button>
                      </>
                    )}
                    {det.status === "approved" && <span className="text-[10px] font-bold text-emerald-600">APPROVED</span>}
                    {det.status === "rejected" && <span className="text-[10px] font-bold text-red-500">REJECTED</span>}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-5 py-12 text-center text-slate-400 text-sm">No detections match the current filter.</div>
            )}
          </div>
        </div>

        {/* Preview panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <BBoxPreview bbox={selected.bbox} detection={selected} />
              <div className="netra-panel p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Detection ID</span><span className="font-bold text-blue-900">{selected.id}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Class</span><span className="font-semibold text-slate-700">{selected.class}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Camera</span><span className="font-semibold text-slate-700">{selected.camera}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Location</span><span className="font-semibold text-slate-700">{selected.location}</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Confidence</span><span className="font-bold" style={{ color: selected.confidence >= 0.85 ? "#059669" : selected.confidence >= 0.65 ? "#f59e0b" : "#ef4444" }}>{Math.round(selected.confidence * 100)}%</span></div>
                  <div><span className="text-[10px] text-slate-400 uppercase tracking-wider block">BBox</span><span className="font-mono text-slate-600">[{selected.bbox.join(", ")}]</span></div>
                </div>
              </div>
            </>
          ) : (
            <div className="netra-panel p-12 text-center text-slate-400 text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mx-auto mb-3 opacity-30">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Select a detection to preview the bounding box and metadata.
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setRejectModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-96">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Flag as False Positive</h3>
            <p className="text-xs text-slate-500 mb-4">Select the reason for rejecting detection <span className="font-mono font-bold">{rejectModal}</span>.</p>
            <div className="space-y-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReject(rejectModal, reason)}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-xs text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setRejectModal(null)} className="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
