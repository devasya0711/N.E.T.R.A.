import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useStats } from "../hooks/usePotholes";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/potholes";

export default function VideoUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, analyzing, success, error
  const [progress, setProgress] = useState(0);
  const [mediaType, setMediaType] = useState("Video");
  const [frameProgress, setFrameProgress] = useState({ processed: 0, total: 0 });
  const [log, setLog] = useState("");
  const { refresh } = useStats(); // Call refresh if needed after analysis
  
  const [resultUrl, setResultUrl] = useState(null);
  const [analysisStats, setAnalysisStats] = useState(null);
  const uploadStartedAtRef = useRef(0);

  const handleExportPdfReport = () => {
    if (!analysisStats?.potholesList?.length) return;

    const report = analysisStats.potholesList;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const now = new Date();
    const dateText = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("N.E.T.R.A. Pothole Detection Report", 40, 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${dateText}`, 40, 56);
    doc.text(`Total Unique Potholes: ${analysisStats.total ?? report.length}`, 40, 70);

    autoTable(doc, {
      startY: 82,
      head: [["Pothole ID", "Severity", "Score", "Depth Rel", "Latitude", "Longitude", "Loop Closure"]],
      body: report.map((ph) => [
        ph.pothole_id || "N/A",
        ph.severity?.label || "Unknown",
        Number(ph.severity?.final_score || 0).toFixed(2),
        ph.depth?.max_depth_rel || "0.00",
        typeof ph.gps?.latitude === "number" ? ph.gps.latitude.toFixed(4) : "N/A",
        typeof ph.gps?.longitude === "number" ? ph.gps.longitude.toFixed(4) : "N/A",
        ph.loop_closure?.status || "N/A",
      ]),
      styles: { fontSize: 8, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 28, right: 28 },
      tableWidth: "auto",
    });

    doc.save(`netra-report-${now.toISOString().slice(0, 10)}.pdf`);
  };

  useEffect(() => {
    if (status !== "analyzing") {
      return;
    }

    let stopped = false;

    const logTimer = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${API_BASE}/live-logs?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok && res.status === 200) {
          const text = await res.text();
          if (text) setLog(text);
        }
      } catch (_e) {
        // ignore network errors on log stream
      }
    }, 500);

    return () => {
      stopped = true;
      clearInterval(logTimer);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "uploading" && status !== "analyzing") {
      return;
    }

    let stopped = false;

    const metaTimer = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`${API_BASE}/live-meta?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok || res.status !== 200) return;

        const meta = await res.json();
        const metaUpdatedAtMs = Number(meta?.updatedAt || 0) * 1000;
        if (
          uploadStartedAtRef.current > 0 &&
          metaUpdatedAtMs > 0 &&
          metaUpdatedAtMs + 250 < uploadStartedAtRef.current
        ) {
          return;
        }

        const total = Number(meta?.totalFrames || 0);
        const processed = Number(meta?.processedFrames || 0);

        if (total > 0) {
          const pct = Math.min(100, Math.max(0, Math.round((processed / total) * 100)));
          setFrameProgress({ processed, total });
          setProgress(pct);
        } else if (meta?.done) {
          setProgress(100);
        }
      } catch (_e) {
        // ignore transient polling errors
      }
    }, 400);

    return () => {
      stopped = true;
      clearInterval(metaTimer);
    };
  }, [status]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setMediaType(selected.type.startsWith("image/") ? "Image" : "Video");
      setStatus("idle");
      setProgress(0);
      setFrameProgress({ processed: 0, total: 0 });
      setLog("");
      setResultUrl(null);
      uploadStartedAtRef.current = 0;
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    uploadStartedAtRef.current = Date.now();
    setStatus("uploading");
    setProgress(0);
    setFrameProgress({ processed: 0, total: 0 });
    setResultUrl(null);
    const formData = new FormData();
    formData.append("video", file);

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

        xhr.onloadstart = () => {
          setStatus("uploading");
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 2 || xhr.readyState === 3) {
            setStatus("analyzing");
            setProgress((prev) => Math.max(prev, 10));
          }
        };

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || `Request failed with status ${xhr.status}`));
            }
          } catch (_e) {
            reject(new Error("Invalid response from server"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
      
      if (data.success) {
        setProgress(100);
        setStatus("success");
        setLog(`[Success] ${data.message}\n\nAI Log:\n${data.log}`);
        if(data.outputUrl) {
          setResultUrl(data.outputUrl);
        }
        if(data.totalPotholes !== undefined) {
          setAnalysisStats({ 
            total: data.totalPotholes, 
            csvUrl: data.csvUrl, 
            potholesList: data.potholesList || [] 
          });
        }
        refresh(); // Refresh stats on dashboard
      } else {
        setProgress(100);
        setStatus("error");
        setLog(`[Error] ${data.message}\n\nAI Log:\n${data.log}`);
      }
    } catch (err) {
      setProgress(100);
      setStatus("error");
      setLog(`[Upload Error] ${err.message || "Something went wrong"}`);
    }
  };

  return (
    <div className="netra-panel p-4 md:p-6 mb-6 bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] rounded-2xl border border-slate-200/80">
      <style>{`
        .eye-blink-slow {
          animation: netraEyeBlink 8s ease-in-out infinite;
          transform-origin: center;
        }
        .eye-aura-slow {
          animation: netraEyeAura 4.5s ease-in-out infinite;
        }
        .progress-sheen {
          background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0) 100%);
          animation: netraSheen 1.8s linear infinite;
        }
        .progress-indeterminate {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .progress-indeterminate::before {
          content: "";
          position: absolute;
          inset: 0;
          width: 34%;
          border-radius: 9999px;
          background: linear-gradient(90deg, #93c5fd 0%, #3b82f6 55%, #1d4ed8 100%);
          box-shadow: 0 0 16px rgba(59, 130, 246, 0.35);
          animation: netraIndeterminateSlide 1.2s ease-in-out infinite;
        }
        @keyframes netraEyeBlink {
          0%, 44%, 48%, 92%, 100% { transform: scaleY(1); }
          46%, 94% { transform: scaleY(0.16); }
        }
        @keyframes netraEyeAura {
          0%, 100% { transform: scale(1); opacity: 0.24; }
          50% { transform: scale(1.08); opacity: 0.42; }
        }
        @keyframes netraSheen {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(140%); }
        }
        @keyframes netraIndeterminateSlide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
        .netra-log-box {
          background: linear-gradient(180deg, #0b1733 0%, #0a1a3f 100%);
          color: #c7e3ff;
          border: 1px solid rgba(96, 165, 250, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
      `}</style>
      <section className="rounded-2xl border border-blue-100 bg-white/90 backdrop-blur-sm shadow-sm p-4 md:p-6">
        <h2 className="text-xl font-extrabold text-slate-800 mb-3 flex items-center gap-2 tracking-tight">
          <span className="relative inline-flex items-center justify-center w-8 h-8">
            <svg viewBox="0 0 64 40" className="w-8 h-8 text-blue-600 eye-blink-slow" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 20C10 10 20 4 32 4C44 4 54 10 60 20C54 30 44 36 32 36C20 36 10 30 4 20Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="32" cy="20" r="8" fill="currentColor"/>
              <circle cx="35" cy="17" r="2" fill="white"/>
            </svg>
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-300 eye-aura-slow"></span>
          </span>
          NETRA-AI Dashcam & Image Analysis
        </h2>
        <p className="text-[15px] leading-relaxed text-slate-600">
          Upload a dashcam video or image directly to the NETRA pipeline for live AI segmentation, depth-estimation, and severity tracking. Detected potholes will automatically sync to the database and map.
        </p>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-stretch">
          <label className="cursor-pointer w-full border-2 border-dashed border-blue-200 hover:border-blue-400 bg-gradient-to-b from-slate-50 to-blue-50/40 hover:from-blue-50 hover:to-blue-100/40 transition-colors rounded-xl flex flex-col justify-center items-center p-5 min-h-[180px]">
            <input
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {!file && (
              <span className="text-sm font-semibold text-slate-700 text-center">
                Click/Tap to select a video (.mp4, .avi) or image (.jpg, .png)
              </span>
            )}

            {file && preview && file.type.startsWith("image/") && (
              <img src={preview} alt="Preview" className="max-h-36 object-contain rounded-md shadow-sm" />
            )}

            {file && preview && file.type.startsWith("video/") && (
              <video src={preview} controls className="max-h-36 object-contain rounded-md shadow-sm" />
            )}

            {file && (
              <span className="text-sm font-semibold text-slate-600 mt-3">
                Selected: {file.name}
              </span>
            )}
          </label>

          <div className="flex items-center lg:items-stretch">
            <button
              onClick={handleUpload}
              disabled={!file || status === "uploading" || status === "analyzing"}
              className={`w-full lg:w-auto min-w-[190px] px-6 py-4 rounded-xl font-extrabold text-white transition-all shadow-md ${
                !file || status === "uploading" || status === "analyzing"
                  ? "bg-slate-400/90 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
              }`}
            >
              {status === "uploading" && "Uploading to API..."}
              {status === "analyzing" && "AI Processing (Please wait)..."}
              {status === "idle" && "Run Diagnostics"}
              {status === "success" && "Analyzed!"}
              {status === "error" && "Retry Upload"}
            </button>
          </div>
        </div>
      </section>

      {(status === "uploading" || status === "analyzing") && (
          <div className="mt-6 p-6 md:p-8 rounded-2xl bg-gradient-to-b from-white to-blue-50/40 border border-blue-100 shadow-sm flex flex-col items-center w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
              <h3 className="text-lg font-bold text-slate-800">Processing {mediaType}...</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 text-center">
              Our AI engine is currently analyzing the {mediaType.toLowerCase()} feed for road anomalies, estimating depths, and mapping locations. This may take a few moments depending on the {mediaType.toLowerCase()} size.
            </p>

            <div className="w-full mb-2">
              <div className="w-full rounded-full h-4 bg-blue-50 border border-blue-200 overflow-hidden shadow-inner">
                {frameProgress.total > 0 ? (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="progress-sheen absolute inset-0"></div>
                  </div>
                ) : (
                  <div className="progress-indeterminate" aria-hidden="true"></div>
                )}
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-sm font-semibold text-blue-800">
              <p>{frameProgress.total > 0 ? `${progress}%` : ""}</p>
              <p>
                {frameProgress.total > 0
                  ? `${Math.min(frameProgress.processed, frameProgress.total)} / ${frameProgress.total} frames`
                  : "Preparing frame stream..."}
              </p>
            </div>
            
            <p className="text-xs text-blue-700 font-semibold animate-pulse uppercase tracking-wider mt-2">
              Neural Network Active
            </p>
          </div>
      )}

      {resultUrl && (
        <div className="mt-6 p-4 md:p-6 rounded-2xl border border-blue-100 bg-gradient-to-b from-white to-slate-50 shadow-sm">
          <h4 className="text-lg font-extrabold text-slate-800 mb-4 text-center">AI Detection Output</h4>
          {analysisStats && (
            <div className="w-full flex flex-col items-center mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold w-full justify-between shadow-sm">
                <span>Total Unique Potholes Found: {analysisStats.total}</span>
                {analysisStats.potholesList && analysisStats.potholesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportPdfReport}
                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Export Report
                  </button>
                )}
              </div>
              
              {analysisStats.potholesList && analysisStats.potholesList.length > 0 && (
                <div className="w-full mt-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold">
                        <tr>
                          <th className="p-3 border-b">ID</th>
                          <th className="p-3 border-b">Severity</th>
                          <th className="p-3 border-b">Score</th>
                          <th className="p-3 border-b">Depth Rel</th>
                          <th className="p-3 border-b">Location (Lat, Lng)</th>
                          <th className="p-3 border-b">Loop Closure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysisStats.potholesList.map((ph, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                            <td className="p-3 font-mono text-xs text-blue-600 font-medium">{ph.pothole_id}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                ph.severity?.label === 'Critical' ? 'bg-red-100 text-red-700' :
                                ph.severity?.label === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {ph.severity?.label || "Unknown"}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-xs">{(ph.severity?.final_score || 0).toFixed(2)}</td>
                            <td className="p-3 font-mono text-xs">{ph.depth?.max_depth_rel || '0.00'}</td>
                            <td className="p-3 text-xs text-slate-500">
                              {ph.gps?.latitude?.toFixed(4)}, {ph.gps?.longitude?.toFixed(4)}
                            </td>
                            <td className="p-3 text-xs">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                ph.loop_closure?.status === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {ph.loop_closure?.status || "N/A"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4 flex flex-col items-center">
            {resultUrl.endsWith(".jpg") || resultUrl.includes(".jpg") ? (
               <img src={resultUrl} alt="Annotated Result" className="max-h-72 object-contain rounded-md mb-4 shadow-sm border border-slate-300" />
            ) : (
               <video src={resultUrl} controls className="max-h-72 object-contain rounded-md mb-4 shadow-sm border border-slate-300" />
            )}
            <a
              href={resultUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-600 transition"
            >
              Download Processed File
            </a>
          </div>
        </div>
      )}

      {log && (
        <details className="mt-6 rounded-2xl border border-blue-100 bg-white/90 shadow-sm group">
          <summary className="flex items-center justify-between cursor-pointer px-4 md:px-5 py-3 select-none list-none [&::-webkit-details-marker]:hidden">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Process Logs</h4>
            <svg
              className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="px-4 md:px-5 pb-4 md:pb-5">
            <pre className="netra-log-box p-4 rounded-lg text-xs leading-relaxed overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
              {log}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
