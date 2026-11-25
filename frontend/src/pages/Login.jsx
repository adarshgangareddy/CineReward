import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, LogIn, KeyRound, Eye, EyeOff, Shield, Film, User } from "lucide-react";
import {
  getActiveSession,
  getApiBaseURL,
  saveRoleSession,
  safeParseJSON,
} from "../utils/auth";

const OAUTH_ERRORS = {
  db_unavailable:
    "Google sign-in is temporarily unavailable because the database is disconnected.",
  google_not_configured:
    "Google OAuth credentials are not configured on the server yet.",
  oauth_failed: "Google sign-in could not be completed. Please try again.",
  server_config: "Server authentication configuration error.",
  redirect_failed: "Google sign-in succeeded but failed to redirect.",
  true: "Google sign-in could not be completed. Please verify connection and try again.",
};

const Login = () => {
  const [roleHint, setRoleHint] = useState("user"); // "user" | "movie_team" | "super_admin"
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
        navigate("/", { replace: true });
        return;
      }
      setError("Failed to parse Google login response.");
      return;
    }

    const session = getActiveSession();
    if (session) {
      if (session.role === "movie_team") {
        navigate("/team/dashboard", { replace: true });
      } else if (session.role === "super_admin") {
        navigate("/super-admin-dashboard", { replace: true });
      } else {
        const fromPath = location.state?.from?.pathname || "/";
        navigate(fromPath, { replace: true });
      }
    }
  }, [location, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/auth/login", {
        identifier: identifier.trim(),
        password,
        secretKey: secretKey.trim() || undefined,
      });

      const { token, user } = res.data;
      saveRoleSession(user.role, user, token);

      if (user.role === "movie_team") {
        navigate("/team/dashboard", { replace: true });
      } else if (user.role === "super_admin") {
        navigate("/super-admin-dashboard", { replace: true });
      } else {
        const fromPath = location.state?.from?.pathname || "/";
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBaseURL = getApiBaseURL();
    window.location.href = `${apiBaseURL}/api/auth/google`;
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e50914]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-700/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="glass-panel rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10">
        <div className="text-center mb-7">
          <div className="inline-flex items-stretch font-black tracking-tighter text-xl leading-none mb-3">
            <span className="bg-[#e50914] text-white px-2.5 py-1 rounded-l-md uppercase">
              CINE
            </span>
            <span className="border border-white/80 text-white px-2.5 py-1 rounded-r-md uppercase bg-black/40">
              REWARD
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Sign in as a Viewer, Movie Team, or Super Admin
          </p>
        </div>

        {/* Quick Role Mode Switcher */}
        <div className="grid grid-cols-3 gap-1.5 bg-white/[0.04] border border-white/[0.08] p-1 rounded-2xl mb-6">
          {[
            { id: "user", label: "Viewer", Icon: User },
            { id: "movie_team", label: "Movie Team", Icon: Film },
            { id: "super_admin", label: "Admin", Icon: Shield },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setRoleHint(id)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                roleHint === id
                  ? "bg-[#e50914] text-white shadow-lg shadow-red-600/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}

        {roleHint === "user" && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-3 mb-6 shadow-lg text-sm"
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
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]"></div>
              </div>
              <span className="relative px-3 bg-[#12121a] text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                or sign in with credentials
              </span>
            </div>
          </>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              {roleHint === "movie_team"
                ? "Team Email"
                : roleHint === "super_admin"
                  ? "Admin Email or Username"
                  : "Email or Username"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                autoComplete="username"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder={
                  roleHint === "movie_team"
                    ? "team@production.com"
                    : "email@example.com or username"
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-between">
              <span>Secret Code</span>
              <span className="text-[10px] font-medium normal-case text-slate-500">
                {roleHint === "user"
                  ? "Optional (Team / Admin only)"
                  : roleHint === "movie_team"
                    ? "Required Team Vault Key"
                    : "Required 16-digit Admin Code"}
              </span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showSecretKey ? "text" : "password"}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder={
                  roleHint === "super_admin"
                    ? "16-digit secret code"
                    : roleHint === "movie_team"
                      ? "CR-XXXXXXXX"
                      : "Leave empty for regular users"
                }
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required={roleHint !== "user"}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                aria-label={showSecretKey ? "Hide secret code" : "Show secret code"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-slate-400 hover:text-[#ff2e3b] transition-colors"
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
              <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-slate-400 text-xs">
          New to CineReward?{" "}
          <Link to="/signup" className="text-[#ff2e3b] font-semibold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
