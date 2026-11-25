import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { getActiveSession, clearAllSessions } from "../utils/auth";
import { resolveMoviePoster } from "../utils/media";
import LoadingSpinner from "../components/LoadingSpinner";

const COUNTRY_OPTIONS = [
  { country: "IN", code: "INR", symbol: "₹", label: "India (INR ₹)" },
  { country: "US", code: "USD", symbol: "$", label: "United States (USD $)" },
  { country: "GB", code: "GBP", symbol: "£", label: "United Kingdom (GBP £)" },
  { country: "JP", code: "JPY", symbol: "¥", label: "Japan (JPY ¥)" },
  { country: "KR", code: "KRW", symbol: "₩", label: "South Korea (KRW ₩)" },
  { country: "FR", code: "EUR", symbol: "€", label: "Europe (EUR €)" },
];

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

const makeRandomSecretKey = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "CR-";
  for (let i = 0; i < 8; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

const InfoChip = ({ icon, label, value }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl flex items-center gap-2.5 min-w-0">
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
  const [movies, setMovies] = useState([]);
  const [defaultMovies, setDefaultMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("movies");

  // Custom Movie Template Modal State
  const [showMovieBuilder, setShowMovieBuilder] = useState(false);
  const [movieForm, setMovieForm] = useState(INITIAL_MOVIE_FORM);
  const [publishingMovie, setPublishingMovie] = useState(false);
  const [provisionedCreds, setProvisionedCreds] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Team Form & Edit State
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        customMoviesRes,
        teamsRes,
        moviesRes,
        leadsRes,
        paymentsRes,
      ] = await Promise.all([
        axios.get("/api/admin/stats").catch(() => ({ data: { users: 0, teams: 0, tickets: 0, reviews: 0, revenue: 0 } })),
        axios.get("/api/admin/movies").catch(() => ({ data: [] })),
        axios.get("/api/admin/teams").catch(() => ({ data: [] })),
        axios.get("/api/movies/popular").catch(() => ({ data: [] })),
        axios.get("/api/admin/partner/leads").catch(() => ({ data: [] })),
        axios.get("/api/admin/partner/payment-history").catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data);
      setCustomMovies(Array.isArray(customMoviesRes.data) ? customMoviesRes.data : []);
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      const fetchedMovies = Array.isArray(moviesRes.data)
        ? moviesRes.data.filter((m) => m.poster_path).slice(0, 12)
        : [];
      setMovies(fetchedMovies);
      setDefaultMovies(fetchedMovies);
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

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setMovies(defaultMovies);
      return;
    }
    setIsSearching(true);
    try {
      const res = await axios.get(`/api/movies/search?q=${encodeURIComponent(query)}`);
      setMovies((res.data || []).filter((m) => m.poster_path).slice(0, 12));
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
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
        teamEmail: movieForm.teamEmail,
        teamSecretKey: movieForm.teamSecretKey,
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
      const generatedOrEnteredKey =
        newTeam.secretKey.trim() || makeRandomSecretKey();

      await axios.post("/api/admin/create-team", {
        ...newTeam,
        secretKey: generatedOrEnteredKey,
        assignedMovies: assignedMoviesArray,
      });
      setSuccessMsg(
        `Team "${newTeam.name}" created! Email: ${newTeam.email} • Secret Key: ${generatedOrEnteredKey}`
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

  if (loading) return <LoadingSpinner fullPage message="Loading Super Admin Console..." />;

  return (
    <div className="min-h-screen pb-28 lg:pb-20 min-w-0">
      {/* Header */}
      <div className="bg-[#0e111b]/70 backdrop-blur-2xl border-b border-white/[0.1] pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 p-3 bg-[#e50914]/15 text-[#ff2e3b] rounded-2xl flex items-center justify-center border border-[#e50914]/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Super Admin Control Center
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Unified Movie Builder, Country Currency Box Office, Movie Teams &amp; Platform Ledger
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
                navigate("/login");
              }}
              className="glass-button px-5 py-2.5 rounded-xl text-xs font-bold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-7 min-w-0">
        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {[
            [Users, "Users", stats.users, "text-sky-300", "bg-sky-500/10"],
            [Film, "Custom Movies", customMovies.length, "text-[#ff2e3b]", "bg-[#e50914]/15"],
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
          <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Movie &amp; Team Provisioned: {provisionedCreds.movieTitle} ({provisionedCreds.movieId})
              </p>
              <p className="text-slate-200">
                Team Email: <strong className="text-white">{provisionedCreds.teamEmail}</strong> • Secret Key / Password:{" "}
                <strong className="font-mono text-amber-300 bg-black/40 px-2 py-0.5 rounded">
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

        {/* Separate Table Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.08] w-fit max-w-full">
          {[
            { id: "movies", label: `Movies & Template (${customMovies.length})` },
            { id: "teams", label: `Movie Teams Table (${teams.length})` },
            { id: "financials", label: "Budget & Currency Ledger" },
            { id: "leads", label: `Partner Leads (${leads.filter((l) => l.status === "Pending").length})` },
            { id: "payments", label: "Payment History" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#e50914] text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Unified Custom Movies Table */}
        {activeTab === "movies" && (
          <div className="glass-card rounded-3xl p-5 sm:p-6 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clapperboard className="w-5 h-5 text-[#ff2e3b]" />
                  Published Movies (Unified Template)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All movies added here automatically use the unified banner, gallery, cast, trailer, country currency &amp; 10-theatre booking flow.
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
              <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl">
                No custom movies added yet. Click <strong>+ Add Movie with Template</strong> to publish a complete movie with banner, gallery photos, cast photos, trailer, theatres, budget &amp; team credentials.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Movie</th>
                    <th className="pb-3 pr-4">Format &amp; Lang</th>
                    <th className="pb-3 pr-4">Budget ({/* currency */})</th>
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
        )}

        {/* TAB 2: Movie Teams Table + Provisioning */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            {/* Quick Movie ID Picker for Assigning TMDB/Custom Movies */}
            <div className="glass-panel rounded-3xl p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-[#ff2e3b]" /> Pick Movie IDs for Team Assignment
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any poster to append its Movie ID to the New Team form.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={isSearching ? "Searching..." : "Search TMDB movie ID..."}
                    className="w-full bg-white/[0.04] border border-white/[0.1] pl-9 pr-8 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => {
                      const ids = newTeam.assignedMovies
                        ? newTeam.assignedMovies.split(",").map((id) => id.trim()).filter(Boolean)
                        : [];
                      if (!ids.includes(String(movie.id))) {
                        setNewTeam({
                          ...newTeam,
                          assignedMovies: [...ids, movie.id].join(", "),
                        });
                      }
                    }}
                    className="group cursor-pointer relative rounded-xl overflow-hidden border border-white/[0.1] hover:border-[#e50914] transition-all aspect-[2/3]"
                  >
                    <img
                      src={resolveMoviePoster(movie.poster_path, movie.id)}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full p-2">
                      <p className="text-white text-[11px] font-bold line-clamp-1">{movie.title}</p>
                      <p className="text-slate-400 text-[10px]">ID: {movie.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
              <div className="lg:col-span-1 min-w-0">
                <div className="glass-panel rounded-3xl p-6">
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#ff2e3b]" /> Provision Movie Team
                  </h2>
                  {successMsg && (
                    <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-medium mb-4 break-words">
                      {successMsg}
                    </div>
                  )}
                  <form onSubmit={handleCreateTeam} className="space-y-3.5">
                    <input
                      required
                      type="text"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs text-white"
                      placeholder="Team Name (e.g. Kalki Productions)"
                    />
                    <input
                      required
                      type="email"
                      value={newTeam.email}
                      onChange={(e) => setNewTeam({ ...newTeam, email: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs text-white"
                      placeholder="team@production.com"
                    />
                    <input
                      required
                      type="text"
                      value={newTeam.assignedMovies}
                      onChange={(e) => setNewTeam({ ...newTeam, assignedMovies: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs text-white"
                      placeholder="Assigned Movie IDs (e.g. 656908, cr-...)"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTeam.secretKey}
                        onChange={(e) => setNewTeam({ ...newTeam, secretKey: e.target.value })}
                        className="flex-grow bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs font-bold text-white"
                        placeholder="Secret Key (auto if blank)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewTeam({ ...newTeam, secretKey: makeRandomSecretKey() })
                        }
                        className="glass-button px-3 rounded-xl text-[11px] font-bold"
                      >
                        Generate
                      </button>
                    </div>
                    <input
                      type="password"
                      value={newTeam.password}
                      onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs text-white"
                      placeholder="Optional Secondary Password"
                    />
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full btn-crimson py-3 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {isCreating ? "Provisioning..." : "Create Team (Argon2d)"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Separate Movie Teams Table */}
              <div className="lg:col-span-2 min-w-0 glass-card rounded-3xl p-5 sm:p-6 overflow-x-auto">
                <h2 className="text-base font-bold text-white mb-4">
                  Movie Teams &amp; Secret Key Table
                </h2>
                {teams.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">
                    No movie teams provisioned yet.
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

        {/* TAB 4: Partner Leads */}
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

        {/* TAB 5: Payment History */}
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
      </div>

      {/* UNIFIED ADD MOVIE TEMPLATE MODAL */}
      {showMovieBuilder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-5 overflow-y-auto"
          onClick={() => setShowMovieBuilder(false)}
        >
          <form
            onSubmit={handlePublishMovie}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  Add Movie — Unified CineReward Template
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure poster, banner, gallery photos, cast photos, trailer, budget/collections currency, ticket tiers, theatres &amp; team Secret Key.
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
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
                <input
                  placeholder="Director"
                  value={movieForm.director}
                  onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
                <input
                  placeholder="Tagline"
                  value={movieForm.tagline}
                  onChange={(e) => setMovieForm({ ...movieForm, tagline: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
                <input
                  placeholder="Language (e.g. Telugu, Hindi, English)"
                  value={movieForm.language}
                  onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
                <input
                  placeholder="Genres (comma separated)"
                  value={movieForm.genres}
                  onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={movieForm.releaseDate}
                    onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                    className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white"
                  />
                  <input
                    type="number"
                    placeholder="Mins"
                    value={movieForm.runtime}
                    onChange={(e) => setMovieForm({ ...movieForm, runtime: e.target.value })}
                    className="w-20 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white"
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
                  className="bg-[#121520] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white font-semibold"
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
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
                <input
                  type="number"
                  placeholder={`Total Collections (${movieForm.currencyCode})`}
                  value={movieForm.totalCollections}
                  onChange={(e) => setMovieForm({ ...movieForm, totalCollections: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>
              <textarea
                required
                rows={3}
                placeholder="Movie Overview / Synopsis *"
                value={movieForm.overview}
                onChange={(e) => setMovieForm({ ...movieForm, overview: e.target.value })}
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl p-3.5 text-xs text-white"
              />
            </div>

            {/* Section 2: Banner, Poster, Gallery Photos & Trailer */}
            <div className="space-y-4 pt-3 border-t border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                2. Banner, Poster, Gallery Photos &amp; Trailer
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <label className="text-slate-300 font-semibold block">
                    Poster Image * (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      required
                      placeholder="https://... poster URL"
                      value={movieForm.posterUrl}
                      onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                      className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                    />
                    <label className="glass-button px-3 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleUploadImageField(e.target.files?.[0], (url) =>
                            setMovieForm((p) => ({ ...p, posterUrl: url }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-300 font-semibold block">
                    Backdrop Banner (URL or Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      placeholder="https://... widescreen banner URL"
                      value={movieForm.backdropUrl}
                      onChange={(e) => setMovieForm({ ...movieForm, backdropUrl: e.target.value })}
                      className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                    />
                    <label className="glass-button px-3 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleUploadImageField(e.target.files?.[0], (url) =>
                            setMovieForm((p) => ({ ...p, backdropUrl: url }))
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <input
                  placeholder="YouTube Trailer URL or ID"
                  value={movieForm.trailerUrl}
                  onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-white"
                />

                <div className="flex gap-2">
                  <input
                    placeholder="Gallery Photo URLs (comma separated)"
                    value={movieForm.galleryInput}
                    onChange={(e) => setMovieForm({ ...movieForm, galleryInput: e.target.value })}
                    className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                  />
                  <label className="glass-button px-3 py-2 rounded-xl cursor-pointer inline-flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>+Still</span>
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
                </div>
              </div>
              {movieForm.galleryPhotos.length > 0 && (
                <p className="text-[11px] text-emerald-300">
                  {movieForm.galleryPhotos.length} uploaded gallery image(s) attached.
                </p>
              )}
            </div>

            {/* Section 3: Cast & Photos */}
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
              <div className="space-y-2.5">
                {movieForm.cast.map((member, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <input
                      placeholder="Actor Name"
                      value={member.name}
                      onChange={(e) => {
                        const next = [...movieForm.cast];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setMovieForm({ ...movieForm, cast: next });
                      }}
                      className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                    />
                    <input
                      placeholder="Role / Character"
                      value={member.character}
                      onChange={(e) => {
                        const next = [...movieForm.cast];
                        next[idx] = { ...next[idx], character: e.target.value };
                        setMovieForm({ ...movieForm, cast: next });
                      }}
                      className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                    />
                    <div className="flex gap-1.5">
                      <input
                        placeholder="Photo URL"
                        value={member.photoUrl}
                        onChange={(e) => {
                          const next = [...movieForm.cast];
                          next[idx] = { ...next[idx], photoUrl: e.target.value };
                          setMovieForm({ ...movieForm, cast: next });
                        }}
                        className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                      />
                      <label className="glass-button px-2.5 py-2 rounded-xl cursor-pointer inline-flex items-center">
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleUploadImageField(e.target.files?.[0], (url) => {
                              const next = [...movieForm.cast];
                              next[idx] = { ...next[idx], photoUrl: url };
                              setMovieForm({ ...movieForm, cast: next });
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Ticket Pricing, Payments & Theatres */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                4. Ticket Tiers, Payments &amp; Featured Theatre
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="space-y-1 text-slate-300">
                  <span>Classic Price (₹)</span>
                  <input
                    type="number"
                    value={movieForm.classicPrice}
                    onChange={(e) => setMovieForm({ ...movieForm, classicPrice: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span>Grand Price (₹)</span>
                  <input
                    type="number"
                    value={movieForm.grandPrice}
                    onChange={(e) => setMovieForm({ ...movieForm, grandPrice: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span>Majestic Price (₹)</span>
                  <input
                    type="number"
                    value={movieForm.majesticPrice}
                    onChange={(e) => setMovieForm({ ...movieForm, majesticPrice: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 text-slate-300">
                  <span>Coins / Seat</span>
                  <input
                    type="number"
                    value={movieForm.rewardCoinsPerSeat}
                    onChange={(e) => setMovieForm({ ...movieForm, rewardCoinsPerSeat: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-white"
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

            {/* Section 5: Assign Movie Team Email & Auto-Generate Secret Key */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ff2e3b]">
                5. Assign Movie Team &amp; Generate Secret Key
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  placeholder="Team Name (e.g. DVV Studio)"
                  value={movieForm.teamName}
                  onChange={(e) => setMovieForm({ ...movieForm, teamName: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white"
                />
                <input
                  type="email"
                  placeholder="Team Email (optional)"
                  value={movieForm.teamEmail}
                  onChange={(e) => setMovieForm({ ...movieForm, teamEmail: e.target.value })}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white"
                />
                <div className="flex gap-1.5">
                  <input
                    placeholder="Secret Key / Password"
                    value={movieForm.teamSecretKey}
                    onChange={(e) => setMovieForm({ ...movieForm, teamSecretKey: e.target.value })}
                    className="flex-1 bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMovieForm({ ...movieForm, teamSecretKey: makeRandomSecretKey() })
                    }
                    className="glass-button px-3 rounded-xl font-bold"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
          onClick={() => setEditingTeam(null)}
        >
          <form
            onSubmit={handleUpdateTeam}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel rounded-3xl max-w-lg w-full p-7 relative space-y-4"
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
              ["New Secret Key (optional)", "secretKey", "text", "Leave blank to keep existing"],
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
                  className="mt-1.5 w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
                  required={key === "name" || key === "email"}
                />
              </label>
            ))}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="glass-panel rounded-3xl max-w-md w-full p-7 relative space-y-5"
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
                  className="w-full bg-white/[0.04] border border-white/[0.1] px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
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
                className="w-full bg-white/[0.04] border border-white/[0.1] p-3.5 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
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
