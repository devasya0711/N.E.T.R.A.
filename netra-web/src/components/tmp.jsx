import { useState, useEffect } from "react";
import { useStats } from "../hooks/usePotholes";

export default function VideoUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, analyzing, success, error
  const [log, setLog] = useState("");
  const { refresh } = useStats(); // Call refresh if needed after analysis
  
  const [liveTs, setLiveTs] = useState(Date.now());
  const [resultUrl, setResultUrl] = useState(null);

  useEffect(() => {
    let interval;
    if (status === "analyzing" || status === "uploading") {
      interval = setInterval(() => {
        setLiveTs(Date.now());
      }, 500); // 2 FPS refresh for live preview
    }
    return () => clearInterval(interval);
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
        <div className="mt-4 p-4 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm animate-pulse">
          <strong>Pipeline Running:</strong> The YOLOv8 model is processing frames. This may take a few moments depending on the video length...
        </div>
      )}

      {resultUrl && (
        <div className="mt-4 p-4 rounded-md border border-slate-200 bg-slate-50 flex flex-col items-center">
          <h4 className="text-sm font-bold text-slate-800 mb-3">AI Detection Output</h4>
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
        <div className="mt-4 mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Process Logs</h4>
          <pre className="bg-[#0f172a] text-[#38bdf8] p-4 rounded-md text-xs overflow-x-auto overflow-y-auto max-h-64 whitespace-pre-wrap">
            {log}
          </pre>
        </div>
      )}
    </div>
  );
}
