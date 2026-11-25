import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Lock, ArrowLeft, ShieldCheck, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");

    setLoading(true);
    setError("");

    try {
      await axios.post("/api/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. Link may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[85vh] px-4 py-12">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl w-full max-w-md">
        {!success && (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        )}

        <h1 className="text-2xl font-bold mb-2 text-white tracking-tight">
          Reset Password
        </h1>
        <p className="text-slate-400 text-xs mb-7">
          Create a strong new password for your CineReward account, or{" "}
          <Link to="/forgot-password" className="text-[#ff2e3b] hover:underline">
            verify with your 8-digit email code
          </Link>
          .
        </p>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Password Updated</h2>
            <p className="text-slate-400 text-xs mb-6">
              Redirecting you to sign in...
            </p>
            <Link to="/login" className="text-[#ff2e3b] font-semibold text-xs hover:underline">
              Go to Login Now
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#e50914] transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#e50914] transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
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
                    <ShieldCheck className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
