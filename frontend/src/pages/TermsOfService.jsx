import { Link } from "react-router-dom";
import { FileText, ArrowLeft, Ticket, Coins, Users } from "lucide-react";

const TERMS = [
  {
    icon: Ticket,
    title: "1. Ticket Bookings & Venue Entry",
    body: "Confirmed M-Tickets are valid exclusively for the selected theatre, city location, screen, date, and seat numbers. Guests are advised to carry digital pass #TicketID at least 20 minutes before showtime.",
  },
  {
    icon: Coins,
    title: "2. CineReward Coins & Verified Reviews",
    body: "Reward coins are earned upon verified bookings (+25 coins per seat minimum) and studio-approved verified reviews (+100 bonus coins). Coins carry zero cash withdrawal value and apply toward eligible seat discounts inside CineReward.",
  },
  {
    icon: Users,
    title: "3. Role-Based Accounts & Movie Teams",
    body: "Movie Team Secret Keys are confidential partner credentials issued to verified filmmakers and distributors. Teams may rotate their secret key anytime from their dashboard and may only evaluate reviews for assigned titles.",
  },
  {
    icon: FileText,
    title: "4. Content Metadata & Fair Use",
    body: "Film posters, synopsis metadata, schedules, and regional directories are surfaced via licensed public cinema APIs (TMDB, TVMaze, Studio Ghibli, OMDb) solely for discovery and theatrical ticket booking.",
  },
];

const TermsOfService = () => {
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
              PLATFORM TERMS
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Last Updated November 2026 • CineReward Cinema &amp; Rewards Platform
            </p>
          </div>

          <div className="space-y-6">
            {TERMS.map(({ icon: Icon, title, body }) => (
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
            <Link to="/privacy-policy" className="text-[#ff2e3b] font-semibold hover:underline">
              ← View Privacy Policy
            </Link>
            <Link to="/login" className="text-white font-semibold hover:underline">
              Continue to Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
