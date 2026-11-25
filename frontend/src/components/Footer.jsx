import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#07080d]/70 backdrop-blur-2xl border-t border-white/[0.08] py-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-8 border-b border-white/[0.06]">
          <div className="max-w-lg">
            <Link to="/" className="inline-flex items-stretch font-black tracking-tighter text-lg leading-none mb-4">
              <span className="bg-[#e50914] text-white px-2 py-1 rounded-l-md uppercase">
                CINE
              </span>
              <span className="border border-white/80 text-white px-2 py-1 rounded-r-md uppercase bg-black/40">
                REWARD
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed">
              CineReward blends next-gen cinema discovery with live theatre seat booking,
              AI-scored community reviews, and real reward coins redeemable for free tickets.
              Metadata powered by TMDB, TVMaze, Studio Ghibli &amp; OMDb public APIs.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div className="space-y-2.5">
              <p className="text-white font-bold uppercase tracking-wider text-[10px]">
                Discover
              </p>
              <Link to="/catalog?section=featured" className="block text-slate-400 hover:text-white transition-colors">
                All Movies
              </Link>
              <Link to="/collections" className="block text-slate-400 hover:text-white transition-colors">
                Collections
              </Link>
              <Link to="/catalog?section=shows" className="block text-slate-400 hover:text-white transition-colors">
                TV &amp; Web Series
              </Link>
              <Link to="/watchlist" className="block text-slate-400 hover:text-white transition-colors">
                My Watchlist
              </Link>
            </div>

            <div className="space-y-2.5">
              <p className="text-white font-bold uppercase tracking-wider text-[10px]">
                CineReward
              </p>
              <Link to="/dashboard" className="block text-slate-400 hover:text-white transition-colors">
                Tickets &amp; Coins
              </Link>
              <Link to="/list-your-show" className="block text-slate-400 hover:text-white transition-colors">
                List Your Show
              </Link>
              <Link to="/partner-status" className="block text-slate-400 hover:text-white transition-colors">
                Track Partner Inquiry
              </Link>
              <Link to="/about" className="block text-slate-400 hover:text-white transition-colors">
                About CineReward
              </Link>
            </div>

            <div className="space-y-2.5">
              <p className="text-white font-bold uppercase tracking-wider text-[10px]">
                Portals
              </p>
              <Link to="/login" className="block text-slate-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/team/login" className="block text-slate-400 hover:text-white transition-colors">
                Movie Team Portal
              </Link>
              <Link to="/super-admin-login" className="block text-slate-400 hover:text-white transition-colors">
                Admin Portal
              </Link>
              <a
                href="mailto:adarshavg08@gmail.com"
                className="block text-slate-400 hover:text-white transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/about" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/list-your-show" className="hover:text-slate-300 transition-colors">
              Partner Terms
            </Link>
            <a
              href="https://github.com/AdarshAGangareddy/CineReward"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
          </div>
          <p>Since 2026 • CineReward Cinema &amp; Rewards Platform</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
