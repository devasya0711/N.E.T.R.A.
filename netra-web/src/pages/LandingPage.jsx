import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SignInButton, useUser } from "@clerk/react";
import { useRole } from "../context/RoleContext";

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

// ─── Intersection observer helper ─────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Feature card data ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tag: "01 / DETECT",
    title: "Tri-Modal Detection",
    desc: "A fused sensor pipeline ingesting satellite imagery, drone video at 30fps, and bus dashcam footage — all processed in real-time by a YOLOv8-based computer vision model for sub-metre pothole localisation.",
    chips: ["Satellite CV", "Drone Fleet", "Bus Dashcam", "YOLOv8"],
    accent: "#1e3a8a",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tag: "02 / TRIAGE",
    title: "Intelligent Triage",
    desc: "Every detection is assigned a Composite Risk Score (0–10) computed from crater depth, surface diameter, and daily traffic PCUs. Risk heatmaps rank highway stretches by accident probability — not just pothole count.",
    chips: ["Risk Score", "Heatmaps", "Traffic Weight", "Severity AI"],
    accent: "#c2410c",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    tag: "03 / CLOSE",
    title: "Loop Closure",
    desc: "Complaints are auto-filed to PG Portal (CPGRAMS) via API — no human needed to trigger. The same GPS coordinates are re-scanned post-SLA window to verify repair. Unresolved cases are automatically re-escalated.",
    chips: ["PG Portal API", "Auto-Filing", "Re-scan", "Escalation"],
    accent: "#059669",
  },
];

// ─── Stats data ───────────────────────────────────────────────────────────────
const STATS_DATA = [
  { value: 9438, suffix: "",  prefix: "",  label: "Road Accident Deaths (2020–24)", sub: "Chhattisgarh state data", color: "#dc2626" },
  { value: 53,   suffix: "%", prefix: "+", label: "Surge in Highway Fatalities",    sub: "comparing 2019 vs 2024",  color: "#d97706" },
  { value: 100,  suffix: "%", prefix: "",  label: "Autonomous Reporting Pipeline",  sub: "Zero human triggers needed", color: "#059669" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isSignedIn } = useUser();
  const { setRole } = useRole();
  const navigate = useNavigate();
  const [statsRef, statsInView] = useInView(0.1);

  const count0 = useCounter(9438, 2200, statsInView);
  const count1 = useCounter(53,   1800, statsInView);
  const count2 = useCounter(100,  1600, statsInView);
  const counts = [count0, count1, count2];

  return (
    <div className="min-h-screen text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden bg-black">
        {/* Full-screen background video — continuous from PreLoader */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45 }}
          src="/pothole-hackathon.mp4"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

        <motion.div className="relative z-10 max-w-4xl mx-auto space-y-6" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-[11px] font-bold tracking-widest uppercase mb-2 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live · Road Anomaly AI
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
            <span className="text-white">Autonomous</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #ffffff 0%, #f59e0b 60%, #ffffff 100%)", backgroundSize: "200%", animation: "shimmer 4s linear infinite" }}
            >
              Pothole Intelligence
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-gray-300 max-w-2xl mx-auto mt-4 text-lg leading-relaxed">
            <strong className="text-white font-semibold">N.E.T.R.A.</strong> — Real-time road anomaly detection using computer vision, dashcams, and citizen reporting to secure our infrastructure.
          </p>

          {/* Role selection label */}
          <p className="text-[11px] text-white/50 uppercase tracking-[0.25em] font-semibold pt-4 mb-0">
            Choose your portal
          </p>

          {/* CTA row — Admin + Citizen buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
            {/* ── Admin Portal Button ── */}
            {isSignedIn ? (
              <button
                onClick={() => { sessionStorage.setItem("intended_portal", "admin"); navigate("/dashboard"); }}
                className="group relative px-8 py-4 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 overflow-hidden backdrop-blur-md border"
                style={{ background: "rgba(30,58,138,0.35)", borderColor: "rgba(30,58,138,0.5)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30,58,138,0.55)"; e.currentTarget.style.borderColor = "rgba(30,58,138,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(30,58,138,0.35)"; e.currentTarget.style.borderColor = "rgba(30,58,138,0.5)"; }}
              >
                <span className="relative flex items-center gap-3 text-white">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="flex flex-col items-start">
                    <span className="text-[13px]">Admin Portal</span>
                    <span className="text-[9px] text-white/50 font-normal tracking-wider">Municipal · NHAI Officials</span>
                  </span>
                </span>
              </button>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button
                  onClick={() => sessionStorage.setItem("intended_portal", "admin")}
                  className="group relative px-8 py-4 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 overflow-hidden backdrop-blur-md border"
                  style={{ background: "rgba(30,58,138,0.35)", borderColor: "rgba(30,58,138,0.5)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(30,58,138,0.55)"; e.currentTarget.style.borderColor = "rgba(30,58,138,0.7)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(30,58,138,0.35)"; e.currentTarget.style.borderColor = "rgba(30,58,138,0.5)"; }}
                >
                  <span className="relative flex items-center gap-3 text-white">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="flex flex-col items-start">
                      <span className="text-[13px]">Admin Portal</span>
                      <span className="text-[9px] text-white/50 font-normal tracking-wider">Municipal · NHAI Officials</span>
                    </span>
                  </span>
                </button>
              </SignInButton>
            )}

            {/* Divider */}
            <div className="hidden sm:block w-px h-12 bg-white/15" />
            <span className="hidden sm:block text-[10px] text-white/30 font-bold tracking-widest">OR</span>
            <div className="hidden sm:block w-px h-12 bg-white/15" />

            {/* ── Citizen Portal Button ── */}
            {isSignedIn ? (
              <button
                onClick={() => { sessionStorage.setItem("intended_portal", "citizen"); navigate("/dashboard"); }}
                className="group relative px-8 py-4 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 overflow-hidden backdrop-blur-md border"
                style={{ background: "rgba(5,150,105,0.25)", borderColor: "rgba(5,150,105,0.45)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(5,150,105,0.45)"; e.currentTarget.style.borderColor = "rgba(5,150,105,0.65)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(5,150,105,0.25)"; e.currentTarget.style.borderColor = "rgba(5,150,105,0.45)"; }}
              >
                <span className="relative flex items-center gap-3 text-white">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="flex flex-col items-start">
                    <span className="text-[13px]">Citizen Portal</span>
                    <span className="text-[9px] text-white/40 font-normal tracking-wider">Report · Track · Stay Informed</span>
                  </span>
                </span>
              </button>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button
                  onClick={() => sessionStorage.setItem("intended_portal", "citizen")}
                  className="group relative px-8 py-4 rounded-xl font-bold text-sm tracking-wider transition-all duration-300 overflow-hidden backdrop-blur-md border"
                  style={{ background: "rgba(5,150,105,0.25)", borderColor: "rgba(5,150,105,0.45)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(5,150,105,0.45)"; e.currentTarget.style.borderColor = "rgba(5,150,105,0.65)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(5,150,105,0.25)"; e.currentTarget.style.borderColor = "rgba(5,150,105,0.45)"; }}
                >
                  <span className="relative flex items-center gap-3 text-white">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="flex flex-col items-start">
                      <span className="text-[13px]">Citizen Portal</span>
                      <span className="text-[9px] text-white/50 font-normal tracking-wider">Report · Track · Stay Informed</span>
                    </span>
                  </span>
                </button>
              </SignInButton>
            )}
          </div>

          {/* Powered-by banner */}
          <div className="pt-12 flex flex-col items-center gap-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
              Developed For
            </p>
            <div className="flex items-center gap-6 select-none">
              <h3 className="text-xl font-black text-white/50 tracking-[0.2em] hover:text-white transition-colors cursor-default">
                CHiPS
              </h3>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <h3 className="text-xl font-black text-white/50 tracking-[0.2em] hover:text-white transition-colors cursor-default">
                NHAI
              </h3>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="pt-6 flex flex-col items-center gap-2 text-gray-400 text-xs">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/30" />
            <span>SCROLL TO EXPLORE</span>
          </div>
        </motion.div>
      </section>

      {/* ── VIDEO SHOWCASE ──────────────────────────────────────────────── */}
      <motion.section className="relative py-20 px-6" style={{ background: '#faf8f5' }} initial={{ opacity: 0, y: 80 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} viewport={{ once: true, amount: 0.1 }}>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <p className="text-[11px] text-[#1e3a8a] font-bold tracking-[0.3em] uppercase">See It In Action</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Real-Time Pothole Detection Demo</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Watch our AI-powered detection pipeline identify and classify road anomalies from live dashcam footage — full video with controls.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full aspect-video pointer-events-none"
              src="/annotatedreal_video.webm"
            />
          </div>
        </div>
      </motion.section>

      {/* ── IMPACT STATS BAR ───────────────────────────────────────────────── */}
      <motion.section ref={statsRef} className="relative py-16" style={{ background: '#f5f0eb' }} initial={{ opacity: 0, y: 80 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} viewport={{ once: true, amount: 0.1 }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(255,255,255,0.5)' }}>
            {STATS_DATA.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center px-8 py-10" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}>
                {/* Top accent line */}
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: s.color }} />
                <span className="text-5xl font-black mb-2 tabular-nums"
                  style={{ color: s.color }}>
                  {s.prefix}{counts[i].toLocaleString()}{s.suffix}
                </span>
                <p className="text-sm font-bold text-slate-700 mb-1">{s.label}</p>
                <p className="text-[11px] text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <motion.section className="py-24 px-6 relative" style={{ background: '#faf8f5' }} initial={{ opacity: 0, y: 80 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} viewport={{ once: true, amount: 0.08 }}>
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16 space-y-3">
            <p className="text-[11px] text-[#1e3a8a] font-bold tracking-[0.3em] uppercase">Architecture</p>
            <h2 className="text-4xl font-black text-slate-900">How N.E.T.R.A. Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              A fully automated 3-stage pipeline that detects, scores, files, and verifies — without any manual intervention.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} index={i} />
            ))}
          </div>

          {/* Pipeline connector diagram */}
          <PipelineDiagram />
        </div>
      </motion.section>

      {/* ── TECH STACK STRIP ───────────────────────────────────────────────── */}
      <motion.section className="py-12 relative" style={{ background: '#faf8f5' }} initial={{ opacity: 0, y: 80 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} viewport={{ once: true, amount: 0.1 }}>
        <p className="text-center text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase mb-8">
          Technology Stack
        </p>
        <div className="flex items-center gap-10 px-8 flex-wrap justify-center">
          {["YOLOv8 CV", "React.js", "Leaflet Maps", "PG Portal API", "Recharts", "Tailwind CSS", "FastAPI", "PostGIS", "Redis Queue", "Docker"].map((t) => (
            <span key={t} className="text-xs text-stone-500 font-semibold border border-stone-300 px-3 py-1.5 rounded-full hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a] transition-colors cursor-default">
              {t}
            </span>
          ))}
        </div>
      </motion.section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <motion.footer className="py-12 px-10 flex flex-col md:flex-row items-center justify-between gap-6 relative" style={{ background: '#f5f0eb', borderTop: '1px solid rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.5)' }} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} viewport={{ once: true, amount: 0.2 }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#1e3a8a]" />
          <span className="text-sm font-bold text-[#1e3a8a] tracking-widest">N.E.T.R.A.</span>
          <span className="text-slate-400 text-xs tracking-wider">· Networked Edge Tracking for Road Anomalies</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <a href="mailto:support@codeflex.com" className="flex items-center gap-1.5 text-[#1e3a8a] hover:text-blue-900 font-semibold transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            support@codeflex.com
          </a>
        </div>
        <div className="text-xs text-slate-500 tracking-wide font-medium">
          <span>© 2026 Team CodeFlex</span>
        </div>
        <div className="text-xs text-slate-500 tracking-wide font-medium">
          Road Safety · AI + Remote Sensing
        </div>
      </motion.footer>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, tag, title, desc, chips, accent, index }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div
      ref={ref}
      className="group relative rounded-2xl p-7 flex flex-col gap-5 cursor-default transition-all duration-500 border shadow-sm hover:shadow-md"
      style={{ 
        background: 'rgba(255,255,255,0.65)', 
        backdropFilter: 'blur(14px)', 
        borderColor: 'rgba(255,255,255,0.5)',
        transform: inView ? "translateY(0)" : "translateY(32px)",
        opacity: inView ? 1 : 0,
        transitionDelay: `${index * 120}ms`,
      }}
    >
      {/* Top border accent */}
      <div className="absolute top-0 left-8 right-8 h-0.5 rounded-full transition-all duration-500 group-hover:left-4 group-hover:right-4"
        style={{ background: accent }} />

      {/* Icon */}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}14`, border: `1px solid ${accent}30`, color: accent }}>
        {icon}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: accent }}>{tag}</p>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 mt-auto pt-2">
        {chips.map((c) => (
          <span key={c} className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide"
            style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}25` }}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline Diagram ─────────────────────────────────────────────────────────
function PipelineDiagram() {
  const [ref, inView] = useInView(0.2);
  const steps = [
    { label: "Drone / Sat / Cam", color: "#1e3a8a", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.8"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: "CV Detection",      color: "#1e3a8a", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.8"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: "Risk Scoring",      color: "#c2410c", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="1.8"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: "PG Portal Filing",  color: "#c2410c", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="1.8"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: "Post-SLA Re-scan",  color: "#059669", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: "Repair Verified",   color: "#059669", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ];
  return (
    <div ref={ref} className="mt-16 relative"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(24px)", transition: "all 0.6s ease" }}>
      <div className="rounded-2xl p-8 overflow-x-auto border" style={{ background: '#faf8f5', borderColor: 'rgba(255,255,255,0.5)' }}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6 text-center">End-to-End Automation Pipeline</p>
        <div className="flex items-center justify-between min-w-[500px] gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-white border-2"
                  style={{ borderColor: `${s.color}40` }}>
                  {s.icon}
                </div>
                <p className="text-[9px] text-center mt-1.5 max-w-[64px] leading-snug font-semibold" style={{ color: s.color }}>{s.label}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px mx-1"
                  style={{ background: `linear-gradient(90deg, ${s.color}40, ${steps[i + 1].color}40)` }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
