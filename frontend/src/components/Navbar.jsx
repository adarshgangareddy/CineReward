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
  Home as HomeIcon,
  Tv,
  Layers,
  Grid,
  PlaySquare,
} from "lucide-react";
import SearchBar from "./SearchBar";
import BrandLogo from "./BrandLogo";
import { clearAllSessions, safeParseJSON } from "../utils/auth";
import { getWatchlist } from "../utils/watchlist";

const GENRES = [
  { label: "Action", to: "/catalog?genre=28" },
  { label: "Adventure", to: "/catalog?genre=12" },
  { label: "Animation", to: "/catalog?genre=16" },
  { label: "Crime", to: "/catalog?genre=80" },
  { label: "Comedy", to: "/catalog?genre=35" },
  { label: "Documentary", to: "/catalog?genre=99" },
  { label: "Drama", to: "/catalog?genre=18" },
  { label: "Fantasy", to: "/catalog?genre=14" },
  { label: "Family", to: "/catalog?genre=10751" },
  { label: "Horror", to: "/catalog?genre=27" },
  { label: "Mystery", to: "/catalog?genre=9648" },
  { label: "Romance", to: "/catalog?genre=10749" },
  { label: "Sci-Fi", to: "/catalog?genre=878" },
  { label: "Thriller", to: "/catalog?genre=53" },
  { label: "History", to: "/catalog?genre=36" },
  { label: "War", to: "/catalog?genre=10752" },
];

const CATEGORIES = [
  { label: "Top Rated", to: "/catalog?section=top-rated" },
  { label: "Bollywood Movies", to: "/catalog?section=bollywood" },
  { label: "Hollywood", to: "/catalog?section=hollywood" },
  { label: "South Indian", to: "/catalog?section=south-indian" },
  { label: "Now Playing", to: "/catalog?section=now-playing" },
  { label: "Upcoming", to: "/catalog?section=upcoming" },
  { label: "TV & Web Series", to: "/catalog?section=shows" },
  { label: "Anime & Ghibli", to: "/catalog?section=anime" },
  { label: "Korean Cinema", to: "/catalog?section=korean" },
  { label: "Featured", to: "/catalog?section=featured" },
];

const OTT_ITEMS = [
  { label: "Netflix", to: "/catalog?ott=netflix" },
  { label: "Prime Video", to: "/catalog?ott=prime" },
  { label: "JioHotstar / Disney+", to: "/catalog?ott=hotstar" },
  { label: "Apple TV+", to: "/catalog?ott=apple" },
];

const COLLECTION_ITEMS = [
  { label: "Marvel Collection", to: "/collection/marvel-collection" },
  { label: "DC Universe", to: "/collection/dc-universe" },
  { label: "Fast and Furious", to: "/collection/fast-and-furious" },
  { label: "Harry Potter / Wizarding", to: "/collection/harry-potter-wizarding" },
  { label: "John Wick Saga", to: "/collection/john-wick-saga" },
  { label: "Mission: Impossible", to: "/collection/mission-impossible" },
  { label: "Pirates of the Caribbean", to: "/collection/pirates-of-the-caribbean" },
  { label: "Star Wars Universe", to: "/collection/star-wars-universe" },
  { label: "Studio Ghibli Classics", to: "/collection/studio-ghibli" },
  { label: "Indian Blockbusters", to: "/collection/indian-blockbusters" },
  { label: "Sci-Fi Epics", to: "/collection/sci-fi-epics" },
  { label: "All collections", to: "/collections" },
];

const REWARDS_ITEMS = [
  { label: "My Tickets & Coins", to: "/dashboard" },
  { label: "My Watchlist", to: "/watchlist" },
  { label: "List Your Show", to: "/list-your-show" },
  { label: "Track Inquiry", to: "/partner-status" },
  { label: "About CineReward", to: "/about" },
  { label: "Movie Team Portal", to: "/team/login" },
  { label: "Admin Portal", to: "/super-admin-login" },
];

const DROPDOWN_MENUS = [
  { key: "genre", label: "Genre", subtitle: "Find your next favourite", icon: Film, items: GENRES },
  { key: "category", label: "Category", subtitle: "Browse curated cinema categories", icon: Grid, items: CATEGORIES },
  { key: "ott", label: "OTT", subtitle: "Streaming platforms & networks", icon: Tv, items: OTT_ITEMS },
  { key: "collection", label: "Collection", subtitle: "Find your next favourite universe", icon: Layers, items: COLLECTION_ITEMS },
  { key: "rewards", label: "Rewards", subtitle: "Tickets, coins & CineReward hubs", icon: Sparkles, items: REWARDS_ITEMS },
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
  const [mobileExpanded, setMobileExpanded] = useState(null);
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
    setMobileExpanded(null);
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
    window.dispatchEvent(new CustomEvent("cinereward:city", { detail: city }));
    setIsLocationModalOpen(false);
  };

  const handleLogout = () => {
    clearAllSessions();
    setUser(null);
    setTeam(null);
    setSuperAdmin(null);
    setIsAccountOpen(false);
    setIsMobileOpen(false);
    navigate("/login");
  };

  const activeMenu = DROPDOWN_MENUS.find((m) => m.key === openDropdown);

  const isMoviesTab =
    location.pathname.startsWith("/catalog") &&
    !location.search.includes("section=shows");
  const isSeriesTab =
    location.pathname.startsWith("/catalog") &&
    location.search.includes("section=shows");

  return (
    <>
      <header
        ref={navRef}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#07080d]/75 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.65)]"
            : "bg-gradient-to-b from-black/80 via-black/35 to-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-[74px] sm:h-20 flex items-center justify-between gap-3 relative">
          {/* Condensed Bold Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <BrandLogo size="sm" />
            {isLibraryPage && (
              <span className="hidden xl:inline-block text-[9px] font-bold tracking-[0.22em] text-slate-300 uppercase self-end pb-0.5">
                LIBRARY
              </span>
            )}
          </Link>

          {/* Desktop Centered Floating Glassmorphic Pill Nav */}
          <div className="hidden lg:flex flex-col items-center relative">
            <nav className="flex items-center gap-2 bg-black/45 backdrop-blur-2xl border border-white/[0.15] rounded-full px-2.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
              <Link
                to="/"
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  location.pathname === "/"
                    ? "bg-white/[0.16] text-white shadow-inner"
                    : "text-slate-200 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                Home
              </Link>

              {DROPDOWN_MENUS.map((menu) => {
                const isOpen = openDropdown === menu.key;
                return (
                  <button
                    key={menu.key}
                    type="button"
                    onClick={() => setOpenDropdown(isOpen ? null : menu.key)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                      isOpen
                        ? "bg-white/[0.16] text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>{menu.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {/* Wide Frosted Glass 4-Column Mega-Menu */}
            {activeMenu && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[680px] max-w-[92vw] bg-[#101420]/85 backdrop-blur-3xl border border-white/[0.15] rounded-2xl p-6 shadow-[0_32px_90px_rgba(0,0,0,0.85)] z-50">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-white leading-tight">
                    {activeMenu.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeMenu.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
                  {activeMenu.items.map((item) => (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      onClick={() => setOpenDropdown(null)}
                      className="text-xs font-medium text-slate-200 hover:text-white hover:translate-x-0.5 transition-all py-1 truncate"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Cluster (Mobile + Desktop clean circular glass buttons) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search movies and shows"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-xl border border-white/[0.14] flex items-center justify-center text-white transition-all"
            >
              <Search className="w-4 h-4" />
            </button>

            <Link
              to="/watchlist"
              aria-label="My Watchlist"
              className="hidden sm:flex relative w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-xl border border-white/[0.14] items-center justify-center text-white transition-all"
            >
              <Bookmark className="w-4 h-4" />
              {watchlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#e50914] text-[9px] font-black text-white flex items-center justify-center">
                  {watchlistCount > 99 ? "99+" : watchlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/catalog"
              aria-label="Catalog filters"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-xl border border-white/[0.14] flex items-center justify-center text-white transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.16] backdrop-blur-xl border border-white/[0.14] rounded-full px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-[#ff2e3b]" />
              <span>{selectedCity}</span>
            </button>

            {/* Auth / Role Trigger */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 bg-amber-500/15 backdrop-blur-xl border border-amber-400/30 px-3 py-1.5 rounded-full text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{user.coins || 0}</span>
                </Link>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                    aria-expanded={isAccountOpen}
                    className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-xl border border-white/[0.15] rounded-full p-1 sm:pl-1.5 sm:pr-3 sm:py-1 transition-all"
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
                    <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-300" />
                  </button>

                  {isAccountOpen && (
                    <div className="absolute right-0 top-12 w-56 glass-panel rounded-2xl p-2 z-50">
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
                        My Tickets &amp; Coins
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
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/team/dashboard"
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#e50914]/25 backdrop-blur-xl border border-[#e50914]/45 px-3.5 py-2 rounded-full hover:bg-[#e50914]/35 transition-all"
                >
                  <Film className="w-3.5 h-3.5 text-[#ff2e3b]" />
                  <span>Team Hub</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-red-500/20 border border-white/[0.14] flex items-center justify-center text-slate-200 hover:text-red-400 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : superAdmin ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/super-admin-dashboard"
                  className="flex items-center gap-1.5 text-xs font-bold text-red-200 bg-red-500/20 backdrop-blur-xl border border-red-500/40 px-3.5 py-2 rounded-full hover:bg-red-500/30 transition-all"
                >
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span>Admin Hub</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-red-500/20 border border-white/[0.14] flex items-center justify-center text-slate-200 hover:text-red-400 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex btn-crimson px-5 py-2 rounded-full text-xs font-bold items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open Explore Menu"
              className="lg:hidden w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-xl border border-white/[0.14] flex items-center justify-center text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Blurred Glass Overlay Sidebar (Matching Screenshot 9d074739.jpg) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-2xl flex items-start justify-end sm:justify-center p-4 overflow-y-auto"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-full max-w-sm mt-2 bg-[#111521]/90 backdrop-blur-3xl border border-white/[0.16] rounded-3xl p-6 shadow-[0_32px_90px_rgba(0,0,0,0.9)] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-base font-bold tracking-tight">
                Explore CineReward
              </span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Link
                to="/"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.06] text-sm font-semibold"
              >
                <HomeIcon className="w-4 h-4 text-slate-300" />
                <span>Home</span>
              </Link>

              {DROPDOWN_MENUS.map((menu) => {
                const Icon = menu.icon;
                const expanded = mobileExpanded === menu.key;
                return (
                  <div key={menu.key}>
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(expanded ? null : menu.key)}
                      className="w-full flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-white/[0.06] text-sm font-medium text-slate-200"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-300" />
                        <span>{menu.label}</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="grid grid-cols-2 gap-1.5 pl-9 pr-2 py-2">
                        {menu.items.map((item) => (
                          <Link
                            key={item.to + item.label}
                            to={item.to}
                            onClick={() => setIsMobileOpen(false)}
                            className="text-xs text-slate-300 hover:text-white py-1 truncate"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsLocationModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-white/[0.06] text-sm font-medium text-slate-200"
              >
                <span className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#ff2e3b]" />
                  <span>City: {selectedCity}</span>
                </span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.12] flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-slate-300">
              <Link to="/catalog?section=featured" onClick={() => setIsMobileOpen(false)} className="hover:text-white">
                Movies
              </Link>
              <Link to="/catalog?section=shows" onClick={() => setIsMobileOpen(false)} className="hover:text-white">
                Series
              </Link>
              <Link to="/watchlist" onClick={() => setIsMobileOpen(false)} className="hover:text-white">
                My List
              </Link>
              {user ? (
                <Link to="/dashboard" onClick={() => setIsMobileOpen(false)} className="text-[#ff2e3b] font-bold">
                  Dashboard
                </Link>
              ) : team ? (
                <Link to="/team/dashboard" onClick={() => setIsMobileOpen(false)} className="text-[#ff2e3b] font-bold">
                  Team Hub
                </Link>
              ) : superAdmin ? (
                <Link to="/super-admin-dashboard" onClick={() => setIsMobileOpen(false)} className="text-[#ff2e3b] font-bold">
                  Admin Hub
                </Link>
              ) : (
                <Link to="/login" onClick={() => setIsMobileOpen(false)} className="text-[#ff2e3b] font-bold">
                  Sign In
                </Link>
              )}
            </div>

            {(user || team || superAdmin) && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-bold text-red-300"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Glass Navigation Dock (Matching 4b102f2a.jpg / d6323759.jpg) */}
      <nav
        aria-label="Mobile quick navigation"
        className="lg:hidden fixed bottom-3.5 inset-x-4 z-40 bg-[#0d111a]/80 backdrop-blur-2xl border border-white/[0.16] rounded-full px-2 py-1.5 flex items-center justify-around shadow-[0_18px_50px_rgba(0,0,0,0.85)]"
      >
        <Link
          to="/"
          className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${
            location.pathname === "/"
              ? "bg-white/[0.14] text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <HomeIcon className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>

        <Link
          to="/catalog?section=featured"
          className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${
            isMoviesTab
              ? "bg-white/[0.14] text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <PlaySquare className="w-4 h-4 mb-0.5" />
          <span>Movies</span>
        </Link>

        <Link
          to="/catalog?section=shows"
          className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${
            isSeriesTab
              ? "bg-white/[0.14] text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Tv className="w-4 h-4 mb-0.5" />
          <span>Series</span>
        </Link>

        <Link
          to="/watchlist"
          className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-full text-[10px] font-medium transition-all ${
            location.pathname === "/watchlist"
              ? "bg-white/[0.14] text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Bookmark className="w-4 h-4 mb-0.5" />
          <span>My List</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Open Search"
          className="flex flex-col items-center justify-center px-3.5 py-1.5 rounded-full text-[10px] font-medium text-slate-400 hover:text-white transition-all"
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span>Search</span>
        </button>
      </nav>

      {/* Glassmorphic Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-2xl flex items-start justify-center pt-16 sm:pt-20 px-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-2xl p-5 sm:p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                Search Movies, Series &amp; Ghibli Classics
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] flex items-center justify-center text-slate-200"
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
                  className="text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.1] px-3 py-1.5 rounded-full text-slate-200 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* City Selector Glass Modal */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-2xl p-4"
          onClick={() => setIsLocationModalOpen(false)}
        >
          <div
            className="glass-panel rounded-3xl w-full max-w-3xl overflow-hidden relative p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 flex items-center justify-center transition-colors"
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
                        ? "bg-[#e50914]/20 border-[#e50914] text-white"
                        : "bg-white/[0.04] border-white/[0.1] text-slate-200 hover:bg-white/[0.1] hover:text-white"
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
