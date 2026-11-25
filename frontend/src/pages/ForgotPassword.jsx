import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Mail, ArrowLeft, Send } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.post("/api/auth/forgot-password", { email: email.trim() });
      setMessage("A password reset link has been sent to your email.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[85vh] px-4 py-12">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <h1 className="text-2xl font-bold mb-2 text-white tracking-tight">
          Forgot Password?
        </h1>
        <p className="text-slate-400 text-xs mb-7 leading-relaxed">
          Enter your registered email address and we&apos;ll send you a secure reset link.
        </p>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#e50914] transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(message)}
            className="w-full btn-crimson py-3.5 rounded-xl flex justify-center items-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
