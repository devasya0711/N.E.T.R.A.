import { useEffect, useRef, useState } from "react";
import { useStats } from "../hooks/usePotholes";

export default function VideoUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, analyzing, success, error
  const [log, setLog] = useState("");
  const { refresh } = useStats(); // Call refresh if needed after analysis
  
  const [resultUrl, setResultUrl] = useState(null);
  const [analysisStats, setAnalysisStats] = useState(null);

  useEffect(() => {
    if (status !== "analyzing") {
      return;
    }

    let stopped = false;

    const logTimer = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`http://localhost:5000/api/potholes/live-logs?t=${Date.now()}`, {
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
      setStatus("idle");
      setLog("");
      setResultUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setResultUrl(null);
    const formData = new FormData();
    formData.append("video", file);

    try {
      setStatus("analyzing");
      setAnalysisStats(null);
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/potholes";
      const res = await fetch(`${API_BASE}/analyze-video`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
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
        setStatus("error");
        setLog(`[Error] ${data.message}\n\nAI Log:\n${data.log}`);
      }
    } catch (err) {
      setStatus("error");
      setLog(`[Upload Error] ${err.message || "Something went wrong"}`);
    }
  };

  return (
    <div className="netra-panel p-5 mb-6">
      <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
        <span>📸</span> NETRA-AI Dashcam & Image Analysis
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Upload a dashcam video or image directly to the NETRA pipeline for live AI segmentation, depth-estimation, and severity tracking. Detected potholes will automatically sync to the database and map.
      </p>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <label className="flex-1 cursor-pointer w-full border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg flex flex-col justify-center items-center p-4 min-h-[160px]">
          <input
            type="file"
            accept="video/*,image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {!file && (
            <span className="text-sm font-medium text-slate-600">
              Click/Tap to select a video (.mp4, .avi) or image (.jpg, .png)
            </span>
          )}
          
          {file && preview && file.type.startsWith("image/") && (
            <img src={preview} alt="Preview" className="max-h-32 object-contain rounded" />
          )}

          {file && preview && file.type.startsWith("video/") && (
            <video src={preview} controls className="max-h-32 object-contain rounded" />
          )}

          {file && (
             <span className="text-xs font-medium text-slate-500 mt-2">
               Selected: {file.name}
             </span>
          )}
        </label>

        <button
          onClick={handleUpload}
          disabled={!file || status === "uploading" || status === "analyzing"}
          className={`px-6 py-4 rounded-lg font-bold text-white transition-all shadow-md ${
            !file || status === "uploading" || status === "analyzing"
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
          }`}
        >
          {status === "uploading" && "Uploading to API..."}
          {status === "analyzing" && "AI Processing (Please wait)..."}
          {status === "idle" && "Run Diagnostics"}
          {status === "success" && "Analyzed!"}
          {status === "error" && "Retry Upload"}
        </button>
      </div>

      {status === "analyzing" && (
          <div className="mt-6 p-8 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center w-full max-w-2xl mx-auto">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
              <h3 className="text-lg font-bold text-slate-800">Processing Video...</h3>
            </div>
            
            <p className="text-sm text-slate-500 mb-6 text-center">
              Our AI engine is currently analyzing the visual feed for road anomalies, estimating depths, and mapping locations. This may take a few moments depending on the video length.
            </p>

            <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden flex">
              <div className="bg-blue-600 h-2 rounded-full flex-1 animate-pulse"></div>
            </div>
            
            <p className="text-xs text-blue-600 font-semibold animate-pulse uppercase tracking-wider mt-2">
              Neural Network Active
            </p>
          </div>
      )}

      {resultUrl && (
        <div className="mt-4 p-4 rounded-md border border-slate-200 bg-slate-50 flex flex-col items-center">
          <h4 className="text-sm font-bold text-slate-800 mb-2">AI Detection Output</h4>
          {analysisStats && (
            <div className="w-full flex flex-col items-center mb-4">
              <div className="flex items-center gap-4 px-4 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 font-semibold w-full justify-between shadow-sm">
                <span>Total Unique Potholes Found: {analysisStats.total}</span>
                {analysisStats.csvUrl && (
                  <a href={analysisStats.csvUrl} download="potholes_report.csv" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition flex items-center gap-2 shadow-sm cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Download CSV Report
                  </a>
                )}
              </div>
              
              {analysisStats.potholesList && analysisStats.potholesList.length > 0 && (
                <div className="w-full mt-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-medium">
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
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
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
          {resultUrl.endsWith(".jpg") || resultUrl.includes(".jpg") ? (
             <img src={resultUrl} alt="Annotated Result" className="max-h-64 object-contain rounded mb-3 shadow-sm border border-slate-300" />
          ) : (
             <video src={resultUrl} controls className="max-h-64 object-contain rounded mb-3 shadow-sm border border-slate-300" />
          )}
          <a
            href={resultUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-700 transition"
          >
            Download Processed File
          </a>
        </div>
      )}

      {log && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Process Logs</h4>
          <pre className="bg-[#0f172a] text-[#38bdf8] p-4 rounded-md text-xs overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
            {log}
          </pre>
        </div>
      )}
    </div>
  );
}
