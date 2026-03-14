import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { Eye, LayoutDashboard, Bell } from "lucide-react";

export default function DynamicNavbar({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn } = useUser();
  const location = useLocation();
  const isLiveMap = location.pathname === "/dashboard/livemap";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const solidBg = !transparent || scrolled;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: solidBg ? "rgba(255,255,255,0.65)" : "transparent",
        backdropFilter: solidBg ? "blur(20px)" : "none",
        WebkitBackdropFilter: solidBg ? "blur(20px)" : "none",
        borderBottom: solidBg ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
        boxShadow: solidBg ? "0 1px 8px rgba(0,0,0,0.04)" : "none",
      }}
    >
      <div className="w-full px-4 py-1.5 flex items-center justify-between">

        {/* LOGO */}
        <NavLink to="/" className="flex items-center gap-3 group hover:opacity-80 transition-opacity duration-200">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <div className={`absolute inset-1 rounded-full border-2 transition-colors duration-300 ${solidBg ? "border-[#1e3a8a]/30" : "border-white/40"}`} />
            <div className="sensor-ring">
              <Eye size={14} className={`nav-eye-logo relative z-10 transition-colors duration-300 ${solidBg ? "text-[#1e3a8a]" : "text-white"}`} />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className={`text-sm font-black tracking-[0.3em] transition-colors duration-300 ${solidBg ? "text-[#1e3a8a]" : "text-white"}`}>
              N.E.T.R.A.
            </span>
            <span className={`text-[9px] tracking-widest uppercase transition-colors duration-300 ${solidBg ? "text-stone-500" : "text-white/70"}`}>
              Road Anomaly AI
            </span>
          </div>
        </NavLink>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              {isLiveMap && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
                <span className="text-[10px] font-semibold text-emerald-700">LIVE</span>
              </div>
              )}

              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 ring-1 ring-blue-200",
                    userButtonPopoverCard: "!bg-white !border !border-slate-200",
                    userButtonPopoverActionButton: "hover:!bg-slate-50",
                    userButtonPopoverActionButtonText: "!text-slate-700",
                    userButtonPopoverFooter: "!hidden",
                  },
                }}
              />
            </>
          ) : (
            <>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider
                  transition-all duration-200 active:scale-95 ${solidBg
                    ? "border border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                    : "border border-white/25 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/10"}`}
                >
                  Log in
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider
                  transition-all duration-200 active:scale-95 ${solidBg
                    ? "bg-blue-900 text-white hover:bg-blue-800"
                    : "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"}`}
                >
                  Sign Up
                </button>
              </SignUpButton>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}
