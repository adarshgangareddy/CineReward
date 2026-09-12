import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, LogIn, KeyRound, Eye, EyeOff } from "lucide-react";

const getApiBaseURL = () => {
  const configuredApiUrl = (import.meta.env.VITE_API_URL || "").replace(
    /\/$/,
    "",
  );
  if (configuredApiUrl) return configuredApiUrl;

  const isLocalDevHost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname,
  );
  return isLocalDevHost ? "http://localhost:5000" : "";
};

const Login = () => {
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
    // Check if user is already logged in
    const existingToken = localStorage.getItem("token");
    const existingUser = localStorage.getItem("user");
    if (existingToken && existingUser) {
      navigate("/");
      return;
    }

    // Check for Google OAuth callback parameters
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const user = params.get("user");

    if (params.get("error") === "true") {
      setError(
        "Google sign-in could not be completed. Make sure MongoDB Atlas allows this network connection, then try again.",
      );
    }

    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", user);
      navigate("/");
      window.location.reload();
    }
  }, [location, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/auth/login", {
        identifier,
        password,
        secretKey: secretKey || undefined,
      });
      const { token, user } = res.data;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("team");
      localStorage.removeItem("superAdmin");

      if (user.role === "movie_team") {
        localStorage.setItem("team", JSON.stringify({ ...user, token }));
        navigate("/team/dashboard");
      } else if (user.role === "super_admin") {
        localStorage.setItem("superAdmin", JSON.stringify({ ...user, token }));
        navigate("/super-admin-dashboard");
      } else {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/");
      }
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBaseURL = getApiBaseURL();
    window.location.href = `${apiBaseURL}/api/auth/google`;
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 py-12">
      <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-black mb-8 text-center text-white italic tracking-tighter">
          CINE<span className="text-primary">REWARD</span>
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl transition-all flex justify-center items-center space-x-3 mb-8 shadow-lg"
        >
          <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
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

        <div className="relative mb-8 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative px-4 bg-slate-900 text-slate-500 text-xs font-bold uppercase tracking-widest">
            or continue with account credentials
          </span>
        </div>

        {/* EMAIL FORM */}
        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type={showSecretKey ? "text" : "password"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="email@example.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
              Secret Code{" "}
              <span className="normal-case tracking-normal">
                (required for movie team/admin)
              </span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={16}
                pattern="[A-Za-z0-9-]+"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="Leave empty for regular users"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                aria-label={
                  showSecretKey ? "Hide secret code" : "Show secret code"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showSecretKey ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="text-right">
              <Link
                to="/forgot-password"
                size="sm"
                className="text-xs font-bold text-slate-500 hover:text-primary transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl transition-all flex justify-center items-center space-x-2 shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>LOGIN</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-slate-500 text-sm font-medium">
          New to CineReward?{" "}
          <Link
            to="/signup"
            className="text-primary hover:underline underline-offset-4"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
