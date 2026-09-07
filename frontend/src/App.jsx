import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { requestForToken, onMessageListener } from "./firebase";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import SeatSelection from "./pages/SeatSelection";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import MovieTeamLogin from "./pages/MovieTeamLogin";
import MovieTeamDashboard from "./pages/MovieTeamDashboard";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import QuickReview from "./pages/QuickReview";
import PartnerWithUs from "./pages/PartnerWithUs";
import PartnerStatus from "./pages/PartnerStatus";
import axios from "axios";

// Configure axios base URL globally
const apiBaseURL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
axios.defaults.baseURL = apiBaseURL;

// Attach the right bearer token depending on which part of the API is being called:
// - /api/admin/team/* -> movie team token
// - /api/admin/*      -> super admin token
// - everything else   -> regular user token
axios.interceptors.request.use((config) => {
  const url = config.url || "";
  let token = null;

  if (url.includes("/admin/team/")) {
    const team = JSON.parse(localStorage.getItem("team") || "null");
    token = team?.token;
  } else if (url.includes("/admin/")) {
    const superAdmin = JSON.parse(localStorage.getItem("superAdmin") || "null");
    token = superAdmin?.token;
  } else {
    token = localStorage.getItem("token");
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import NotificationToast from "./components/NotificationToast";

function App() {
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    // 1. Request Permission & Token
    const setupNotifications = async () => {
      try {
        const token = await requestForToken();
        if (!token) return;

        const rawUser = localStorage.getItem("user");
        if (rawUser && rawUser !== "undefined") {
          const userData = JSON.parse(rawUser);
          if (userData && userData.id) {
            await axios.post("/api/users/fcm-token", {
              userId: userData.id,
              fcmToken: token,
            });
            console.log("[FCM] Token registered");
          }
        }
      } catch (error) {
        console.error("[FCM Setup Error]", error);
      }
    };

    setupNotifications();

    const unsubscribe = onMessageListener((payload) => {
      if (!payload) return;
      console.log("Foreground message:", payload);
      if (payload.notification) {
        setActiveNotification({
          title: payload.notification.title,
          body: payload.notification.body,
          data: payload.data,
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/book/:id" element={<SeatSelection />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            <Route path="/team/login" element={<MovieTeamLogin />} />
            <Route path="/team/dashboard" element={<MovieTeamDashboard />} />
            <Route path="/super-admin-login" element={<SuperAdminLogin />} />
            <Route
              path="/super-admin-dashboard"
              element={<SuperAdminDashboard />}
            />
            <Route path="/review/:ticketId" element={<QuickReview />} />
            <Route path="/partner" element={<PartnerWithUs />} />
            <Route path="/partner-status" element={<PartnerStatus />} />
          </Routes>
        </main>
        <Footer />

        {/* Animated Notification Toast */}
        <NotificationToast
          notification={activeNotification}
          onClose={() => setActiveNotification(null)}
        />
      </div>
    </Router>
  );
}

export default App;
