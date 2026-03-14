import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useStats } from "../hooks/usePotholes";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/potholes";

/* ─── Icon Components ───────────────────────────────────────────────────── */
const UploadCloudIcon = () => (
  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BrainIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21h6M10 17v4M14 17v4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LayersIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PIPELINE_STEPS = [
  { label: "Upload", desc: "Video or image feed" },
  { label: "AI Engine", desc: "YOLOv8 segmentation" },
  { label: "Depth Map", desc: "MiDaS estimation" },
  { label: "Scoring", desc: "Severity 0–10" },
  { label: "Geo-Tag", desc: "GPS extraction" },
  { label: "Database", desc: "Auto-sync results" },
];

const FEATURES = [
  { icon: <BrainIcon />, title: "Deep Learning", desc: "YOLOv8 + MiDaS neural networks for detection and depth" },
  { icon: <ShieldIcon />, title: "Severity Scoring", desc: "Automated 0–10 composite risk assessment" },
  { icon: <LayersIcon />, title: "Multi-Format", desc: "Supports MP4, AVI, JPG, PNG input streams" },
  { icon: <MapPinIcon />, title: "Geo-Mapping", desc: "GPS extraction with automatic map sync" },
];

export default function VideoUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [mediaType, setMediaType] = useState("Video");
  const [frameProgress, setFrameProgress] = useState({ processed: 0, total: 0 });
  const [log, setLog] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const { refresh } = useStats();

  const [resultUrl, setResultUrl] = useState(null);
  const [analysisStats, setAnalysisStats] = useState(null);
  const uploadStartedAtRef = useRef(0);
  const fileInputRef = useRef(null);

  /* ─── PDF Export ───────────────────────────────────────────────── */
  const handleExportPdfReport = () => {
    if (!analysisStats?.potholesList?.length) return;
    const report = analysisStats.potholesList;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const now = new Date();
    const dateText = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("N.E.T.R.A. Pothole Detection Report", 40, 38);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Generated: ${dateText}`, 40, 56);
    doc.text(`Total Unique Potholes: ${analysisStats.total ?? report.length}`, 40, 70);
    autoTable(doc, {
      startY: 82,
      head: [["Pothole ID", "Severity", "Score", "Depth Rel", "Latitude", "Longitude", "Loop Closure"]],
      body: report.map((ph) => [
        ph.pothole_id || "N/A", ph.severity?.label || "Unknown",
        Number(ph.severity?.final_score || 0).toFixed(2), ph.depth?.max_depth_rel || "0.00",
        typeof ph.gps?.latitude === "number" ? ph.gps.latitude.toFixed(4) : "N/A",
        typeof ph.gps?.longitude === "number" ? ph.gps.longitude.toFixed(4) : "N/A",
        ph.loop_closure?.status || "N/A",
      ]),
      styles: { fontSize: 8, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 28, right: 28 }, tableWidth: "auto",
    });
    doc.save(`netra-report-${now.toISOString().slice(0, 10)}.pdf`);
  };

  /* ─── Live log polling ─────────────────────────────────────────── */
  useEffect(() => {
    if (status !== "analyzing") return;
    let stopped = false;
    const logTimer = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${API_BASE}/live-logs?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok && res.status === 200) { const text = await res.text(); if (text) setLog(text); }
      } catch (_e) {}
    }, 500);
    return () => { stopped = true; clearInterval(logTimer); };
  }, [status]);

  /* ─── Frame progress polling ───────────────────────────────────── */
  useEffect(() => {
    if (status !== "uploading" && status !== "analyzing") return;
    let stopped = false;
    const metaTimer = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${API_BASE}/live-meta?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok || res.status !== 200) return;
        const meta = await res.json();
        const metaUpdatedAtMs = Number(meta?.updatedAt || 0) * 1000;
        if (uploadStartedAtRef.current > 0 && metaUpdatedAtMs > 0 && metaUpdatedAtMs + 250 < uploadStartedAtRef.current) return;
        const total = Number(meta?.totalFrames || 0);
        const processed = Number(meta?.processedFrames || 0);
        if (total > 0) {
          const pct = Math.min(100, Math.max(0, Math.round((processed / total) * 100)));
          setFrameProgress({ processed, total }); setProgress(pct);
        } else if (meta?.done) { setProgress(100); }
      } catch (_e) {}
    }, 400);
    return () => { stopped = true; clearInterval(metaTimer); };
  }, [status]);

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]);

  /* ─── File handling ────────────────────────────────────────────── */
  const processFile = (selected) => {
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setMediaType(selected.type.startsWith("image/") ? "Image" : "Video");
    setStatus("idle"); setProgress(0);
    setFrameProgress({ processed: 0, total: 0 });
    setLog(""); setResultUrl(null); uploadStartedAtRef.current = 0;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };

  /* ─── Upload + Analyze ─────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!file) return;
    uploadStartedAtRef.current = Date.now();
    setStatus("uploading"); setProgress(0);
    setFrameProgress({ processed: 0, total: 0 }); setResultUrl(null);
    const formData = new FormData(); formData.append("video", file);
    try {
      setAnalysisStats(null);
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/analyze-video`, true);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadPercent = Math.min(10, Math.round((event.loaded / event.total) * 10));
            setProgress(uploadPercent);
          }
        };
        xhr.onloadstart = () => setStatus("uploading");
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 2 || xhr.readyState === 3) {
            setStatus("analyzing"); setProgress((prev) => Math.max(prev, 10));
          }
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
            else reject(new Error(parsed.message || `Request failed with status ${xhr.status}`));
          } catch (_e) { reject(new Error("Invalid response from server")); }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
      if (data.success) {
        setProgress(100); setStatus("success");
        setLog(`[Success] ${data.message}\n\nAI Log:\n${data.log}`);
        if (data.outputUrl) setResultUrl(data.outputUrl);
        if (data.totalPotholes !== undefined) {
          setAnalysisStats({ total: data.totalPotholes, csvUrl: data.csvUrl, potholesList: data.potholesList || [] });
        }
        refresh();
      } else {
        setProgress(100); setStatus("error");
        setLog(`[Error] ${data.message}\n\nAI Log:\n${data.log}`);
      }
    } catch (err) {
      setProgress(100); setStatus("error");
      setLog(`[Upload Error] ${err.message || "Something went wrong"}`);
    }
  };

  const isProcessing = status === "uploading" || status === "analyzing";

  /* ─── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <style>{`
        @keyframes netraSheen {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(140%); }
        }
        @keyframes netraIndeterminateSlide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        @keyframes netraPulseRing {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        .progress-sheen {
          background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0) 100%);
          animation: netraSheen 1.8s linear infinite;
        }
        .progress-indeterminate { position: relative; width: 100%; height: 100%; overflow: hidden; }
        .progress-indeterminate::before {
          content: ""; position: absolute; inset: 0; width: 34%; border-radius: 9999px;
          background: linear-gradient(90deg, #93c5fd 0%, #3b82f6 55%, #1d4ed8 100%);
          box-shadow: 0 0 16px rgba(59, 130, 246, 0.35);
          animation: netraIndeterminateSlide 1.2s ease-in-out infinite;
        }
        .netra-log-box {
          background: linear-gradient(180deg, #0b1733 0%, #0a1a3f 100%);
          color: #c7e3ff; border: 1px solid rgba(96, 165, 250, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .upload-zone-active { border-color: #3b82f6 !important; background: rgba(59, 130, 246, 0.06) !important; }
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">AI Dashcam & Image Analysis</h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload dashcam footage or road images for real-time AI-powered pothole detection, depth estimation, and severity scoring
        </p>
      </div>

      {/* ── Feature Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="netra-panel p-4 flex items-start gap-3 group hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:scale-105 transition-transform">
              {f.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">{f.title}</p>
              <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Upload Zone ──────────────────────────────────────────── */}
      <div className="netra-panel p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Upload Media</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer min-h-[220px] flex flex-col items-center justify-center p-6 ${
              dragOver ? "upload-zone-active border-blue-400" :
              file ? "border-emerald-300 bg-emerald-50/30" :
              "border-slate-200 hover:border-blue-300 bg-gradient-to-b from-slate-50/50 to-blue-50/20 hover:from-blue-50/40 hover:to-indigo-50/20"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={handleFileChange} />

            {!file && (
              <>
                <div className="text-slate-300 mb-3"><UploadCloudIcon /></div>
                <p className="text-sm font-semibold text-slate-600 text-center">
                  Drag & drop your file here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">or click to browse · MP4, AVI, JPG, PNG</p>
              </>
            )}

            {file && preview && file.type.startsWith("image/") && (
              <img src={preview} alt="Preview" className="max-h-40 object-contain rounded-lg shadow-sm" />
            )}
            {file && preview && file.type.startsWith("video/") && (
              <video src={preview} controls className="max-h-40 object-contain rounded-lg shadow-sm" />
            )}
            {file && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-600">{file.name}</span>
                <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || isProcessing}
              className={`w-full px-6 py-4 rounded-xl font-bold text-white text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                !file || isProcessing
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {isProcessing && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {status === "uploading" && "Uploading..."}
              {status === "analyzing" && "AI Processing..."}
              {status === "idle" && "Run Diagnostics"}
              {status === "success" && "Re-Analyze"}
              {status === "error" && "Retry Upload"}
            </button>

            {file && status === "idle" && (
              <button
                onClick={() => { setFile(null); setPreview(null); setStatus("idle"); setResultUrl(null); setAnalysisStats(null); setLog(""); }}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Clear Selection
              </button>
            )}

            <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Pipeline</p>
              <div className="space-y-2">
                {PIPELINE_STEPS.map((s, i) => {
                  let dotColor = "bg-slate-200";
                  let textColor = "text-slate-400";
                  if (status === "success" || (status === "analyzing" && i <= 3) || (status === "uploading" && i === 0)) {
                    dotColor = "bg-emerald-500"; textColor = "text-slate-600";
                  }
                  if (status === "analyzing" && i === 4) {
                    dotColor = "bg-blue-500 animate-pulse"; textColor = "text-blue-700";
                  }
                  return (
                    <div key={s.label} className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${dotColor}`} />
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-semibold transition-colors ${textColor}`}>{s.label}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-400">{s.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Processing State ─────────────────────────────────────── */}
      {isProcessing && (
        <div className="netra-panel p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-8 h-8 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/20" style={{ animation: "netraPulseRing 1.5s ease-out infinite" }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Processing {mediaType}...</h3>
              <p className="text-[11px] text-slate-500">Neural network actively scanning for road anomalies</p>
            </div>
          </div>

          <div className="w-full mb-2">
            <div className="w-full rounded-full h-3 bg-blue-50 border border-blue-200 overflow-hidden shadow-inner">
              {frameProgress.total > 0 ? (
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 relative"
                  style={{ width: `${progress}%` }}>
                  <div className="progress-sheen absolute inset-0" />
                </div>
              ) : (
                <div className="progress-indeterminate" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800">
            <p>{frameProgress.total > 0 ? `${progress}%` : ""}</p>
            <p>{frameProgress.total > 0 ? `${Math.min(frameProgress.processed, frameProgress.total)} / ${frameProgress.total} frames` : "Preparing frame stream..."}</p>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {resultUrl && (
        <div className="netra-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-700">AI Detection Output</h2>
              <p className="text-[11px] text-slate-500">Annotated results from the neural network pipeline</p>
            </div>
            {analysisStats?.potholesList?.length > 0 && (
              <button onClick={handleExportPdfReport}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg text-xs font-bold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-sm hover:shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export PDF Report
              </button>
            )}
          </div>

          {analysisStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">Potholes Found</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{analysisStats.total}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <p className="text-[10px] text-blue-600 uppercase tracking-widest font-bold">Media Type</p>
                <p className="text-2xl font-black text-blue-700 mt-1">{mediaType}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold">Status</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">Complete</p>
              </div>
            </div>
          )}

          {/* Results table */}
          {analysisStats?.potholesList?.length > 0 && (
            <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 text-xs">
                    <tr>
                      <th className="p-3 border-b font-bold">ID</th>
                      <th className="p-3 border-b font-bold">Severity</th>
                      <th className="p-3 border-b font-bold">Score</th>
                      <th className="p-3 border-b font-bold">Depth</th>
                      <th className="p-3 border-b font-bold">Location</th>
                      <th className="p-3 border-b font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysisStats.potholesList.map((ph, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-3 font-mono text-xs text-blue-600 font-semibold">{ph.pothole_id}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            ph.severity?.label === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200' :
                            ph.severity?.label === 'Moderate' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {ph.severity?.label || "Unknown"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs">{(ph.severity?.final_score || 0).toFixed(2)}</td>
                        <td className="p-3 font-mono text-xs">{ph.depth?.max_depth_rel || '0.00'}</td>
                        <td className="p-3 text-xs text-slate-500">{ph.gps?.latitude?.toFixed(4)}, {ph.gps?.longitude?.toFixed(4)}</td>
                        <td className="p-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ph.loop_closure?.status === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                          }`}>{ph.loop_closure?.status || "N/A"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Output media */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center">
            {resultUrl.endsWith(".jpg") || resultUrl.includes(".jpg") ? (
              <img src={resultUrl} alt="Annotated Result" className="max-h-72 object-contain rounded-lg mb-4 shadow-sm border border-slate-300" />
            ) : (
              <video src={resultUrl} controls className="max-h-72 object-contain rounded-lg mb-4 shadow-sm border border-slate-300" />
            )}
            <a href={resultUrl} download target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg text-xs font-bold hover:from-slate-700 hover:to-slate-600 transition-all shadow-sm">
              Download Processed File
            </a>
          </div>
        </div>
      )}

      {/* ── Process Logs ─────────────────────────────────────────── */}
      {log && (
        <details className="netra-panel group">
          <summary className="flex items-center justify-between cursor-pointer px-5 py-4 select-none list-none [&::-webkit-details-marker]:hidden">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Process Logs</h4>
            <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="px-5 pb-5">
            <pre className="netra-log-box p-4 rounded-lg text-xs leading-relaxed overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
              {log}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
