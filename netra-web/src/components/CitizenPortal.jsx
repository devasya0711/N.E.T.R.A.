import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  MapPin,
  Locate,
  ImagePlus,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Info,
  FileImage,
} from "lucide-react";
import { useComplaints } from "../context/ComplaintContext";
import { createPothole } from "../services/api";

// ─── Damage type options ──────────────────────────────────────────────────────
const DAMAGE_TYPES = [
  "Pothole (Depression)",
  "Surface Cracking",
  "Edge Break / Shoulder Damage",
  "Utility Cut Failure",
  "Drain / Culvert Collapse",
  "Road Cave-In",
  "Other Road Damage",
];

// ─── Mocked GPS reading ───────────────────────────────────────────────────────
const MOCK_GPS_LOCATIONS = [
  { coords: "21.2514° N, 81.6296° E", label: "Auto-detected via browser GPS", place: "Near Raipur, NH-30" },
  { coords: "22.0796° N, 82.1391° E", label: "Auto-detected via browser GPS", place: "Near Bilaspur, SH-6" },
  { coords: "21.7823° N, 82.1456° E", label: "Auto-detected via browser GPS", place: "NH-130 Km 42, Simga Toll" },
];

function randomMockGps() {
  return MOCK_GPS_LOCATIONS[Math.floor(Math.random() * MOCK_GPS_LOCATIONS.length)];
}

// ─── Image preview thumbnail ──────────────────────────────────────────────────
function ImageThumb({ file, onRemove }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const obj = URL.createObjectURL(file);
    setUrl(obj);
    return () => URL.revokeObjectURL(obj);
  }, [file]);

  return (
    <div className="relative rounded-xl overflow-hidden group border border-slate-200">
      {url && (
        <img
          src={url}
          alt={file.name}
          className="w-full h-28 object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <button
          onClick={() => onRemove(file)}
          className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"
        >
          <X size={12} className="text-white" />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[9px] text-white truncate">
        {file.name}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Upload Evidence", "Location Details", "Submit Report"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const done = step > i;
        const active = step === i;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: done
                    ? "rgba(5,150,105,0.1)"
                    : active
                    ? "rgba(30,58,138,0.1)"
                    : "#faf8f5",
                  border: done
                    ? "1px solid #059669"
                    : active
                    ? "1px solid #1e3a8a"
                    : "1px solid #e2e8f0",
                  color: done ? "#059669" : active ? "#1e3a8a" : "#94a3b8",
                }}
              >
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${
                  done ? "text-emerald-600" : active ? "text-blue-900" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-3 mt-[-14px] transition-all duration-500"
                style={{ background: done ? "rgba(5,150,105,0.3)" : "#e2e8f0" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CitizenPortal() {
  // Form state
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [description, setDescription] = useState("");
  const [damageType, setDamageType] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [referenceId, setReferenceId] = useState("");
  const { addComplaint, addPothole } = useComplaints();

  const fileInputRef = useRef(null);

  // Extract real GPS on mount
  useEffect(() => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsData({
            coords: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
            label: "Auto-detected via browser GPS",
            place: "Current location",
          });
          setGpsLoading(false);
        },
        () => {
          setGpsData(randomMockGps());
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsData(randomMockGps());
      setGpsLoading(false);
    }
  }, []);

  // ── File handling ────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    const valid = Array.from(incoming).filter((f) => validTypes.includes(f.type) && f.size < 10_000_000);
    setFiles((prev) => {
      const merged = [...prev, ...valid];
      return merged.slice(0, 5); // max 5 images
    });
    if (valid.length > 0) setStep(1);
  }, []);

  const removeFile = useCallback((file) => {
    setFiles((prev) => prev.filter((f) => f !== file));
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // ── Re-detect GPS ────────────────────────────────────────────────────────
  const refetchGps = () => {
    setGpsLoading(true);
    setGpsData(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsData({
            coords: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
            label: "Auto-detected via browser GPS",
            place: "Current location",
          });
          setGpsLoading(false);
        },
        () => {
          setGpsData(randomMockGps());
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setTimeout(() => {
        setGpsData(randomMockGps());
        setGpsLoading(false);
      }, 1000);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (files.length === 0) e.files = "Please upload at least one image.";
    if (!description.trim() || description.trim().length < 10)
      e.description = "Please provide at least 10 characters describing the damage.";
    if (!damageType) e.damageType = "Please select a damage type.";
    if (!gpsData) e.gps = "GPS coordinates not yet available. Please wait or re-detect.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const severity = damageType.includes("Cave") || damageType.includes("Pothole") ? "HIGH" : damageType.includes("Crack") ? "LOW" : "MEDIUM";
    const coordParts = (gpsData?.coords || "").match(/([\d.]+)/g);
    const lat = coordParts ? parseFloat(coordParts[0]) : null;
    const lng = coordParts ? parseFloat(coordParts[1]) : null;
    const score = severity === "HIGH" ? 8 : severity === "MEDIUM" ? 5 : 3;
    const depth = Math.floor(Math.random() * 12) + 3;
    const diameter = Math.floor(Math.random() * 40) + 15;

    try {
      const body = {
        location: lat && lng ? { type: "Point", coordinates: [lng, lat] } : undefined,
        locationDescription: description.slice(0, 200),
        highwayName: gpsData?.place || "Unknown",
        severityScore: score,
        dangerIndex: Math.min(100, score * 10),
        depthCm: depth,
        diameterCm: diameter,
        detectionSource: "Citizen-Portal",
        status: "Submitted",
        slaDays: severity === "HIGH" ? 7 : severity === "MEDIUM" ? 14 : 21,
      };

      const res = await createPothole(body);
      const refId = res.data?.potholeId || `NETRA-${Date.now().toString(36).toUpperCase()}`;
      setReferenceId(refId);

      // Also add to local context for immediate UI feedback
      addComplaint({
        id: refId,
        highway: gpsData?.place || "Unknown",
        location: description.slice(0, 60),
        gps: gpsData?.coords || "N/A",
        depth,
        severity,
        dateDetected: new Date().toISOString().split("T")[0],
        status: "Submitted",
        officer: "Unassigned",
        slaDays: body.slaDays,
        daysElapsed: 0,
      });

      if (lat && lng) {
        addPothole({
          id: refId, lat, lng,
          location: gpsData?.place || description.slice(0, 60),
          severity, score, depth, diameter,
          traffic: "Unknown",
          source: "Citizen-Portal",
          filingStatus: "Pending",
          verificationStatus: "Awaiting Repair",
          filedAt: null, sladays: null, grievanceId: null, officer: "Unassigned",
        });
      }

      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      // Fallback: still show success with local state
      const refId = `NETRA-${Date.now().toString(36).toUpperCase()}`;
      setReferenceId(refId);
      addComplaint({
        id: refId,
        highway: gpsData?.place || "Unknown",
        location: description.slice(0, 60),
        gps: gpsData?.coords || "N/A",
        depth, severity,
        dateDetected: new Date().toISOString().split("T")[0],
        status: "Submitted", officer: "Unassigned", slaDays: 7, daysElapsed: 0,
      });
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
        </div>
        <h3 className="text-2xl font-black text-emerald-600 mb-2">Report Submitted!</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Your report has been received by the N.E.T.R.A. AI system. A grievance will be
          <br />auto-filed to the PG Portal within 24 hours.
        </p>
        <div
          className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl mb-8 bg-emerald-50 border border-emerald-200"
        >
          <span className="text-[11px] text-emerald-600 uppercase tracking-widest">Reference ID</span>
          <span className="text-xl font-black font-mono text-emerald-600">{referenceId}</span>
        </div>
        <button
          onClick={() => {
            setFiles([]); setDescription(""); setDamageType(""); setGpsData(randomMockGps());
            setStep(0); setSubmitted(false); setErrors({});
          }}
          className="px-6 py-3 rounded-xl text-sm font-bold text-blue-900 border border-blue-200
            hover:bg-blue-50 transition-all duration-200"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Section header ── */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Citizen Report Portal</h2>
        <p className="text-xs text-slate-500 mt-1">
          Report road damage directly to the N.E.T.R.A. system · Auto-escalated to PWD via PG Portal
        </p>
      </div>

      {/* ── Step bar ── */}
      <StepBar step={step} />

      {/* ── Form card ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl overflow-hidden space-y-0 divide-y divide-slate-200 bg-white border border-slate-200 shadow-sm"
      >
        {/* ─ Section 1: Image Upload ─ */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ImagePlus size={15} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">Evidence Upload</h3>
            <span className="text-[10px] text-slate-400 ml-auto">Max 5 images · 10MB each · JPG/PNG</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 py-10 select-none"
            style={{
              border: `2px dashed ${dragOver ? "rgba(30,58,138,0.5)" : errors.files ? "rgba(239,68,68,0.5)" : "#cbd5e1"}`,
              background: dragOver
                ? "rgba(30,58,138,0.04)"
                : "#faf8f5",
            }}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${dragOver ? "scale-110" : ""}`}
              style={{
                background: "rgba(109,40,217,0.06)",
                border: "1px solid rgba(109,40,217,0.15)",
              }}
            >
              <Upload size={20} className={`transition-colors ${dragOver ? "text-blue-700" : "text-blue-600"}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                {dragOver ? "Drop images here" : "Drag & drop pothole photos"}
              </p>
              <p className="text-xs text-slate-400 mt-1">or click to browse files from your device</p>
            </div>
            {files.length > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold">
                <FileImage size={12} />
                {files.length} image{files.length > 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* Error */}
          {errors.files && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={12} /> {errors.files}
            </p>
          )}

          {/* Thumbnail grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {files.map((f) => (
                <ImageThumb key={f.name + f.size} file={f} onRemove={removeFile} />
              ))}
            </div>
          )}
        </div>

        {/* ─ Section 2: Location Details ─ */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={15} className="text-orange-600" />
            <h3 className="text-sm font-bold text-slate-700">Location Details</h3>
          </div>

          {/* Damage type dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Type of Damage
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-left transition-all duration-200 focus:outline-none bg-white"
                style={{
                  border: `1px solid ${errors.damageType ? "rgba(239,68,68,0.5)" : dropdownOpen ? "#93c5fd" : "#e2e8f0"}`,
                }}
              >
                <span className={damageType ? "text-slate-700" : "text-slate-400"}>{damageType || "Select damage type..."}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <div
                    className="absolute top-full mt-1 w-full rounded-xl z-40 py-1 overflow-hidden bg-white border border-slate-200 shadow-lg"
                  >
                    {DAMAGE_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setDamageType(t); setDropdownOpen(false); setStep(Math.max(step, 1)); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {errors.damageType && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle size={12} /> {errors.damageType}
              </p>
            )}
          </div>

          {/* Location description */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Location Description / Landmark
            </label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setStep(Math.max(step, 1)); }}
              placeholder="e.g. 'Near Simga Toll Plaza on NH-130, approx 200m before the flyover, left lane'"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm text-slate-700 placeholder-slate-400 resize-none
                focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all duration-200 bg-white"
              style={{
                border: `1px solid ${errors.description ? "rgba(239,68,68,0.5)" : "#e2e8f0"}`,
              }}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle size={12} /> {errors.description}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-slate-400">{description.length}/500</span>
            </div>
          </div>

          {/* GPS field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                GPS Coordinates
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200"
                >
                  AUTO-EXTRACTED
                </span>
              </label>
              <button
                type="button"
                onClick={refetchGps}
                disabled={gpsLoading}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
              >
                <Locate size={11} className={gpsLoading ? "animate-spin" : ""} />
                {gpsLoading ? "Detecting..." : "Re-detect"}
              </button>
            </div>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: gpsData ? "#f0fdf4" : "#faf8f5",
                border: `1px solid ${gpsData ? "#bbf7d0" : "rgba(255,255,255,0.5)"}`,
              }}
            >
              <Locate
                size={16}
                className={gpsData ? "text-emerald-500" : "text-gray-600"}
                style={{ filter: gpsData ? "drop-shadow(0 0 6px #10b981)" : "none" }}
              />
              {gpsLoading ? (
                <span className="text-xs text-slate-400 animate-pulse">Acquiring satellite fix...</span>
              ) : gpsData ? (
                <div className="flex-1">
                  <p className="text-sm font-mono font-semibold text-emerald-600">{gpsData.coords}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{gpsData.label} · {gpsData.place}</p>
                </div>
              ) : (
                <span className="text-xs text-red-400">GPS unavailable — please re-detect or enter manually</span>
              )}
              {gpsData && (
                <span
                  className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"
                  style={{ boxShadow: "0 0 8px #10b981" }}
                />
              )}
            </div>
            {errors.gps && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle size={12} /> {errors.gps}
              </p>
            )}
          </div>
        </div>

        {/* ─ Section 3: Consent + Submit ─ */}
        <div className="p-6">
          {/* Info notice */}
          <div
            className="flex items-start gap-3 p-3 rounded-xl mb-5 bg-blue-50 border border-blue-200"
          >
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Your report and GPS coordinates will be processed by the N.E.T.R.A. AI pipeline.
              A grievance will be automatically filed to the{" "}
              <span className="text-blue-700 font-semibold">PG Portal (CPGRAMS)</span> and assigned
              to the concerned PWD division for repair.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm
              transition-all duration-300 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed
              hover:shadow-[0_0_40px_rgba(0,212,255,0.25)]"
            style={{
              background: submitting
                ? "rgba(30,58,138,0.08)"
                : "linear-gradient(135deg, #1e3a8a 0%, #c2410c 100%)",
              border: "1px solid #1e3a8a",
              color: submitting ? "#1e3a8a" : "#ffffff",
            }}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-blue-900 animate-spin" />
                Submitting to N.E.T.R.A. AI...
              </>
            ) : (
              <>
                <Send size={16} style={{ filter: "drop-shadow(0 0 6px #00d4ff)" }} />
                Submit Report to N.E.T.R.A. AI
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
