import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/react";
import { useState } from "react";
import PreLoader from "./components/PreLoader";
import DynamicNavbar from "./components/DynamicNavbar";
import Sidebar from "./components/Sidebar";
import { RoleProvider, useRole } from "./context/RoleContext";

import LandingPage           from "./pages/LandingPage";
import LiveMapPage           from "./pages/LiveMapPage";
import DatabasePage          from "./pages/DatabasePage";
import HeatmapPage           from "./pages/HeatmapPage";
import ResolutionPage        from "./pages/ResolutionPage";
import ComplaintTrackerPage  from "./pages/ComplaintTrackerPage";
import CitizenPortalPage     from "./pages/CitizenPortalPage";
import HighwayIndexPage      from "./pages/HighwayIndexPage";
import DashboardPage         from "./pages/DashboardPage";
import DashcamAnalysisPage   from "./pages/DashcamAnalysisPage";

// ── Admin-only pages ──────────────────────────────────────────────────────────
import YoloQueuePage         from "./pages/YoloQueuePage";
import SensorFleetPage       from "./pages/SensorFleetPage";
import TriagePage            from "./pages/TriagePage";
import WorkOrdersPage        from "./pages/WorkOrdersPage";
import RepairVerificationPage from "./pages/RepairVerificationPage";
import ReportQueuePage       from "./pages/ReportQueuePage";
import CostEstimatorPage     from "./pages/CostEstimatorPage";
import CompliancePage        from "./pages/CompliancePage";

// ── Citizen pages ─────────────────────────────────────────────────────────────
import CitizenDashboardPage  from "./pages/CitizenDashboardPage";
import MyReportsPage         from "./pages/MyReportsPage";

import { ComplaintProvider }  from "./context/ComplaintContext";

/** Access Denied fallback for non-admins */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">Access Denied</h2>
      <p className="text-slate-500 max-w-md mb-6">
        You do not have permission to view the Admin Portal. This area is strictly reserved for authorized <strong>@iiitnr.edu.in</strong> administrative accounts.
      </p>
    </div>
  );
}

/** Route guard — only admin can access */
function AdminOnly({ children }) {
  const { isAdmin } = useRole();
  if (!isAdmin) return <AccessDenied />;
  return children;
}

/** Dashboard shell — sidebar + main content area */
function DashboardShell() {
  const location = useLocation();
  const { isAdmin } = useRole();
  const intendedPortal = sessionStorage.getItem("intended_portal");
  const isLiveMap = location.pathname === "/dashboard/livemap";

  // Strict check: if they clicked 'Admin Portal' but don't have an @iiitnr.edu.in email
  if (!isAdmin && intendedPortal === "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#faf8f5" }}>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto pt-16">
        {isLiveMap ? (
          <Routes>
            <Route path="livemap" element={<LiveMapPage />} />
          </Routes>
        ) : (
          <div className="p-8">
            <Routes>
              {/* ── Default dashboard (role-aware) ── */}
              <Route index element={isAdmin ? <DashboardPage /> : <CitizenDashboardPage />} />

              {/* ── Shared pages ── */}
              <Route path="livemap"           element={<LiveMapPage />} />
              <Route path="complaints"        element={<ComplaintTrackerPage />} />
              <Route path="citizen"           element={<CitizenPortalPage />} />
              <Route path="highways"          element={<HighwayIndexPage />} />

              {/* ── Admin-only pages ── */}
              <Route path="dashcam"           element={<AdminOnly><DashcamAnalysisPage /></AdminOnly>} />
              <Route path="database"          element={<AdminOnly><DatabasePage /></AdminOnly>} />
              <Route path="heatmaps"          element={<AdminOnly><HeatmapPage /></AdminOnly>} />
              <Route path="resolution"        element={<AdminOnly><ResolutionPage /></AdminOnly>} />
              <Route path="yolo-queue"        element={<AdminOnly><YoloQueuePage /></AdminOnly>} />
              <Route path="sensor-fleet"      element={<AdminOnly><SensorFleetPage /></AdminOnly>} />
              <Route path="triage"            element={<AdminOnly><TriagePage /></AdminOnly>} />
              <Route path="work-orders"       element={<AdminOnly><WorkOrdersPage /></AdminOnly>} />
              <Route path="repair-verify"     element={<AdminOnly><RepairVerificationPage /></AdminOnly>} />
              <Route path="report-queue"      element={<AdminOnly><ReportQueuePage /></AdminOnly>} />
              <Route path="cost-estimator"    element={<AdminOnly><CostEstimatorPage /></AdminOnly>} />
              <Route path="compliance"        element={<AdminOnly><CompliancePage /></AdminOnly>} />

              {/* ── Citizen pages ── */}
              <Route path="my-reports"        element={<MyReportsPage />} />
            </Routes>
          </div>
        )}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  return isSignedIn ? children : <Navigate to="/" replace />;
}

function Shell() {
  const location = useLocation();

  return (
    <>
      <DynamicNavbar transparent={location.pathname === "/"} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard/*"
          element={<ProtectedRoute><DashboardShell /></ProtectedRoute>}
        />
      </Routes>
    </>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <PreLoader onComplete={() => setLoaded(true)} />}
      <ComplaintProvider>
        <BrowserRouter>
          <RoleProvider>
            <Shell />
          </RoleProvider>
        </BrowserRouter>
      </ComplaintProvider>
    </>
  );
}
