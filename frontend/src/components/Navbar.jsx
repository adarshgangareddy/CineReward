import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  User,
  Shield,
  Film,
  Coins,
  Menu,
  X,
  Search,
  Bookmark,
  MapPin,
  ChevronDown,
  Ticket,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import SearchBar from "./SearchBar";
import { clearAllSessions, safeParseJSON } from "../utils/auth";
import { getWatchlist } from "../utils/watchlist";

const GENRES = [
  { label: "Action", value: "28" },
  { label: "Sci-Fi", value: "878" },
  { label: "Drama", value: "18" },
  { label: "Thriller", value: "53" },
  { label: "Comedy", value: "35" },
  { label: "Horror", value: "27" },
  { label: "Romance", value: "10749" },
  { label: "Animation", value: "16" },
  { label: "Adventure", value: "12" },
  { label: "Crime", value: "80" },
];

const CATEGORIES = [
  { label: "Featured Selections", to: "/catalog?section=featured" },
  { label: "Now Playing in Theatres", to: "/catalog?section=now-playing" },
  { label: "Bollywood Movies", to: "/catalog?section=bollywood" },
  { label: "Hollywood Movies", to: "/catalog?section=hollywood" },
  { label: "South Indian Hits", to: "/catalog?section=south-indian" },
  { label: "Web Series & Shows", to: "/catalog?section=shows" },
  { label: "Anime & Ghibli", to: "/catalog?section=anime" },
  { label: "Korean Cinema", to: "/catalog?section=korean" },
];

const OTT_ITEMS = [
  { label: "Netflix", to: "/catalog?ott=netflix" },
  { label: "Prime Video", to: "/catalog?ott=prime" },
  { label: "JioHotstar / Disney+", to: "/catalog?ott=hotstar" },
  { label: "Apple TV+", to: "/catalog?ott=apple" },
];

const COLLECTION_ITEMS = [
  { label: "Explore All Collections", to: "/collections" },
  { label: "Marvel Collection", to: "/collection/marvel-collection" },
  { label: "DC Universe", to: "/collection/dc-universe" },
  { label: "Fast & Furious Franchise", to: "/collection/fast-and-furious" },
  { label: "Studio Ghibli Classics", to: "/collection/studio-ghibli" },
  { label: "Indian Blockbusters", to: "/collection/indian-blockbusters" },
  { label: "John Wick Saga", to: "/collection/john-wick-saga" },
];

const REWARDS_ITEMS = [
  { label: "My Tickets & Coins", to: "/dashboard" },
  { label: "My Watchlist", to: "/watchlist" },
  { label: "List Your Show (Partner)", to: "/list-your-show" },
  { label: "Track Partner Inquiry", to: "/partner-status" },
  { label: "About CineReward", to: "/about" },
];

const CITIES = [
  { name: "Mumbai", icon: "🏰" },
  { name: "Delhi-NCR", icon: "🏛️" },
  { name: "Bengaluru", icon: "🏢" },
  { name: "Hyderabad", icon: "🕌" },
  { name: "Chandigarh", icon: "🏙️" },
  { name: "Chennai", icon: "⛱️" },
  { name: "Pune", icon: "⛰️" },
  { name: "Kolkata", icon: "🚊" },
  { name: "Kochi", icon: "🌴" },
  { name: "Ahmedabad", icon: "🏭" },
];

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [watchlistCount, setWatchlistCount] = useState(() => getWatchlist().length);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem("selectedCity") || "Bengaluru"
  );

  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isLibraryPage =
    location.pathname.startsWith("/catalog") ||
    location.pathname.startsWith("/collections") ||
    location.pathname.startsWith("/collection/");

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const parsedUser = safeParseJSON(localStorage.getItem("user"));
      setUser(parsedUser && token && token !== "undefined" ? parsedUser : null);

      const parsedTeam = safeParseJSON(localStorage.getItem("team"));
      setTeam(parsedTeam?.token ? parsedTeam : null);

      const parsedAdmin = safeParseJSON(localStorage.getItem("superAdmin"));
      setSuperAdmin(parsedAdmin?.token ? parsedAdmin : null);
    };

    const handleWatchlistChange = () => {
      setWatchlistCount(getWatchlist().length);
    };

    handleStorageChange();
    handleWatchlistChange();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userUpdated", handleStorageChange);
    window.addEventListener("watchlistUpdated", handleWatchlistChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userUpdated", handleStorageChange);
      window.removeEventListener("watchlistUpdated", handleWatchlistChange);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setIsAccountOpen(false);
    setIsMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    localStorage.setItem("selectedCity", city);
    setIsLocationModalOpen(false);
  };

  const handleLogout = () => {
    clearAllSessions();
    setUser(null);
    setTeam(null);
    setSuperAdmin(null);
    setIsAccountOpen(false);
    navigate("/login");
  };

  const dropdownMenus = [
    {
      key: "genre",
      label: "Genre",
      items: GENRES.map((g) => ({ label: g.label, to: `/catalog?genre=${g.value}` })),
    },
    { key: "category", label: "Category", items: CATEGORIES },
    { key: "ott", label: "OTT", items: OTT_ITEMS },
    { key: "collections", label: "Collection", items: COLLECTION_ITEMS },
    { key: "rewards", label: "Rewards", items: REWARDS_ITEMS },
  ];

  return (
    <>
      <header
        ref={navRef}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#09090d]/85 backdrop-blur-2xl border-b border-white/[0.07] shadow-[0_10px_40px_rgba(0,0,0,0.65)]"
            : "bg-gradient-to-b from-[#09090d]/95 via-[#09090d]/70 to-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo matching MultiMovies dual-box style */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="flex items-stretch font-black tracking-tighter text-lg sm:text-xl leading-none shadow-lg">
              <span className="bg-[#e50914] text-white px-2 py-1 rounded-l-md uppercase">
                CINE
              </span>
              <span className="border border-white/80 text-white px-2 py-1 rounded-r-md uppercase bg-black/40 group-hover:bg-white group-hover:text-black transition-colors">
                REWARD
              </span>
            </div>
            {isLibraryPage && (
              <span className="hidden xl:inline-block text-[9px] font-bold tracking-[0.22em] text-slate-400 uppercase self-end pb-0.5">
                LIBRARY
              </span>
            )}
          </Link>

          {/* Center Floating Glassmorphic Pill Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.06] backdrop-blur-2xl border border-white/[0.11] rounded-full px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <Link
              to="/"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                location.pathname === "/"
                  ? "bg-white/[0.16] text-white shadow-inner"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              Home
            </Link>

            {dropdownMenus.map((menu) => {
              const isOpen = openDropdown === menu.key;
              return (
                <div key={menu.key} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(isOpen ? null : menu.key)}
                    className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isOpen
                        ? "bg-white/[0.14] text-white"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{menu.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-12 w-56 bg-[#111119]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-2 shadow-[0_24px_60px_rgba(0,0,0,0.85)] z-50">
                      {menu.items.map((item) => (
                        <Link
                          key={item.to + item.label}
                          to={item.to}
                          onClick={() => setOpenDropdown(null)}
                          className="block px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search movies and shows"
              title="Search movies, series & collections"
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.1] flex items-center justify-center text-slate-200 transition-all"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Watchlist Bookmark Trigger */}
            <Link
              to="/watchlist"
              aria-label="My Watchlist"
              title="My Watchlist"
              className="relative w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.1] flex items-center justify-center text-slate-200 transition-all"
            >
              <Bookmark className="w-4 h-4" />
              {watchlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#e50914] text-[9px] font-black text-white flex items-center justify-center">
                  {watchlistCount > 99 ? "99+" : watchlistCount}
                </span>
              )}
            </Link>

            {/* Catalog / Filter Shortcut */}
            <Link
              to="/catalog"
              aria-label="Explore full catalog"
              title="Explore Catalog & Filters"
              className="hidden sm:flex w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.1] items-center justify-center text-slate-200 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Link>

            {/* City Selector Pill */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-[#ff2e3b]" />
              <span>{selectedCity}</span>
            </button>

            {/* Role / Auth Section */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-full text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{user.coins || 0}</span>
                </Link>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                    aria-expanded={isAccountOpen}
                    className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.12] rounded-full pl-1.5 pr-3 py-1 transition-all"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#e50914] flex items-center justify-center text-xs font-black text-white">
                        {user.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span className="hidden xl:inline text-xs font-semibold text-white max-w-[90px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isAccountOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-[#111119]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-2 shadow-2xl z-50">
                      <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {user.email || user.phone || "CineReward Member"}
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-xs font-medium text-slate-200"
                      >
                        <Ticket className="w-3.5 h-3.5 text-[#ff2e3b]" />
                        My Tickets & Coins
                      </Link>
                      <Link
                        to="/watchlist"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-xs font-medium text-slate-200"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                        Watchlist ({watchlistCount})
                      </Link>
                      <Link
                        to="/list-your-show"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.08] text-xs font-medium text-slate-200"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Partner With Us
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl hover:bg-red-500/15 text-xs font-semibold text-red-400 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : team ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/team/dashboard"
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#e50914]/20 border border-[#e50914]/40 px-3.5 py-1.5 rounded-full hover:bg-[#e50914]/30 transition-all"
                >
                  <Film className="w-3.5 h-3.5 text-[#ff2e3b]" />
                  <span>Team Hub</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-red-500/20 border border-white/[0.1] flex items-center justify-center text-slate-300 hover:text-red-400 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : superAdmin ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/super-admin-dashboard"
                  className="flex items-center gap-1.5 text-xs font-bold text-red-300 bg-red-500/15 border border-red-500/35 px-3.5 py-1.5 rounded-full hover:bg-red-500/25 transition-all"
                >
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span>Admin Hub</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-red-500/20 border border-white/[0.1] flex items-center justify-center text-slate-300 hover:text-red-400 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-crimson px-4 sm:px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle mobile menu"
              className="lg:hidden w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white"
            >
              {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileOpen && (
          <div className="lg:hidden bg-[#0e0e15]/95 backdrop-blur-2xl border-t border-white/[0.08] px-6 py-5 space-y-4">
            <SearchBar />
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <Link to="/" className="glass-card rounded-xl px-3.5 py-2.5 text-white">
                Home
              </Link>
              <Link to="/catalog" className="glass-card rounded-xl px-3.5 py-2.5 text-slate-200">
                All Movies
              </Link>
              <Link to="/collections" className="glass-card rounded-xl px-3.5 py-2.5 text-slate-200">
                Collections
              </Link>
              <Link to="/catalog?section=shows" className="glass-card rounded-xl px-3.5 py-2.5 text-slate-200">
                TV & Series
              </Link>
              <Link to="/watchlist" className="glass-card rounded-xl px-3.5 py-2.5 text-slate-200">
                Watchlist ({watchlistCount})
              </Link>
              <Link to="/list-your-show" className="glass-card rounded-xl px-3.5 py-2.5 text-slate-200">
                List Your Show
              </Link>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(false);
                setIsLocationModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 glass-card rounded-xl py-2.5 text-xs font-semibold text-slate-200"
            >
              <MapPin className="w-3.5 h-3.5 text-[#ff2e3b]" /> City: {selectedCity}
            </button>
          </div>
        )}
      </header>

      {/* Glassmorphic Global Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-start justify-center pt-20 px-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Search Movies, Series & Ghibli Classics
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.15] flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SearchBar modalMode onNavigate={() => setIsSearchOpen(false)} />
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["Now Playing", "/catalog?section=now-playing"],
                ["Marvel Collection", "/collection/marvel-collection"],
                ["Studio Ghibli", "/collection/studio-ghibli"],
                ["Bollywood", "/catalog?section=bollywood"],
                ["Top Shows", "/catalog?section=shows"],
              ].map(([label, to]) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[11px] font-semibold bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] px-3 py-1.5 rounded-full text-slate-300 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Obsidian Glassmorphic City Modal */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
          onClick={() => setIsLocationModalOpen(false)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-3xl overflow-hidden relative p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2.5 mb-6">
              <MapPin className="w-5 h-5 text-[#ff2e3b]" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Select Your Cinema City
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {CITIES.map((city) => {
                const active = selectedCity === city.name;
                return (
                  <button
                    type="button"
                    key={city.name}
                    onClick={() => handleCitySelect(city.name)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      active
                        ? "bg-[#e50914]/15 border-[#e50914] text-white"
                        : "bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <span className="text-2xl">{city.icon}</span>
                    <span className="text-xs font-semibold">{city.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
