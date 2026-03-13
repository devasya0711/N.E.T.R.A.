import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/react";
import { useState } from "react";
import PreLoader from "./components/PreLoader";
import DynamicNavbar from "./components/DynamicNavbar";
import Sidebar from "./components/Sidebar";
import LandingPage           from "./pages/LandingPage";
import LiveMapPage           from "./pages/LiveMapPage";
import DatabasePage          from "./pages/DatabasePage";
import HeatmapPage           from "./pages/HeatmapPage";
import ResolutionPage        from "./pages/ResolutionPage";
import ComplaintTrackerPage  from "./pages/ComplaintTrackerPage";
import CitizenPortalPage     from "./pages/CitizenPortalPage";
import HighwayIndexPage      from "./pages/HighwayIndexPage";
import DashboardPage         from "./pages/DashboardPage";
import { ComplaintProvider }  from "./context/ComplaintContext";

function DashboardShell() {
  const location = useLocation();
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
              <Route index                    element={<DashboardPage />}        />
              <Route path="livemap"           element={<LiveMapPage />}          />
              <Route path="database"          element={<DatabasePage />}         />
              <Route path="heatmaps"          element={<HeatmapPage />}          />
              <Route path="resolution"        element={<ResolutionPage />}       />
              <Route path="complaints"        element={<ComplaintTrackerPage />} />
              <Route path="citizen"           element={<CitizenPortalPage />}    />
              <Route path="highways"          element={<HighwayIndexPage />}     />
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
          <Shell />
        </BrowserRouter>
      </ComplaintProvider>
    </>
  );
}
