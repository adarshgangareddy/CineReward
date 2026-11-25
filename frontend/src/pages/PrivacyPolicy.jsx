import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Eye, CreditCard, Bell, ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    icon: Lock,
    title: "1. Authentication & Argon2d Security",
    body: "All user passwords, Movie Team secret keys, and 8-digit verification codes are encrypted using memory-hard Argon2d hashing before storage. Plaintext passwords or team keys are never exposed in API responses or logs.",
  },
  {
    icon: Eye,
    title: "2. Information We Collect",
    body: "When you create an account or sign in with Google, X, GitHub, or Phone OTP, we store your name, email address or phone number, profile avatar URL, selected cinema city preference, bookings, reviews, and CineReward Coin ledger.",
  },
  {
    icon: CreditCard,
    title: "3. Ticket Bookings & Payments",
    body: "Online payments are processed through Razorpay over TLS encryption. CineReward does not store full card numbers, CVV, or UPI PINs on its servers. Your digital M-Ticket stores theatre, seat number, showtime, and verification ID.",
  },
  {
    icon: Bell,
    title: "4. Email, Push & Review Notifications",
    body: "We send transactional booking confirmations, 8-digit password recovery codes, verified post-show review reminders, and coin award alerts via email and optional Firebase Cloud Messaging push tokens. You can disable push permissions anytime in your browser.",
  },
  {
    icon: ShieldCheck,
    title: "5. Cookies, Local Storage & Your Rights",
    body: "CineReward uses browser localStorage and sessionStorage strictly for your active JWT session, city preference, watchlist, and fast catalog caching. To request account data export or deletion, contact adarshavg08@gmail.com.",
  },
];

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen px-5 pt-6 pb-28 lg:pt-10 lg:pb-16">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white glass-button px-4 py-2 rounded-full mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="border-b border-white/[0.08] pb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff2e3b] mb-2">
              LEGAL &amp; DATA PROTECTION
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              CineReward Privacy Policy
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Effective November 2026 • Applies to CineReward Web, Mobile, Booking &amp; Partner Portals
            </p>
          </div>

          <div className="space-y-6">
            {SECTIONS.map(({ icon: Icon, title, body }) => (
              <section
                key={title}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2"
              >
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#ff2e3b] shrink-0" />
                  <span>{title}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {body}
                </p>
              </section>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.08] text-xs text-slate-400">
            <span>Questions? Email adarshavg08@gmail.com</span>
            <Link to="/terms" className="text-[#ff2e3b] font-semibold hover:underline">
              Read Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
