import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  Film,
  Ticket,
  PlusCircle,
  Activity,
  Mail,
  Phone,
  Briefcase,
  IndianRupee,
  MessageSquare,
  Check,
  X,
  Clock,
  CreditCard,
  Edit3,
  Save,
  Trash2,
  Upload,
  Plus,
  ExternalLink,
  Copy,
  CheckCircle2,
  KeyRound,
  Clapperboard,
  Coins,
  Search,
  RefreshCw,
  Star,
  Sparkles,
} from "lucide-react";
import { getActiveSession, clearAllSessions } from "../utils/auth";
import { resolveMoviePoster } from "../utils/media";
import { supabase } from "../lib/supabase";
import {
  generate16DigitKey,
  generateCineRewardEmail,
} from "../utils/teamKeyGen";
import GlassUploadBox from "../components/GlassUploadBox";
import LoadingSpinner from "../components/LoadingSpinner";

const COUNTRY_OPTIONS = [
  { country: "IN", code: "INR", symbol: "₹", label: "India (INR ₹)" },
  { country: "US", code: "USD", symbol: "$", label: "United States (USD $)" },
  { country: "GB", code: "GBP", symbol: "£", label: "United Kingdom (GBP £)" },
  { country: "JP", code: "JPY", symbol: "¥", label: "Japan (JPY ¥)" },
  { country: "KR", code: "KRW", symbol: "₩", label: "South Korea (KRW ₩)" },
  { country: "FR", code: "EUR", symbol: "€", label: "Europe (EUR €)" },
];

const MOVIE_CATEGORY_FILTERS = [
  { id: "home-all", label: "All Home Movies" },
  { id: "now-playing", label: "Now Playing" },
  { id: "trending", label: "Trending" },
  { id: "bollywood", label: "Bollywood" },
  { id: "hollywood", label: "Hollywood" },
  { id: "south-indian", label: "South Indian" },
  { id: "upcoming", label: "Upcoming" },
  { id: "top-rated", label: "Top Rated" },
  { id: "shows", label: "Web Series" },
  { id: "custom", label: "Added by Admin" },
];

const GLASS_INPUT_CLASS =
  "w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914] focus:bg-white/[0.07] transition-all";

const INITIAL_MOVIE_FORM = {
  title: "",
  tagline: "Experience it in IMAX & Dolby Atmos",
  overview: "",
  director: "",
  language: "English",
  releaseDate: "2026-12-18",
  runtime: 150,
  certification: "UA 16+",
  quality: "IMAX 4K",
  genres: "Action, Adventure, Drama",
  country: "IN",
  currencyCode: "INR",
  currencySymbol: "₹",
  totalBudget: "",
  totalCollections: "",
  posterUrl: "",
  backdropUrl: "",
  galleryInput: "",
  galleryPhotos: [],
  trailerUrl: "",
  classicPrice: 250,
  grandPrice: 380,
  majesticPrice: 560,
  rewardCoinsPerSeat: 25,
  upi: true,
  card: true,
  wallets: true,
  coinsRedeemable: true,
  cast: [{ name: "", character: "", photoUrl: "" }],
  theatres: [
    {
      city: "Bengaluru",
      name: "PVR ICON: Orion Mall",
      area: "Rajajinagar",
      badge: "IMAX 4K • Dolby Atmos",
      price: 380,
    },
  ],
  teamName: "",
  teamEmail: "",
  teamSecretKey: "",
};

const readImageAsCompressedDataUrl = (file, maxWidth = 900) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const dedupeMovies = (list = []) => {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item) continue;
    const key = String(item.customId || item.id || "");
    if (!key || seen.has(key)) continue;
    if (!item.poster_path && !item.posterUrl && !item.poster) continue;
    seen.add(key);
    out.push({
      ...item,
      id: item.customId || item.id,
      poster_path: item.poster_path || item.posterUrl || item.poster,
    });
  }
  return out;
};

const InfoChip = ({ icon, label, value }) => (
  <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-3 rounded-xl flex items-center gap-2.5 min-w-0">
    <div className="shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="font-semibold text-white truncate">{value}</p>
    </div>
  </div>
);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    teams: 0,
    tickets: 0,
    reviews: 0,
    revenue: 0,
  });
  const [customMovies, setCustomMovies] = useState([]);
  const [teams, setTeams] = useState([]);
  const [homeFeed, setHomeFeed] = useState({});
  const [movies, setMovies] = useState([]);
  const [movieCategory, setMovieCategory] = useState("home-all");
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exact Requested Tab Order: 1. Assign Movie Team, 2. Movies & Template, 3. Budget Ledger, 4. Payment History, 5. Partner Requests
  const [activeTab, setActiveTab] = useState("teams");

  // Click-Movie Assign Modal State
  const [assignModalMovie, setAssignModalMovie] = useState(null);
  const [assignForm, setAssignForm] = useState({
    name: "",
    email: "",
    secretKey: "",
    password: "",
  });
  const [assigningMovieTeam, setAssigningMovieTeam] = useState(false);

  // Custom Movie Template Modal State
  const [showMovieBuilder, setShowMovieBuilder] = useState(false);
  const [movieForm, setMovieForm] = useState(INITIAL_MOVIE_FORM);
  const [publishingMovie, setPublishingMovie] = useState(false);
  const [provisionedCreds, setProvisionedCreds] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Manual Team Form & Edit State
  const [newTeam, setNewTeam] = useState({
    name: "",
    email: "",
    password: "",
    secretKey: "",
    assignedMovies: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

  // Partner Lead Action State
  const [actionModal, setActionModal] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const [session] = useState(() => getActiveSession());

  const allHomeMovies = useMemo(() => {
    return dedupeMovies([
      ...(customMovies || []),
      ...(homeFeed.featured || []),
      ...(homeFeed.nowPlaying || []),
      ...(homeFeed.trending || []),
      ...(homeFeed.topMovies || []),
      ...(homeFeed.popularShows || []),
      ...(homeFeed.topShows || []),
      ...(homeFeed.heroSlides || []),
    ]);
  }, [customMovies, homeFeed]);

  // Map movieId -> array of assigned teams for fast badge display
  const teamsByMovieId = useMemo(() => {
    const map = {};
    for (const t of teams) {
      for (const mId of t.assignedMovies || []) {
        const key = String(mId);
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    }
    return map;
  }, [teams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        customMoviesRes,
        teamsRes,
        homeRes,
        leadsRes,
        paymentsRes,
      ] = await Promise.all([
        axios.get("/api/admin/stats").catch(() => ({ data: { users: 0, teams: 0, tickets: 0, reviews: 0, revenue: 0 } })),
        axios.get("/api/admin/movies").catch(() => ({ data: [] })),
        axios.get("/api/admin/teams").catch(() => ({ data: [] })),
        axios.get("/api/movies/home").catch(() => ({ data: {} })),
        axios.get("/api/admin/partner/leads").catch(() => ({ data: [] })),
        axios.get("/api/admin/partner/payment-history").catch(() => ({ data: [] })),
      ]);

      const customList = Array.isArray(customMoviesRes.data) ? customMoviesRes.data : [];
      const feed = homeRes.data || {};
      setStats(statsRes.data);
      setCustomMovies(customList);
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      setHomeFeed(feed);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);

      const merged = dedupeMovies([
        ...customList,
        ...(feed.featured || []),
        ...(feed.nowPlaying || []),
        ...(feed.trending || []),
        ...(feed.topMovies || []),
        ...(feed.popularShows || []),
        ...(feed.topShows || []),
        ...(feed.heroSlides || []),
      ]);
      setMovies(merged);
    } catch (error) {
      console.error("Error fetching admin data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session || session.role !== "super_admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [navigate, session, fetchData]);

  const handleCategoryChange = async (catId) => {
    setMovieCategory(catId);
    setSearchQuery("");

    if (catId === "home-all") {
      setMovies(allHomeMovies);
      return;
    }
    if (catId === "custom") {
      setMovies(dedupeMovies(customMovies));
      return;
    }
    if (catId === "trending" && homeFeed.trending?.length) {
      setMovies(dedupeMovies(homeFeed.trending));
      return;
    }

    setLoadingCategory(true);
    try {
      const res = await axios.get("/api/movies/catalog", {
        params: { section: catId, page: 1 },
      });
      const items = res.data?.results || res.data?.items || res.data || [];
      setMovies(dedupeMovies(Array.isArray(items) ? items : []));
    } catch (err) {
      console.error("Failed loading movie category:", err);
      setMovies(allHomeMovies);
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      handleCategoryChange(movieCategory);
      return;
    }
    setIsSearching(true);
    try {
      const res = await axios.get(`/api/movies/search?q=${encodeURIComponent(query)}`);
      const localMatches = customMovies.filter((m) =>
        m.title?.toLowerCase().includes(query.trim().toLowerCase())
      );
      setMovies(dedupeMovies([...localMatches, ...(res.data || [])]));
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const openAssignMovieModal = (movie) => {
    const movieTitle = movie.title || movie.name || "Movie";
    const autoEmail = generateCineRewardEmail(movieTitle, teams);
    const autoKey = generate16DigitKey();
    setAssignModalMovie(movie);
    setAssignForm({
      name: `${movieTitle} Team`,
      email: autoEmail,
      secretKey: autoKey,
      password: "",
    });
  };

  const handleAssignMovieSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalMovie) return;
    setAssigningMovieTeam(true);
    setSuccessMsg("");
    try {
      const targetId = String(assignModalMovie.customId || assignModalMovie.id);
      const emailToUse =
        assignForm.email.trim() ||
        generateCineRewardEmail(assignModalMovie.title || assignForm.name, teams);
      const keyToUse = assignForm.secretKey.trim() || generate16DigitKey();

      await axios.post("/api/admin/create-team", {
        name: assignForm.name.trim() || `${assignModalMovie.title} Team`,
        email: emailToUse,
        password: assignForm.password || undefined,
        secretKey: keyToUse,
        assignedMovies: [targetId],
      });

      setProvisionedCreds({
        movieTitle: assignModalMovie.title || assignModalMovie.name,
        movieId: targetId,
        teamName: assignForm.name.trim(),
        teamEmail: emailToUse,
        secretKey: keyToUse,
      });
      setSuccessMsg(
        `Assigned "${assignModalMovie.title}" -> Email: ${emailToUse} • 16-Digit Key: ${keyToUse}`
      );
      setAssignModalMovie(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign team");
    } finally {
      setAssigningMovieTeam(false);
    }
  };

  const handleUploadImageField = async (file, onDone) => {
    if (!file) return;
    try {
      const dataUrl = await readImageAsCompressedDataUrl(file);
      onDone(dataUrl);
    } catch {
      alert("Could not process image file. Please try another JPEG/PNG image.");
    }
  };

  const handlePublishMovie = async (e) => {
    e.preventDefault();
    setPublishingMovie(true);
    try {
      const generatedEmail =
        movieForm.teamEmail.trim() ||
        (movieForm.teamName.trim()
          ? generateCineRewardEmail(movieForm.teamName, teams)
          : "");
      const generatedKey =
        movieForm.teamSecretKey.trim() || generate16DigitKey();

      const res = await axios.post("/api/admin/movies", {
        title: movieForm.title,
        tagline: movieForm.tagline,
        overview: movieForm.overview,
        director: movieForm.director,
        language: movieForm.language,
        releaseDate: movieForm.releaseDate,
        runtime: Number(movieForm.runtime) || 145,
        certification: movieForm.certification,
        quality: movieForm.quality,
        genres: movieForm.genres,
        country: movieForm.country,
        currencyCode: movieForm.currencyCode,
        currencySymbol: movieForm.currencySymbol,
        totalBudget: Number(movieForm.totalBudget) || 0,
        totalCollections: Number(movieForm.totalCollections) || 0,
        posterUrl: movieForm.posterUrl,
        backdropUrl: movieForm.backdropUrl || movieForm.posterUrl,
        galleryPhotos: [
          ...movieForm.galleryPhotos,
          ...movieForm.galleryInput
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        ],
        trailerUrl: movieForm.trailerUrl,
        cast: movieForm.cast.filter((c) => c.name?.trim()),
        ticketPricing: {
          classic: Number(movieForm.classicPrice) || 240,
          grand: Number(movieForm.grandPrice) || 360,
          majestic: Number(movieForm.majesticPrice) || 540,
        },
        theatres: movieForm.theatres.filter((t) => t.name?.trim()),
        paymentConfig: {
          upi: movieForm.upi,
          card: movieForm.card,
          wallets: movieForm.wallets,
          netBanking: true,
          coinsRedeemable: movieForm.coinsRedeemable,
          rewardCoinsPerSeat: Number(movieForm.rewardCoinsPerSeat) || 25,
        },
        teamName: movieForm.teamName,
        teamEmail: generatedEmail,
        teamSecretKey: generatedKey,
      });

      setShowMovieBuilder(false);
      setMovieForm(INITIAL_MOVIE_FORM);
      if (res.data?.team) {
        setProvisionedCreds({
          movieTitle: res.data.movie?.title,
          movieId: res.data.movie?.customId,
          teamName: res.data.team.name,
          teamEmail: res.data.team.email,
          secretKey:
            res.data.team.newlyGeneratedSecretKey ||
            res.data.team.secretKeyHint ||
            "Linked Existing Key",
        });
      }
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to publish custom movie.");
    } finally {
      setPublishingMovie(false);
    }
  };

  const handleDeleteCustomMovie = async (movieId, title) => {
    if (!window.confirm(`Delete "${title}" from custom catalog?`)) return;
    try {
      await axios.delete(`/api/admin/movies/${movieId}`);
      fetchData();
    } catch {
      alert("Failed to delete movie.");
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setSuccessMsg("");
    try {
      const assignedMoviesArray = newTeam.assignedMovies
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const generatedEmail =
        newTeam.email.trim() || generateCineRewardEmail(newTeam.name, teams);
      const generatedKey = newTeam.secretKey.trim() || generate16DigitKey();

      await axios.post("/api/admin/create-team", {
        ...newTeam,
        email: generatedEmail,
        secretKey: generatedKey,
        assignedMovies: assignedMoviesArray,
      });
      setProvisionedCreds({
        movieTitle: assignedMoviesArray.join(", ") || newTeam.name,
        movieId: assignedMoviesArray[0] || "Team",
        teamName: newTeam.name,
        teamEmail: generatedEmail,
        secretKey: generatedKey,
      });
      setSuccessMsg(
        `Team "${newTeam.name}" created! Email: ${generatedEmail} • 16-Digit Key: ${generatedKey}`
      );
      setNewTeam({
        name: "",
        email: "",
        password: "",
        secretKey: "",
        assignedMovies: "",
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setIsUpdatingTeam(true);
    try {
      await axios.patch(`/api/admin/teams/${editingTeam._id}`, {
        ...editingTeam,
        assignedMovies: editingTeam.assignedMoviesInput
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      });
      setSuccessMsg(`Team "${editingTeam.name}" updated successfully.`);
      if (editingTeam.secretKey?.trim()) {
        setProvisionedCreds({
          movieTitle: editingTeam.assignedMoviesInput || editingTeam.name,
          movieId: editingTeam.assignedMoviesInput,
          teamName: editingTeam.name,
          teamEmail: editingTeam.email,
          secretKey: editingTeam.secretKey.trim(),
        });
      }
      setEditingTeam(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update team");
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const { type, lead } = actionModal;
      const body = {
        status:
          type === "accept"
            ? "Accepted"
            : type === "negotiate"
              ? "Negotiating"
              : "Rejected",
      };
      if (type === "accept") {
        body.paymentAmount = Number(modalAmount) || lead.budget;
        body.message = modalInput;
      }
      if (type === "negotiate") body.message = modalInput;
      if (type === "reject") body.rejectReason = modalInput;
      await axios.patch(`/api/admin/partner/lead/${lead._id}`, body);
      setActionModal(null);
      setModalInput("");
      setModalAmount("");
      fetchData();
    } catch {
      alert("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (code) => {
    try {
      await axios.post("/api/admin/partner/confirm-payment", { paymentCode: code });
      fetchData();
    } catch {
      alert("Failed to confirm payment");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading Super Admin Control Center..." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] pb-28 lg:pb-16">
      {/* Header */}
      <div className="bg-black/45 backdrop-blur-xl border-b border-white/[0.08] py-8 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e50914]/15 border border-[#e50914]/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-[#ff2e3b]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Super Admin Control Center
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                Assign Movie Teams (@cinereward.com + 16-Digit Key), Publish Template Movies &amp; Track Ledgers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setShowMovieBuilder(true)}
              className="btn-crimson px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              <Clapperboard className="w-4 h-4" />
              + Add Movie (Template)
            </button>
            <button
              type="button"
              onClick={() => {
                clearAllSessions();
                supabase?.auth.signOut().catch(() => {});
                navigate("/login");
              }}
              className="glass-button px-5 py-2.5 rounded-xl text-xs font-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 min-w-0">
        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {[
            [Users, "Users", stats.users, "text-sky-300", "bg-sky-500/10"],
            [Film, "Total Catalog", allHomeMovies.length, "text-[#ff2e3b]", "bg-[#e50914]/15"],
            [KeyRound, "Movie Teams", stats.teams || teams.length, "text-purple-300", "bg-purple-500/10"],
            [Ticket, "Bookings", stats.tickets, "text-emerald-300", "bg-emerald-500/10"],
            [Activity, "Fee Revenue", `₹${Math.round(stats.revenue || 0)}`, "text-amber-300", "bg-amber-500/10"],
          ].map(([Icon, label, value, color, background]) => (
            <div key={label} className="glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 min-w-0">
              <div className={`w-10 h-10 rounded-xl ${background} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-white truncate">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Newly Provisioned Credentials Banner */}
        {provisionedCreds && (
          <div className="bg-emerald-500/15 backdrop-blur-2xl border border-emerald-400/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Movie Team Provisioned: {provisionedCreds.movieTitle} ({provisionedCreds.movieId})
              </p>
              <p className="text-slate-200">
                Team Email: <strong className="text-white">{provisionedCreds.teamEmail}</strong> • 16-Digit Secret Key:{" "}
                <strong className="font-mono text-amber-300 bg-black/40 px-2.5 py-0.5 rounded select-all">
                  {provisionedCreds.secretKey}
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Email: ${provisionedCreds.teamEmail} | Secret Key: ${provisionedCreds.secretKey}`
                  );
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedKey ? "Copied!" : "Copy Key"}
              </button>
              <button
                type="button"
                onClick={() => setProvisionedCreds(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs in Exact Priority Order */}
        <div className="flex flex-wrap gap-2 bg-white/[0.04] backdrop-blur-xl p-1.5 rounded-2xl border border-white/[0.08] w-fit max-w-full">
          {[
            { id: "teams", label: `Assign Movie Team (${teams.length})` },
            { id: "movies", label: `Movies & Template (${allHomeMovies.length})` },
            { id: "financials", label: "Budget & Currency Ledger" },
            { id: "payments", label: `Payment History (${payments.length})` },
            { id: "leads", label: `Partner Requests (${leads.filter((l) => l.status === "Pending").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#e50914] text-white shadow-lg shadow-red-900/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1 (DEFAULT): ASSIGN MOVIE TEAM — Full Home & Catalog Movies + Click Movie -> Auto Email & 16-Digit Key */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#ff2e3b]" />
                    Click Any Movie to Assign Team (@cinereward.com + 16-Digit Key)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Showing all Home &amp; Catalog movies ({movies.length}). Click any movie poster to auto-generate a unique team email &amp; 16-digit secret key.
                  </p>
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={isSearching ? "Searching movies..." : "Search any movie or ID..."}
                    className="w-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] pl-9 pr-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
                  />
                </div>
              </div>

              {/* Category Pills matching Home/Catalog */}
              <div className="flex flex-wrap gap-2">
                {MOVIE_CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                      movieCategory === cat.id && !searchQuery
                        ? "bg-[#e50914] border-[#e50914] text-white"
                        : "bg-white/[0.04] border-white/[0.1] text-slate-300 hover:bg-white/[0.1] hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {loadingCategory ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner message="Loading catalog movies..." />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {movies.map((movie) => {
                    const mKey = String(movie.customId || movie.id);
                    const assignedList = teamsByMovieId[mKey] || [];
                    return (
                      <div
                        key={mKey}
                        onClick={() => openAssignMovieModal(movie)}
                        className={`group cursor-pointer relative rounded-2xl overflow-hidden border transition-all aspect-[2/3] bg-white/[0.03] ${
                          assignedList.length > 0
                            ? "border-emerald-400/60 ring-1 ring-emerald-400/30"
                            : "border-white/[0.1] hover:border-[#e50914]"
                        }`}
                      >
                        <img
                          src={resolveMoviePoster(movie.poster_path, movie.id)}
                          alt={movie.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                          {assignedList.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 text-[9px] font-extrabold uppercase tracking-wide">
                              {assignedList.length} Team
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-slate-200 text-[9px] font-bold border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity">
                              + Assign Team
                            </span>
                          )}
                          {movie.vote_average ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-black/70 text-amber-300 text-[9px] font-bold inline-flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-300" />
                              {Number(movie.vote_average).toFixed(1)}
                            </span>
                          ) : null}
                        </div>

                        <div className="absolute bottom-0 left-0 w-full p-2.5">
                          <p className="text-white text-xs font-bold line-clamp-1">
                            {movie.title}
                          </p>
                          <p className="text-slate-400 text-[10px] truncate">
                            {movie.release_date?.slice(0, 4) || movie.year || "2026"} • ID: {mKey}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Provision Form + Separate Movie Teams Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
              <div className="lg:col-span-1 min-w-0">
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-[#ff2e3b]" /> Quick Manual Team Setup
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Or click any movie above to auto-fill everything.
                    </p>
                  </div>
                  {successMsg && (
                    <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-medium break-words">
                      {successMsg}
                    </div>
                  )}
                  <form onSubmit={handleCreateTeam} className="space-y-3">
                    <input
                      required
                      type="text"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      className={GLASS_INPUT_CLASS}
                      placeholder="Team Name (e.g. Kalki Productions)"
                    />
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newTeam.email}
                        onChange={(e) => setNewTeam({ ...newTeam, email: e.target.value })}
                        className={GLASS_INPUT_CLASS}
                        placeholder="team@cinereward.com"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewTeam({
                            ...newTeam,
                            email: generateCineRewardEmail(newTeam.name || "studio", teams),
                          })
                        }
                        title="Generate @cinereward.com email"
                        className="glass-button px-3 rounded-xl text-[11px] font-bold shrink-0"
                      >
                        @Email
                      </button>
                    </div>
                    <input
                      required
                      type="text"
                      value={newTeam.assignedMovies}
                      onChange={(e) => setNewTeam({ ...newTeam, assignedMovies: e.target.value })}
                      className={GLASS_INPUT_CLASS}
                      placeholder="Assigned Movie IDs (e.g. 656908, cr-...)"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTeam.secretKey}
                        onChange={(e) => setNewTeam({ ...newTeam, secretKey: e.target.value })}
                        className={`${GLASS_INPUT_CLASS} font-mono font-bold`}
                        placeholder="16-Digit Secret Key"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewTeam({ ...newTeam, secretKey: generate16DigitKey() })
                        }
                        className="glass-button px-3 rounded-xl text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        16-Digit
                      </button>
                    </div>
                    <input
                      type="password"
                      value={newTeam.password}
                      onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                      className={GLASS_INPUT_CLASS}
                      placeholder="Optional Secondary Password"
                    />
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full btn-crimson py-3 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {isCreating ? "Assigning..." : "Create Team (Argon2d)"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 min-w-0 glass-card rounded-3xl p-5 sm:p-6 overflow-x-auto">
                <h2 className="text-base font-bold text-white mb-4">
                  Movie Teams &amp; 16-Digit Secret Key Table
                </h2>
                {teams.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">
                    No movie teams assigned yet. Click any movie card above to assign a team!
                  </p>
                ) : (
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[10px] uppercase text-slate-400">
                        <th className="pb-3 pr-4">Team</th>
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4">Assigned Movies</th>
                        <th className="pb-3 pr-4">Secret Key</th>
                        <th className="pb-3 pr-4">Quota</th>
                        <th className="pb-3 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {teams.map((team) => (
                        <tr key={team._id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 pr-4 font-bold text-white">{team.name}</td>
                          <td className="py-3.5 pr-4 text-slate-300">{team.email}</td>
                          <td className="py-3.5 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {(team.assignedMovies || []).map((id) => (
                                <span
                                  key={id}
                                  className="text-[10px] font-bold text-[#ff2e3b] bg-[#e50914]/15 px-2 py-0.5 rounded"
                                >
                                  {id}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 font-mono text-amber-300">
                            {team.secretKeyHint || team.secretKey || "••••"}
                          </td>
                          <td className="py-3.5 pr-4 text-emerald-300 font-bold">
                            {team.freeTicketsCount || 0}
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingTeam({
                                  ...team,
                                  password: "",
                                  secretKey: "",
                                  assignedMoviesInput: (team.assignedMovies || []).join(", "),
                                })
                              }
                              className="glass-button px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Edit / Key
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MOVIES & TEMPLATE (Custom Template Movies + Full Live Home/Catalog Movies) */}
        {activeTab === "movies" && (
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-5 sm:p-6 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clapperboard className="w-5 h-5 text-[#ff2e3b]" />
                    Published Movies (Unified Template)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Movies added with the template automatically include unified banner, gallery, cast, trailer, country currency &amp; 10-theatre booking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMovieBuilder(true)}
                  className="btn-crimson px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Movie with Template
                </button>
              </div>

              {customMovies.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl">
                  No custom template movies published yet. Click <strong>+ Add Movie with Template</strong> above to publish one, or browse all live Home/Catalog movies below.
                </div>
              ) : (
                <table className="w-full text-left text-xs min-w-[780px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="pb-3 pr-4">Movie</th>
                      <th className="pb-3 pr-4">Format &amp; Lang</th>
                      <th className="pb-3 pr-4">Budget</th>
                      <th className="pb-3 pr-4">Collections</th>
                      <th className="pb-3 pr-4">Ticket Tiers (C/G/M)</th>
                      <th className="pb-3 pr-4">Assigned Team</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {customMovies.map((m) => (
                      <tr key={m.customId} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.posterUrl}
                              alt={m.title}
                              className="w-10 h-14 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-white text-sm">{m.title}</p>
                              <p className="text-[10px] font-mono text-slate-400">{m.customId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-slate-300">
                          <span className="block font-semibold text-white">{m.quality}</span>
                          <span>{m.language} • {m.country}</span>
                        </td>
                        <td className="py-3.5 pr-4 font-bold text-sky-300">
                          {m.formattedBudget}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {m.currencyCode}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 font-bold text-emerald-400">
                          {m.formattedCollections}
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-slate-200">
                          ₹{m.ticketPricing?.classic} / ₹{m.ticketPricing?.grand} / ₹{m.ticketPricing?.majestic}
                        </td>
                        <td className="py-3.5 pr-4">
                          {m.assignedTeams?.length > 0 ? (
                            m.assignedTeams.map((t) => (
                              <div key={t._id} className="text-[11px]">
                                <span className="text-white font-semibold">{t.name}</span>
                                <span className="block text-slate-400">{t.email}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              to={`/movie/${m.customId}`}
                              className="glass-button px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomMovie(m.customId, m.title)}
                              className="p-1.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500 hover:text-white transition-all"
                              title="Delete Movie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* All Live Home Movies Grid (Matching User Home View) */}
            <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#ff2e3b]" />
                    All Live Home &amp; Catalog Movies ({allHomeMovies.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every movie visible to users on the Home page — view page or assign team directly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                {allHomeMovies.map((m) => {
                  const mKey = String(m.customId || m.id);
                  const assignedList = teamsByMovieId[mKey] || [];
                  return (
                    <div
                      key={mKey}
                      className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between border border-white/[0.1]"
                    >
                      <div className="relative aspect-[2/3]">
                        <img
                          src={resolveMoviePoster(m.poster_path, m.id)}
                          alt={m.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-xs font-bold text-white line-clamp-1">{m.title}</p>
                          <p className="text-[10px] text-slate-300">
                            {m.release_date?.slice(0, 4) || m.year || "2026"} • {assignedList.length > 0 ? "Team Linked" : "No Team"}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 flex gap-1.5">
                        <Link
                          to={`/movie/${mKey}`}
                          className="flex-1 glass-button py-1.5 rounded-lg text-[10px] font-bold text-center"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => openAssignMovieModal(m)}
                          className="flex-1 bg-[#e50914]/20 hover:bg-[#e50914] border border-[#e50914]/40 text-white py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Dedicated Country Currency Financials Ledger Table */}
        {activeTab === "financials" && (
          <div className="glass-card rounded-3xl p-5 sm:p-6 overflow-x-auto">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              Movie Budget &amp; Worldwide Collections Ledger (Country Currency)
            </h2>
            {customMovies.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                Publish movies via &quot;+ Add Movie (Template)&quot; to populate per-movie budgets and country box office totals here.
              </p>
            ) : (
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] uppercase text-slate-400">
                    <th className="pb-3 pr-4">Movie Title</th>
                    <th className="pb-3 pr-4">Country / Currency</th>
                    <th className="pb-3 pr-4">Total Budget</th>
                    <th className="pb-3 pr-4">Total Collections</th>
                    <th className="pb-3 pr-4">CineReward Bookings</th>
                    <th className="pb-3">Ticket Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {customMovies.map((m) => (
                    <tr key={m.customId}>
                      <td className="py-3.5 pr-4 font-bold text-white">{m.title}</td>
                      <td className="py-3.5 pr-4 text-slate-300">
                        {m.country} ({m.currencyCode} {m.currencySymbol})
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-sky-300">
                        {m.formattedBudget}
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-emerald-400">
                        {m.formattedCollections}
                      </td>
                      <td className="py-3.5 pr-4 text-white font-semibold">{m.bookings || 0}</td>
                      <td className="py-3.5 font-bold text-amber-300">
                        ₹{Number(m.ticketRevenue || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 4: Payment History */}
        {activeTab === "payments" && (
          <div className="glass-card rounded-2xl p-6 overflow-x-auto">
            <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Partner Payment History
            </h2>
            {payments.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">No payments recorded yet.</p>
            ) : (
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] uppercase text-slate-400">
                    <th className="pb-3 pr-4">Partner</th>
                    <th className="pb-3 pr-4">Event</th>
                    <th className="pb-3 pr-4">Code</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td className="py-3.5 pr-4">
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.email}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-300">{p.eventType}</td>
                      <td className="py-3.5 pr-4 font-mono text-[#ff2e3b]">{p.paymentCode}</td>
                      <td className="py-3.5 pr-4 font-bold text-white">₹{p.paymentAmount?.toLocaleString()}</td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                            p.paymentStatus === "Paid"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {p.paymentStatus === "Unpaid" ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(p.paymentCode)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-slate-400">Confirmed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 5: Partner Requests */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead._id} className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#ff2e3b]">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{lead.eventType}</h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-white/[0.08] text-white">
                    {lead.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <InfoChip icon={<Mail className="w-3.5 h-3.5 text-slate-400" />} label="Email" value={lead.email} />
                  <InfoChip icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} label="Phone" value={lead.phone} />
                  <InfoChip icon={<IndianRupee className="w-3.5 h-3.5 text-emerald-400" />} label="Budget" value={`₹${lead.budget?.toLocaleString()}`} />
                  <InfoChip icon={<Users className="w-3.5 h-3.5 text-sky-400" />} label="Name" value={lead.name} />
                </div>

                <div className="bg-white/[0.03] border-l-2 border-[#e50914] p-3.5 rounded-xl text-xs text-slate-300 italic">
                  &quot;{lead.description}&quot;
                </div>

                {lead.status === "Pending" && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setActionModal({ type: "accept", lead });
                        setModalAmount(lead.budget?.toString());
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: "negotiate", lead })}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Negotiate
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: "reject", lead })}
                      className="glass-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {leads.length === 0 && (
              <div className="glass-card rounded-2xl p-12 text-center text-xs text-slate-400">
                No partner inquiries yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* CLICK-MOVIE GLASSOMORPHIC ASSIGN TEAM MODAL */}
      {assignModalMovie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4"
          onClick={() => setAssignModalMovie(null)}
        >
          <form
            onSubmit={handleAssignMovieSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d101b]/90 backdrop-blur-2xl border border-white/[0.16] shadow-2xl rounded-3xl max-w-lg w-full p-6 sm:p-7 relative space-y-5"
          >
            <button
              type="button"
              onClick={() => setAssignModalMovie(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 pr-6">
              <img
                src={resolveMoviePoster(assignModalMovie.poster_path, assignModalMovie.id)}
                alt={assignModalMovie.title}
                className="w-16 h-24 rounded-2xl object-cover border border-white/15 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff2e3b]">
                  Assign Movie Team
                </span>
                <h3 className="text-lg font-extrabold text-white truncate">
                  {assignModalMovie.title || assignModalMovie.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Movie ID: {assignModalMovie.customId || assignModalMovie.id}
                </p>
              </div>
            </div>

            {(teamsByMovieId[String(assignModalMovie.customId || assignModalMovie.id)] || []).length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-400/25 rounded-2xl p-3 text-xs space-y-1">
                <p className="font-bold text-emerald-300">Already Assigned Teams:</p>
                {teamsByMovieId[String(assignModalMovie.customId || assignModalMovie.id)].map((t) => (
                  <p key={t._id} className="text-slate-200">
                    • {t.name} (<span className="text-slate-400">{t.email}</span>)
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Movie Team Name
                </label>
                <input
                  required
                  type="text"
                  value={assignForm.name}
                  onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Team Login Email (@cinereward.com)
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    type="email"
                    value={assignForm.email}
                    onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAssignForm((prev) => ({
                        ...prev,
                        email: generateCineRewardEmail(
                          `${assignModalMovie.title}-${Math.floor(10 + Math.random() * 89)}`,
                          teams
                        ),
                      }))
                    }
                    className="glass-button px-3 rounded-xl text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Unique 16-Digit Secret Key (Argon2d Hashed)
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={assignForm.secretKey}
                    onChange={(e) => setAssignForm({ ...assignForm, secretKey: e.target.value })}
                    className={`${GLASS_INPUT_CLASS} font-mono font-bold tracking-wider`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAssignForm((prev) => ({ ...prev, secretKey: generate16DigitKey() }))
                    }
                    className="glass-button px-3 rounded-xl text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    New Key
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Optional Secondary Password
                </label>
                <input
                  type="password"
                  placeholder="Optional backup password"
                  value={assignForm.password}
                  onChange={(e) => setAssignForm({ ...assignForm, password: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalMovie(null)}
                className="flex-1 glass-button py-3 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigningMovieTeam}
                className="flex-1 btn-crimson py-3 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {assigningMovieTeam ? "Assigning Team..." : "Assign Movie Team"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UNIFIED ADD MOVIE TEMPLATE MODAL (Glassomorphic + Rectangular Upload Dropzones) */}
      {showMovieBuilder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-3 sm:p-5 overflow-y-auto"
          onClick={() => setShowMovieBuilder(false)}
        >
          <form
            onSubmit={handlePublishMovie}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d101b]/90 backdrop-blur-2xl border border-white/[0.16] shadow-2xl rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  Add Movie — Unified CineReward Template
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure banner, poster, gallery, cast photos, trailer, currency financials, ticket tiers &amp; Movie Team 16-digit key.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMovieBuilder(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Core Details & Country Currency Financials */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                1. Details &amp; Country Currency Financials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <input
                  required
                  placeholder="Movie Title *"
                  value={movieForm.title}
                  onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <input
                  placeholder="Director"
                  value={movieForm.director}
                  onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <input
                  placeholder="Tagline"
                  value={movieForm.tagline}
                  onChange={(e) => setMovieForm({ ...movieForm, tagline: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <input
                  placeholder="Language (e.g. Telugu, Hindi, English)"
                  value={movieForm.language}
                  onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <input
                  placeholder="Genres (comma separated)"
                  value={movieForm.genres}
                  onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={movieForm.releaseDate}
                    onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                  <input
                    type="number"
                    placeholder="Mins"
                    value={movieForm.runtime}
                    onChange={(e) => setMovieForm({ ...movieForm, runtime: e.target.value })}
                    className="w-20 bg-white/[0.04] backdrop-blur-xl border border-white/[0.14] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
                  />
                </div>
                <select
                  value={movieForm.country}
                  onChange={(e) => {
                    const sel =
                      COUNTRY_OPTIONS.find((c) => c.country === e.target.value) ||
                      COUNTRY_OPTIONS[0];
                    setMovieForm({
                      ...movieForm,
                      country: sel.country,
                      currencyCode: sel.code,
                      currencySymbol: sel.symbol,
                    });
                  }}
                  className="bg-[#121520]/90 backdrop-blur-xl border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-[#e50914]"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder={`Total Budget (${movieForm.currencyCode})`}
                  value={movieForm.totalBudget}
                  onChange={(e) => setMovieForm({ ...movieForm, totalBudget: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <input
                  type="number"
                  placeholder={`Total Collections (${movieForm.currencyCode})`}
                  value={movieForm.totalCollections}
                  onChange={(e) => setMovieForm({ ...movieForm, totalCollections: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
              </div>
              <textarea
                required
                rows={3}
                placeholder="Movie Overview / Synopsis *"
                value={movieForm.overview}
                onChange={(e) => setMovieForm({ ...movieForm, overview: e.target.value })}
                className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.14] rounded-2xl p-3.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914]"
              />
            </div>

            {/* Section 2: Glassomorphic Rectangular Image Upload Dropzones */}
            <div className="space-y-4 pt-3 border-t border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                2. Poster, Banner, Gallery Photos &amp; Trailer
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassUploadBox
                  label="Movie Poster * (2:3)"
                  hint="Click or drop Poster Image"
                  value={movieForm.posterUrl}
                  required
                  urlPlaceholder="Or paste poster image URL (https://...)"
                  onFileSelect={(file) =>
                    handleUploadImageField(file, (url) =>
                      setMovieForm((p) => ({ ...p, posterUrl: url }))
                    )
                  }
                  onUrlChange={(val) => setMovieForm((p) => ({ ...p, posterUrl: val }))}
                  onClear={() => setMovieForm((p) => ({ ...p, posterUrl: "" }))}
                />

                <GlassUploadBox
                  label="Backdrop Banner (16:9)"
                  hint="Click or drop Widescreen Banner"
                  value={movieForm.backdropUrl}
                  urlPlaceholder="Or paste widescreen banner URL (https://...)"
                  onFileSelect={(file) =>
                    handleUploadImageField(file, (url) =>
                      setMovieForm((p) => ({ ...p, backdropUrl: url }))
                    )
                  }
                  onUrlChange={(val) => setMovieForm((p) => ({ ...p, backdropUrl: val }))}
                  onClear={() => setMovieForm((p) => ({ ...p, backdropUrl: "" }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                    YouTube Trailer
                  </label>
                  <input
                    placeholder="YouTube Trailer URL or 11-char ID"
                    value={movieForm.trailerUrl}
                    onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                    Gallery Still Photos
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full min-h-[54px] rounded-2xl border-2 border-dashed border-white/[0.18] bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#ff2e3b]/60 backdrop-blur-xl cursor-pointer transition-all px-4">
                    <Upload className="w-4 h-4 text-[#ff2e3b]" />
                    <span className="text-xs font-semibold text-slate-200">
                      Click to upload gallery still ({movieForm.galleryPhotos.length} added)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleUploadImageField(e.target.files?.[0], (url) =>
                          setMovieForm((p) => ({
                            ...p,
                            galleryPhotos: [...p.galleryPhotos, url],
                          }))
                        )
                      }
                    />
                  </label>
                  <input
                    placeholder="Or paste gallery image URLs (comma separated)"
                    value={movieForm.galleryInput}
                    onChange={(e) => setMovieForm({ ...movieForm, galleryInput: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                </div>
              </div>

              {movieForm.galleryPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2.5">
                  {movieForm.galleryPhotos.map((img, i) => (
                    <div key={i} className="relative w-24 h-16 rounded-xl overflow-hidden border border-white/15">
                      <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setMovieForm((p) => ({
                            ...p,
                            galleryPhotos: p.galleryPhotos.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="absolute top-1 right-1 bg-black/75 rounded-full p-0.5 text-white hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Cast & Rectangular Photo Upload */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                  3. Cast &amp; Photos
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setMovieForm((p) => ({
                      ...p,
                      cast: [...p.cast, { name: "", character: "", photoUrl: "" }],
                    }))
                  }
                  className="glass-button px-3 py-1.5 rounded-lg text-[11px] font-bold"
                >
                  + Add Cast Member
                </button>
              </div>
              <div className="space-y-3">
                {movieForm.cast.map((member, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-xs"
                  >
                    <input
                      placeholder="Actor Name"
                      value={member.name}
                      onChange={(e) => {
                        const next = [...movieForm.cast];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setMovieForm({ ...movieForm, cast: next });
                      }}
                      className={GLASS_INPUT_CLASS}
                    />
                    <input
                      placeholder="Role / Character"
                      value={member.character}
                      onChange={(e) => {
                        const next = [...movieForm.cast];
                        next[idx] = { ...next[idx], character: e.target.value };
                        setMovieForm({ ...movieForm, cast: next });
                      }}
                      className={GLASS_INPUT_CLASS}
                    />
                    <GlassUploadBox
                      compact
                      hint="Upload Cast Photo"
                      value={member.photoUrl}
                      urlPlaceholder="Or cast photo URL"
                      onFileSelect={(file) =>
                        handleUploadImageField(file, (url) => {
                          const next = [...movieForm.cast];
                          next[idx] = { ...next[idx], photoUrl: url };
                          setMovieForm({ ...movieForm, cast: next });
                        })
                      }
                      onUrlChange={(val) => {
                        const next = [...movieForm.cast];
                        next[idx] = { ...next[idx], photoUrl: val };
                        setMovieForm({ ...movieForm, cast: next });
                      }}
                      onClear={() => {
                        const next = [...movieForm.cast];
                        next[idx] = { ...next[idx], photoUrl: "" };
                        setMovieForm({ ...movieForm, cast: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Ticket Pricing, Payments & Theatres */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                4. Ticket Tiers, Payments &amp; Coins
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="space-y-1 text-slate-300">
                  <span>Classic Price (₹)</span>
                  <input
                    type="number"
                    value={movieForm.classicPrice}
                    onChange={(e) => setMovieForm({ ...movieForm, classicPrice: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span>Grand Price (₹)</span>
                  <input
                    type="number"
                    value={movieForm.grandPrice}
                    onChange={(e) => setMovieForm({ ...movieForm, grandPrice: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span>Majestic Price (₹)</span>
                  <input
                    type="number"
                    value={movieForm.majesticPrice}
                    onChange={(e) => setMovieForm({ ...movieForm, majesticPrice: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span>Coins / Seat</span>
                  <input
                    type="number"
                    value={movieForm.rewardCoinsPerSeat}
                    onChange={(e) => setMovieForm({ ...movieForm, rewardCoinsPerSeat: e.target.value })}
                    className={GLASS_INPUT_CLASS}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
                {[
                  ["upi", "UPI / QR"],
                  ["card", "Cards"],
                  ["wallets", "Wallets"],
                  ["coinsRedeemable", "CineCoin Discount"],
                ].map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(movieForm[key])}
                      onChange={(e) => setMovieForm({ ...movieForm, [key]: e.target.checked })}
                      className="accent-[#e50914]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Section 5: Assign Movie Team Email & Auto-Generate 16-Digit Secret Key */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                  5. Assign Movie Team (@cinereward.com &amp; 16-Digit Key)
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setMovieForm((p) => ({
                      ...p,
                      teamName: p.teamName || `${p.title || "Movie"} Team`,
                      teamEmail: generateCineRewardEmail(p.title || p.teamName || "movie", teams),
                      teamSecretKey: generate16DigitKey(),
                    }))
                  }
                  className="glass-button px-3 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Auto-Fill Team &amp; 16-Digit Key
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  placeholder="Team Name (e.g. DVV Studio)"
                  value={movieForm.teamName}
                  onChange={(e) => setMovieForm({ ...movieForm, teamName: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <input
                  type="email"
                  placeholder="team@cinereward.com"
                  value={movieForm.teamEmail}
                  onChange={(e) => setMovieForm({ ...movieForm, teamEmail: e.target.value })}
                  className={GLASS_INPUT_CLASS}
                />
                <div className="flex gap-1.5">
                  <input
                    placeholder="16-Digit Secret Key"
                    value={movieForm.teamSecretKey}
                    onChange={(e) => setMovieForm({ ...movieForm, teamSecretKey: e.target.value })}
                    className={`${GLASS_INPUT_CLASS} font-mono font-bold`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMovieForm({ ...movieForm, teamSecretKey: generate16DigitKey() })
                    }
                    className="glass-button px-3 rounded-xl font-bold shrink-0"
                  >
                    Gen
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowMovieBuilder(false)}
                className="glass-button px-5 py-3 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishingMovie}
                className="btn-crimson px-7 py-3 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {publishingMovie ? "Publishing Movie..." : "Publish Movie & Assign Team"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4"
          onClick={() => setEditingTeam(null)}
        >
          <form
            onSubmit={handleUpdateTeam}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d101b]/90 backdrop-blur-2xl border border-white/[0.16] rounded-3xl max-w-lg w-full p-7 relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setEditingTeam(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white">Edit Movie Team</h3>
            {[
              ["Team Name", "name", "text", ""],
              ["Team Email", "email", "email", ""],
              ["New Password (optional)", "password", "password", "Leave blank to keep existing"],
              ["Assigned Movie IDs", "assignedMoviesInput", "text", "e.g. 656908, cr-..."],
            ].map(([label, key, type, placeholder]) => (
              <label
                key={key}
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                {label}
                <input
                  type={type}
                  placeholder={placeholder}
                  value={editingTeam[key] || ""}
                  onChange={(e) =>
                    setEditingTeam({ ...editingTeam, [key]: e.target.value })
                  }
                  className={`mt-1.5 ${GLASS_INPUT_CLASS}`}
                  required={key === "name" || key === "email"}
                />
              </label>
            ))}

            <div className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>New 16-Digit Secret Key (optional)</span>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  placeholder="Leave blank to keep existing key"
                  value={editingTeam.secretKey || ""}
                  onChange={(e) =>
                    setEditingTeam({ ...editingTeam, secretKey: e.target.value })
                  }
                  className={`${GLASS_INPUT_CLASS} font-mono font-bold`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setEditingTeam({ ...editingTeam, secretKey: generate16DigitKey() })
                  }
                  className="glass-button px-3 rounded-xl text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  16-Digit
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingTeam}
              className="w-full btn-crimson py-3 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdatingTeam ? "Saving..." : "Save Changes"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Partner Lead Action Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="bg-[#0d101b]/90 backdrop-blur-2xl border border-white/[0.16] rounded-3xl max-w-md w-full p-7 relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActionModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white capitalize">
              {actionModal.type} Partner Request
            </h3>
            {actionModal.type === "accept" && (
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className={GLASS_INPUT_CLASS}
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                {actionModal.type === "reject" ? "Rejection Reason" : "Message"}
              </label>
              <textarea
                rows={4}
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.14] p-3.5 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="flex-1 glass-button py-3 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAction}
                className="flex-1 btn-crimson py-3 rounded-xl text-xs disabled:opacity-50"
              >
                {actionLoading ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
