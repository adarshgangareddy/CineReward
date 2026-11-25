import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Key, Film, Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { saveRoleSession } from "../utils/auth";

const MovieTeamLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/admin/team/login", {
        email: email.trim(),
        password,
        secretKey: secretKey.trim(),
      });
      saveRoleSession("movie_team", res.data, res.data.token);
      navigate("/team/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Team login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#e50914]/15 border border-[#e50914]/30 flex items-center justify-center mx-auto mb-4">
            <Film className="w-7 h-7 text-[#ff2e3b]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Movie Team Access
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Review campaign &amp; reward management portal
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-6 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Team Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="team@cinereward.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Team Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-11 text-sm text-white focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="Team password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              Secret Vault Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showKey ? "text" : "password"}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-11 text-sm text-white focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="CR-XXXXXXXX"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-crimson py-3.5 rounded-xl mt-2 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            <span>{loading ? "Verifying..." : "Enter Team Hub"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Looking for regular login?{" "}
          <Link to="/login" className="text-[#ff2e3b] hover:underline font-semibold">
            Unified Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default MovieTeamLogin;
