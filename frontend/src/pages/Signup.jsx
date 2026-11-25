import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { User, Mail, Lock, UserPlus, ArrowRight, Eye, EyeOff } from "lucide-react";
import { getActiveSession, getApiBaseURL, saveRoleSession } from "../utils/auth";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const session = getActiveSession();
    if (session) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/auth/signup", {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      saveRoleSession("user", res.data.user, res.data.token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const apiBaseURL = getApiBaseURL();
    window.location.href = `${apiBaseURL}/api/auth/google`;
  };

  return (
    <div className="min-h-[85vh] flex justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#e50914]/15 rounded-full blur-[140px] pointer-events-none" />

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
            Create your account
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Book movies, review films &amp; earn reward coins
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
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
            or sign up with email
          </span>
        </div>

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="Choose a username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-crimson py-3.5 rounded-xl flex justify-center items-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-7 text-center text-slate-400 text-xs">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#ff2e3b] font-semibold hover:underline inline-flex items-center gap-1"
          >
            Sign In <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
