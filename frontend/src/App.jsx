import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AmbientBackdrop from "./components/AmbientBackdrop";
import NotificationToast from "./components/NotificationToast";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Watchlist from "./pages/Watchlist";
import MovieDetails from "./pages/MovieDetails";
import SeatSelection from "./pages/SeatSelection";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MovieTeamDashboard from "./pages/MovieTeamDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import QuickReview from "./pages/QuickReview";
import PartnerWithUs from "./pages/PartnerWithUs";
import PartnerStatus from "./pages/PartnerStatus";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./routes/ProtectedRoute";
import {
  clearAllSessions,
  getActiveSession,
  getTokenForApiUrl,
  saveRoleSession,
} from "./utils/auth";

const apiBaseURL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
axios.defaults.baseURL = apiBaseURL;

axios.interceptors.request.use((config) => {
  const token = getTokenForApiUrl(config.url || "");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    // Verify active session & sync fresh user coins/role on startup
    const syncSession = async () => {
      const session = getActiveSession();
      if (!session) return;
      try {
        const res = await axios.get("/api/auth/me");
        if (res.data?.user) {
          saveRoleSession(res.data.user.role, res.data.user, session.token);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          clearAllSessions();
        }
      }
    };
    syncSession();

    // Listen for custom in-app notification events (e.g. triggered after ticket booking)
    const handleCustomNotify = (e) => {
      const { title, body, data } = e.detail || {};
      if (title || body) setActiveNotification({ title, body, data });
    };
    window.addEventListener("cinereward:notify", handleCustomNotify);
    return () => window.removeEventListener("cinereward:notify", handleCustomNotify);
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col text-slate-200 relative">
        <AmbientBackdrop />
        <div className="relative z-10 min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collection/:slug" element={<CollectionDetail />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/book/:id" element={<SeatSelection />} />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/team/login" element={<Navigate to="/login" replace />} />
            <Route path="/super-admin-login" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
              <Route path="/dashboard" element={<UserDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["movie_team", "super_admin"]} />
              }
            >
              <Route path="/team/dashboard" element={<MovieTeamDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
              <Route
                path="/super-admin-dashboard"
                element={<SuperAdminDashboard />}
              />
            </Route>

            <Route path="/review/:ticketId" element={<QuickReview />} />
            <Route path="/partner" element={<PartnerWithUs />} />
            <Route path="/partner-status" element={<PartnerStatus />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/list-your-show" element={<PartnerWithUs />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
        </div>

        <NotificationToast
          notification={activeNotification}
          onClose={() => setActiveNotification(null)}
        />
      </div>
    </Router>
  );
}

export default App;
