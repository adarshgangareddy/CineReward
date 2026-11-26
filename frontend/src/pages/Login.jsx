import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, LogIn, Eye, EyeOff, Phone, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import BrandLogo from "../components/BrandLogo";
import {
  getActiveSession,
  getApiBaseURL,
  saveRoleSession,
  safeParseJSON,
} from "../utils/auth";

const OAUTH_ERRORS = {
  db_unavailable:
    "Sign-in requires Supabase to be connected. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart the backend.",
  google_not_configured:
    "Google OAuth credentials are not configured on the backend yet.",
  oauth_failed: "Social sign-in could not be completed. Please try again.",
  server_config: "Server authentication configuration error.",
  redirect_failed: "Sign-in succeeded but failed to redirect.",
  true: "Authentication could not be completed. Please try again.",
};

const getDashboardForRole = (role) => {
  if (role === "movie_team") return "/team/dashboard";
  if (role === "super_admin" || role === "admin") return "/super-admin-dashboard";
  return "/dashboard";
};

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [credential, setCredential] = useState("");
  const [showCredential, setShowCredential] = useState(false);

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [phoneName, setPhoneName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle Supabase OAuth redirect with #access_token fragment
  useEffect(() => {
    if (!supabase) return;
    const handleSupabaseSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          const res = await axios.post("/api/auth/supabase", { accessToken: session.access_token });
          await supabase.auth.signOut();
          if (res.data?.user && res.data?.token) {
            finishAuthSuccess(res.data.user, res.data.token);
          }
        } catch (err) {
          setError(err.response?.data?.message || "Social sign-in verification failed.");
        }
      }
    };
    handleSupabaseSession();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        try {
          const res = await axios.post("/api/auth/supabase", { accessToken: session.access_token });
          await supabase.auth.signOut();
          if (res.data?.user && res.data?.token) {
            finishAuthSuccess(res.data.user, res.data.token);
          }
        } catch (err) {
          setError(err.response?.data?.message || "Social sign-in verification failed.");
        }
      }
    });
    return () => listener?.subscription?.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const rawUser = params.get("user");
    const errParam = params.get("error");

    if (errParam) {
      setError(OAUTH_ERRORS[errParam] || OAUTH_ERRORS.true);
      return;
    }

    if (token && rawUser) {
      const parsedUser = safeParseJSON(rawUser);
      if (parsedUser) {
        saveRoleSession(parsedUser.role || "user", parsedUser, token);
        navigate(getDashboardForRole(parsedUser.role), { replace: true });
        return;
      }
      setError("Failed to parse Google login response.");
      return;
    }

    const session = getActiveSession();
    if (session) {
      const fromPath = location.state?.from?.pathname;
      navigate(fromPath || getDashboardForRole(session.role), { replace: true });
    }
  }, [location, navigate]);

  const finishAuthSuccess = (user, token) => {
    saveRoleSession(user.role || "user", user, token);
    const fromPath =
      user.role === "user" ? location.state?.from?.pathname : null;
    navigate(fromPath || getDashboardForRole(user.role), { replace: true });
  };

  const handleUnifiedLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanId = identifier.trim();
      const res = await axios.post("/api/auth/login", {
        identifier: cleanId,
        password: credential,
        secretKey: credential.trim(),
      });

      const { token, user } = res.data;
      finishAuthSuccess(user, token);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Sign-in failed. Verify your email, password, or team secret key."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    if (supabase) {
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/login" },
      });
      return;
    }
    // Fallback: Passport Google OAuth redirect
    const apiBaseURL = getApiBaseURL();
    window.location.href = `${apiBaseURL}/api/auth/google?origin=${encodeURIComponent(window.location.origin)}`;
  };

  const handleSocialOAuth = async (provider) => {
    setError("");
    if (supabase) {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + "/login" },
      });
      return;
    }
    setError(`${provider.toUpperCase()} sign-in requires Supabase to be configured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).`);
  };

  const handlePhoneContinue = async (e) => {
    e.preventDefault();
    setError("");
    const cleanPhone = phoneNumber.replace(/\s+/g, "").trim();
    if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
      setError(
        "Enter a valid phone number including country code (e.g. +919876543210)."
      );
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/phone", {
        uid: `phone-${cleanPhone}`,
        phone: cleanPhone,
        name: phoneName.trim() || `Viewer ${cleanPhone.slice(-4)}`,
      });
      setPhoneModalOpen(false);
      finishAuthSuccess(res.data.user, res.data.token);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Phone sign-in requires an active database connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-5 pt-6 pb-32 lg:pt-10 lg:pb-16 relative overflow-x-clip">
      <div className="glass-panel rounded-3xl p-6 sm:p-9 w-full max-w-md relative z-10 min-w-0">
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center">
            <BrandLogo />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign in to CineReward
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            One unified portal for{" "}
            <span className="text-slate-200 font-semibold">Users</span>,{" "}
            <span className="text-slate-200 font-semibold">Movie Teams</span> &amp;{" "}
            <span className="text-slate-200 font-semibold">Admins</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl mb-5 text-xs font-medium leading-relaxed break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleUnifiedLogin} className="space-y-3.5">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Email, Username or Secret Key"
              autoComplete="username"
              className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914] transition-all"
              placeholder="Email, Username or Secret Key"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type={showCredential ? "text" : "password"}
              aria-label="Password or Secret Key"
              autoComplete="current-password"
              className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914] transition-all"
              placeholder="Password or Team Secret Key"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowCredential(!showCredential)}
              aria-label={showCredential ? "Hide credential" : "Show credential"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showCredential ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex justify-end pt-0.5">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-slate-300 hover:text-[#ff2e3b] transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-crimson py-3.5 rounded-xl flex justify-center items-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Compact Icon-Only Social Auth Row */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.1]" />
          </div>
          <span className="relative px-3 bg-[#0e111b] text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            or continue with
          </span>
        </div>

        <div className="flex items-center justify-center gap-3.5">
          {/* Google Icon */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            title="Continue with Google"
            aria-label="Continue with Google"
            className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.16] flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </button>

          {/* X Icon */}
          <button
            type="button"
            onClick={() => handleSocialOAuth("twitter")}
            title="Continue with X"
            aria-label="Continue with X"
            className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.16] text-white flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-lg"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>

          {/* GitHub Icon */}
          <button
            type="button"
            onClick={() => handleSocialOAuth("github")}
            title="Continue with GitHub"
            aria-label="Continue with GitHub"
            className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.16] text-white flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-lg"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.95c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.76 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </button>

          {/* Phone Quick Sign-In Icon */}
          <button
            type="button"
            onClick={() => setPhoneModalOpen((prev) => !prev)}
            title="Continue with Phone"
            aria-label="Continue with Phone"
            className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.16] text-emerald-300 flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-lg"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>

        {phoneModalOpen && (
          <form
            onSubmit={handlePhoneContinue}
            className="mt-5 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.12] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Phone Quick Sign-In
              </span>
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={phoneName}
              onChange={(e) => setPhoneName(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
            />
            <input
              type="tel"
              required
              placeholder="+919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all"
            >
              Continue with Phone
            </button>
          </form>
        )}

        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-400 text-xs">
            New to CineReward?{" "}
            <Link to="/signup" className="text-[#ff2e3b] font-semibold hover:underline">
              Create an Account
            </Link>
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="text-slate-300 hover:underline">
              Terms of Service
            </Link>{" "}
            &amp;{" "}
            <Link to="/privacy-policy" className="text-slate-300 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
