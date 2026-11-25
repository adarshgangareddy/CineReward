import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, KeyRound, Eye, EyeOff, Lock, User } from "lucide-react";
import { saveRoleSession } from "../utils/auth";

const SuperAdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/admin/super-login", {
        username: username.trim(),
        password: password.trim(),
        secretKey: secretKey.trim() || undefined,
      });
      saveRoleSession("super_admin", res.data, res.data.token);
      navigate("/super-admin-dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Admin authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-[#ff2e3b]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Super Admin Core
          </h1>
          <p className="text-slate-400 text-xs mt-1">Authorized Personnel Only</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/35 text-red-300 px-4 py-3 rounded-xl text-xs font-medium text-center mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Admin Username or Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.1] text-white pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="Enter username or email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/[0.1] text-white pl-10 pr-11 py-3.5 rounded-xl text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              16-Digit Secret Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showSecret ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] text-white pl-10 pr-11 py-3.5 rounded-xl text-sm focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="16-digit secret code"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-crimson py-3.5 rounded-xl text-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Authenticating..." : "Access Admin Dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/login" className="text-[#ff2e3b] hover:underline font-semibold">
            Back to Unified Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
