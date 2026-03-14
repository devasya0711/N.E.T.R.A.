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

/** Route guard — only admin can access */
function AdminOnly({ children }) {
  const { isAdmin } = useRole();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Dashboard shell — sidebar + main content area */
function DashboardShell() {
  const location = useLocation();
  const { isAdmin } = useRole();
  const isLiveMap = location.pathname === "/dashboard/livemap";

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
