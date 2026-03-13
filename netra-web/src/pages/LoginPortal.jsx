import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Icons (inline SVG heroicons) ────────────────────────────────────────────
const IconUser = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconEyeOpen = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const IconEyeClosed = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const IconChevron = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const IconShield = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: "command",
    label: "Command Center Official",
    desc: "Full dashboard · analytics · complaint management",
    icon: "🖥",
    color: "#1e3a8a",
    redirectTo: "/dashboard",
  },
  {
    value: "ground",
    label: "Ground Repair Unit",
    desc: "Assigned tasks · field verification · photo upload",
    icon: "🦺",
    color: "#059669",
    redirectTo: "/dashboard",
  },
];

// ─── Animated scanline background ────────────────────────────────────────────
function AnimatedBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(30,58,138,0.04) 0%, rgba(194,65,12,0.02) 40%, transparent 70%)" }} />
      {/* Grid */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30,58,138,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,58,138,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }} />
    </div>
  );
}

// ─── Input field wrapper ──────────────────────────────────────────────────────
function InputField({ label, id, type, value, onChange, placeholder, icon, rightSlot, error }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative group">
        {/* Left icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-900 transition-colors duration-200">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-10 py-3.5 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200"
          style={{
            background: "#ffffff",
            border: error ? "1px solid #fca5a5" : "1px solid #e2e8f0",
            boxShadow: "none",
          }}
          onFocus={(e) => {
            e.target.style.border = "1px solid #1e3a8a";
            e.target.style.boxShadow = "0 0 0 3px rgba(30,58,138,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.border = error ? "1px solid #fca5a5" : "1px solid #e2e8f0";
            e.target.style.boxShadow = "none";
          }}
        />
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LoginPortal() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ credential: "", password: "", role: "", rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [roleOpen, setRoleOpen]         = useState(false);
  const [errors, setErrors]             = useState({});
  const [loading, setLoading]           = useState(false);
  const [authError, setAuthError]       = useState("");

  const selectedRole = ROLES.find((r) => r.value === formData.role);

  function validate() {
    const e = {};
    if (!formData.credential.trim()) e.credential = "Email or Employee ID is required.";
    if (!formData.password)          e.password   = "Password is required.";
    if (formData.password.length > 0 && formData.password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (!formData.role)              e.role       = "Please select your role.";
    return e;
  }

  function handleChange(field) {
    return (e) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: "" }));
      setAuthError("");
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setAuthError("");

    // Simulate auth delay (replace with real API call)
    await new Promise((r) => setTimeout(r, 1400));

    // Demo: accept any credentials to enter dashboard
    const role = ROLES.find((r) => r.value === formData.role);
    setLoading(false);
    navigate(role?.redirectTo || "/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 relative overflow-hidden"
      style={{ background: "#faf8f5", fontFamily: "'Inter', sans-serif" }}>

      <AnimatedBg />

      {/* Back to landing */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors z-20"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </button>

      {/* Branding pill top‑right */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
        <div className="w-2 h-2 rounded-full bg-blue-900" />
        <span className="text-xs font-black tracking-[0.2em] text-blue-900">N.E.T.R.A.</span>
      </div>

      {/* ── Glassmorphism card ─────────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full max-w-md"
        style={{
          background: "#ffffff",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid #e2e8f0",
          borderRadius: "1.5rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Card top glow line */}
        <div className="absolute top-0 left-12 right-12 h-px rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(30,58,138,0.3), transparent)" }} />

        <div className="px-8 py-10 space-y-7">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <IconShield />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Secure Authentication</h1>
            <p className="text-xs text-slate-500">N.E.T.R.A. Command Infrastructure · Authorised Personnel Only</p>
          </div>

          {/* Auth error banner */}
          {authError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-700"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Credential field */}
            <InputField
              label="Official Email / Employee ID"
              id="credential"
              type="text"
              value={formData.credential}
              onChange={handleChange("credential")}
              placeholder="eg. officer@pwd.cg.gov.in or EMP-4821"
              icon={<IconUser />}
              error={errors.credential}
            />

            {/* Password field */}
            <InputField
              label="Password"
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange("password")}
              placeholder="Enter your secure password"
              icon={<IconLock />}
              error={errors.password}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                </button>
              }
            />

            {/* Role dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Access Role
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRoleOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm text-left outline-none transition-all duration-200"
                  style={{
                    background: "#ffffff",
                    border: errors.role
                      ? "1px solid #fca5a5"
                      : roleOpen
                        ? "1px solid #1e3a8a"
                        : "1px solid #e2e8f0",
                    boxShadow: roleOpen ? "0 0 0 3px rgba(30,58,138,0.08)" : "none",
                  }}
                >
                  {selectedRole ? (
                    <span className="flex items-center gap-2.5">
                      <span className="text-base">{selectedRole.icon}</span>
                      <span className="text-slate-800 font-semibold">{selectedRole.label}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Select your access role…</span>
                  )}
                  <span className={`text-slate-400 transition-transform duration-200 ${roleOpen ? "rotate-180" : ""}`}>
                    <IconChevron />
                  </span>
                </button>

                {/* Dropdown panel */}
                {roleOpen && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-30"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, role: r.value }));
                          setRoleOpen(false);
                          setErrors((prev) => ({ ...prev, role: "" }));
                        }}
                        className="w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors duration-150 hover:bg-slate-50"
                      >
                        <span className="text-xl mt-0.5">{r.icon}</span>
                        <div>
                          <p className="text-sm font-bold" style={{ color: r.color }}>{r.label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                        </div>
                        {formData.role === r.value && (
                          <svg className="w-4 h-4 ml-auto mt-0.5 flex-shrink-0" style={{ color: r.color }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.role && <p className="text-[11px] text-red-600 mt-1">{errors.role}</p>}
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-150"
                  style={{
                    background: formData.rememberMe ? "#eff6ff" : "#ffffff",
                    border: formData.rememberMe ? "1.5px solid #1e3a8a" : "1.5px solid #e2e8f0",
                  }}
                  onClick={() => setFormData((prev) => ({ ...prev, rememberMe: !prev.rememberMe }))}
                >
                  {formData.rememberMe && (
                    <svg className="w-2.5 h-2.5 text-blue-900" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 2L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Remember this device</span>
              </label>
              <button type="button" className="text-xs text-blue-700 hover:text-blue-900 transition-colors">
                Forgot Credentials?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase text-white relative overflow-hidden transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #1e3a8a 0%, #c2410c 100%)",
                border: "none",
                boxShadow: loading ? "none" : "0 4px 16px rgba(30,58,138,0.2)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <IconShield />
                  Authenticate
                </span>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-slate-200" />
            <p className="text-[10px] text-slate-400 text-center">
              Encrypted · TLS 1.3 · Access Logged
            </p>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        </div>

        {/* Card bottom glow line */}
        <div className="absolute bottom-0 left-12 right-12 h-px rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(194,65,12,0.2), transparent)" }} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-400">
        © 2026 Team CodeFlex · N.E.T.R.A. Road Intelligence System
      </div>
    </div>
  );
}
