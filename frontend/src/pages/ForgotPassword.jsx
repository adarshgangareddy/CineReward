import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mail,
  ArrowLeft,
  Send,
  KeyRound,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("request"); // "request" | "verify" | "done"
  const [email, setEmail] = useState("");
  const [accountRole, setAccountRole] = useState("user");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSecretKey, setNewSecretKey] = useState("");
  const [confirmVal, setConfirmVal] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await axios.post("/api/auth/forgot-password", {
        email: email.trim(),
      });
      setAccountRole(res.data?.accountRole || "user");
      setMessage(
        res.data?.message ||
          "An 8-digit verification code has been sent to your email."
      );
      setStep("verify");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not send verification code. Verify your registered email and database status."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithCode = async (e) => {
    e.preventDefault();
    setError("");

    const cleanCode = code.replace(/\D/g, "").slice(0, 8);
    if (cleanCode.length !== 8) {
      setError("Please enter the complete 8-digit verification code.");
      return;
    }

    if (accountRole === "movie_team") {
      if (!newSecretKey.trim() && !newPassword.trim()) {
        setError("Enter a new Secret Key or a new Password.");
        return;
      }
      if (newSecretKey && newSecretKey.trim().length < 6) {
        setError("Secret Key must be at least 6 characters.");
        return;
      }
    } else {
      if (!newPassword || newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmVal) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/auth/reset-password", {
        email: email.trim(),
        code: cleanCode,
        newPassword: newPassword.trim() || undefined,
        newSecretKey: newSecretKey.trim() || undefined,
      });
      setMessage(res.data?.message || "Credentials updated successfully!");
      setStep("done");
      setTimeout(() => navigate("/login"), 2400);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid or expired 8-digit code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-5rem)] px-4 sm:px-5 pt-6 pb-28 lg:pt-10 lg:pb-16">
      <div className="glass-panel p-6 sm:p-10 rounded-3xl w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        <h1 className="text-2xl font-bold mb-2 text-white tracking-tight">
          {step === "verify"
            ? "Enter 8-Digit Code"
            : step === "done"
              ? "Security Updated"
              : "Recover Password or Secret Key"}
        </h1>
        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
          {step === "request" &&
            "Enter your registered User or Movie Team email. We'll send an 8-digit security verification code."}
          {step === "verify" &&
            `Enter the 8-digit code sent to ${email} along with your new ${
              accountRole === "movie_team"
                ? "Team Secret Key or Password"
                : "account password"
            }.`}
          {step === "done" && "Encrypted with Argon2d. Redirecting to Sign In..."}
        </p>

        {message && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium break-words">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl mb-5 text-xs font-medium break-words">
            {error}
          </div>
        )}

        {step === "request" && (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914] transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send 8-Digit Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleResetWithCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                8-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                className="w-full bg-white/[0.06] border border-white/[0.16] rounded-xl py-3.5 px-4 text-center font-mono text-xl font-extrabold tracking-[0.28em] text-white placeholder:text-slate-600 focus:outline-none focus:border-[#e50914]"
                placeholder="00000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                required
              />
            </div>

            {accountRole === "movie_team" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                    New Secret Key (Movie Team)
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
                      placeholder="CR-XXXXXXXX"
                      value={newSecretKey}
                      onChange={(e) => setNewSecretKey(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                    New Team Password (Optional)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
                      placeholder="Optional password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      className="w-full bg-white/[0.06] border border-white/[0.14] rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
                      placeholder="Re-enter password"
                      value={confirmVal}
                      onChange={(e) => setConfirmVal(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-crimson py-3.5 rounded-xl flex justify-center items-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Code &amp; Update</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("request");
                setError("");
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
            >
              Resend code to a different email
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/35 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <Link
              to="/login"
              className="inline-block btn-crimson px-6 py-2.5 rounded-xl text-xs font-bold"
            >
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
