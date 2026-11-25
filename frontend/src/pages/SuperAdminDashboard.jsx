import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
  Send,
  Edit3,
  Save,
} from "lucide-react";
import { getActiveSession, clearAllSessions } from "../utils/auth";
import { resolveMoviePoster } from "../utils/media";
import LoadingSpinner from "../components/LoadingSpinner";

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    teams: 0,
    tickets: 0,
    reviews: 0,
    revenue: 0,
  });
  const [teams, setTeams] = useState([]);
  const [movies, setMovies] = useState([]);
  const [defaultMovies, setDefaultMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("teams");

  const [actionModal, setActionModal] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const navigate = useNavigate();
  const [session] = useState(() => getActiveSession());

  useEffect(() => {
    if (!session || session.role !== "super_admin") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [navigate, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, teamsRes, moviesRes, leadsRes, paymentsRes] =
        await Promise.all([
          axios.get("/api/admin/stats"),
          axios.get("/api/admin/teams"),
          axios.get("/api/movies/popular").catch(() => ({ data: [] })),
          axios.get("/api/admin/partner/leads").catch(() => ({ data: [] })),
          axios
            .get("/api/admin/partner/payment-history")
            .catch(() => ({ data: [] })),
        ]);
      setStats(statsRes.data);
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      const fetchedMovies = Array.isArray(moviesRes.data)
        ? moviesRes.data.filter((m) => m.poster_path).slice(0, 18)
        : [];
      setMovies(fetchedMovies);
      setDefaultMovies(fetchedMovies);
    } catch (error) {
      console.error("Error fetching admin data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setMovies(defaultMovies);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axios.get(
        `/api/movies/search?q=${encodeURIComponent(query)}`
      );
      setMovies((res.data || []).filter((m) => m.poster_path).slice(0, 18));
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const generateSecretKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "CR-";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTeam({ ...newTeam, secretKey: result });
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
      await axios.post("/api/admin/create-team", {
        ...newTeam,
        assignedMovies: assignedMoviesArray,
      });
      setSuccessMsg(
        `Team "${newTeam.name}" created! Key: ${newTeam.secretKey}`
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
      await axios.post("/api/admin/partner/confirm-payment", {
        paymentCode: code,
      });
      fetchData();
    } catch {
      alert("Failed to confirm payment");
    }
  };

  if (loading) return <LoadingSpinner fullPage message="Loading Core Systems..." />;

  return (
    <div className="min-h-screen bg-[#09090d] pb-20">
      {/* Header */}
      <div className="bg-[#101018]/90 border-b border-white/[0.08] pt-10 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#e50914]/15 text-[#ff2e3b] rounded-2xl flex items-center justify-center border border-[#e50914]/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Super Admin Core
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Platform Monitoring, Teams &amp; Partnerships
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAllSessions();
              navigate("/login");
            }}
            className="glass-button px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Lock System
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users />}
            label="Total Users"
            value={stats.users}
            color="text-sky-400"
            bg="bg-sky-400/10"
          />
          <StatCard
            icon={<Ticket />}
            label="Total Tickets"
            value={stats.tickets}
            color="text-emerald-400"
            bg="bg-emerald-400/10"
          />
          <StatCard
            icon={<Activity />}
            label="Platform Fee"
            value={`₹${stats.revenue}`}
            color="text-amber-400"
            bg="bg-amber-400/10"
          />
          <StatCard
            icon={<Film />}
            label="Movie Teams"
            value={stats.teams}
            color="text-[#ff2e3b]"
            bg="bg-[#e50914]/15"
          />
        </div>

        {/* Movies Grid */}
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#ff2e3b]" />
              <span>{searchQuery ? "Search Results" : "Active Movies"}</span>
              <span className="text-xs font-normal text-slate-400 ml-1">
                (Click poster to assign ID)
              </span>
            </h2>

            <div className="relative w-full md:w-80">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#e50914]/30 border-t-[#e50914] rounded-full animate-spin" />
                ) : (
                  <Film className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search any movie to assign..."
                className="w-full bg-white/[0.04] border border-white/[0.1] pl-10 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] text-xs text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {movies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => {
                  const ids = newTeam.assignedMovies
                    ? newTeam.assignedMovies
                        .split(",")
                        .map((id) => id.trim())
                        .filter(Boolean)
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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-2.5">
                  <h3 className="text-white text-xs font-bold leading-tight line-clamp-2">
                    {movie.title}
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    ID: {movie.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Creation Form */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-3xl p-7 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#ff2e3b]" /> Create Movie Team
              </h2>
              {successMsg && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium mb-5 break-words">
                  {successMsg}
                </div>
              )}
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Team Name
                  </label>
                  <input
                    required
                    type="text"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] text-xs text-white"
                    placeholder="e.g. Kalki Production"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Team Email
                  </label>
                  <input
                    required
                    type="email"
                    value={newTeam.email}
                    onChange={(e) => setNewTeam({ ...newTeam, email: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] text-xs text-white"
                    placeholder="team@production.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Team Password
                  </label>
                  <input
                    required
                    type="password"
                    value={newTeam.password}
                    onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] text-xs text-white"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Assigned Movie IDs
                  </label>
                  <input
                    required
                    type="text"
                    value={newTeam.assignedMovies}
                    onChange={(e) =>
                      setNewTeam({ ...newTeam, assignedMovies: e.target.value })
                    }
                    className="w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] text-xs text-white"
                    placeholder="e.g. 550, 157336"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Secret Vault Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="text"
                      value={newTeam.secretKey}
                      onChange={(e) =>
                        setNewTeam({ ...newTeam, secretKey: e.target.value })
                      }
                      className="flex-grow bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] text-xs font-bold text-white tracking-wider"
                      placeholder="Click generate"
                    />
                    <button
                      type="button"
                      onClick={generateSecretKey}
                      className="glass-button px-3.5 rounded-xl text-[11px] font-bold"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full btn-crimson py-3.5 rounded-xl text-xs disabled:opacity-50"
                >
                  {isCreating ? "Provisioning..." : "Provision Team"}
                </button>
              </form>
            </div>
          </div>

          {/* Tabbed Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto">
              {[
                { id: "teams", label: "Teams" },
                { id: "leads", label: "Partner Leads" },
                { id: "payments", label: "Payment History" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#e50914] text-white"
                      : "bg-white/[0.04] text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "teams" && (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div
                    key={team._id}
                    className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 bg-white/[0.06] rounded-full flex items-center justify-center text-[#ff2e3b]">
                        <Film className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{team.name}</h3>
                        <p className="text-xs text-slate-400">{team.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Key:</span>
                        <span className="font-mono font-bold text-white bg-white/[0.08] px-2.5 py-0.5 rounded">
                          {team.secretKey}
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {(team.assignedMovies || []).map((id) => (
                          <span
                            key={id}
                            className="text-[10px] font-bold text-[#ff2e3b] bg-[#e50914]/15 px-2 py-0.5 rounded"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingTeam({
                            ...team,
                            password: "",
                            assignedMoviesInput: (team.assignedMovies || []).join(", "),
                          })
                        }
                        className="glass-button px-3.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Team
                      </button>
                    </div>
                  </div>
                ))}
                {teams.length === 0 && (
                  <div className="glass-card rounded-2xl p-12 text-center text-xs text-slate-400">
                    No movie teams provisioned yet.
                  </div>
                )}
              </div>
            )}

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
                          <h3 className="text-base font-bold text-white">
                            {lead.eventType}
                          </h3>
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

                    <div className="grid grid-cols-2 gap-3 text-xs">
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

            {activeTab === "payments" && (
              <div className="glass-card rounded-2xl p-6 overflow-x-auto">
                <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" /> Payment History
                </h2>
                {payments.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400">
                    No payments recorded yet.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs">
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
                          <td className="py-3.5 pr-4 font-mono text-[#ff2e3b]">
                            {p.paymentCode}
                          </td>
                          <td className="py-3.5 pr-4 font-bold text-white">
                            ₹{p.paymentAmount?.toLocaleString()}
                          </td>
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
        </div>
      </div>

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
              ["Team Name", "name", "text"],
              ["Team Email", "email", "email"],
              ["New Password (optional)", "password", "password"],
              ["Secret Key", "secretKey", "text"],
              ["Assigned Movie IDs", "assignedMoviesInput", "text"],
            ].map(([label, key, type]) => (
              <label
                key={key}
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                {label}
                <input
                  type={type}
                  value={editingTeam[key] || ""}
                  onChange={(e) =>
                    setEditingTeam({ ...editingTeam, [key]: e.target.value })
                  }
                  className="mt-1.5 w-full bg-white/[0.04] border border-white/[0.1] px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-[#e50914]"
                  required={key !== "password"}
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

      {/* Action Modal */}
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
                  Final Amount (₹)
                </label>
                <input
                  type="number"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.1] p-3 rounded-xl text-sm text-white"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                Message / Note
              </label>
              <textarea
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] p-3 rounded-xl text-xs text-white min-h-[100px]"
                placeholder="Write a note for the partner..."
              />
            </div>
            <button
              type="button"
              onClick={handleAction}
              disabled={actionLoading}
              className="w-full btn-crimson py-3 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{actionLoading ? "Sending..." : "Confirm & Notify"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="glass-card rounded-2xl p-5">
    <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center mb-3`}>
      {React.cloneElement(icon, { className: "w-5 h-5" })}
    </div>
    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
      {label}
    </p>
    <p className="text-2xl font-extrabold text-white">{value}</p>
  </div>
);

const InfoChip = ({ icon, label, value }) => (
  <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl">
    {icon}
    <div className="truncate">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      <p className="text-xs font-semibold text-white truncate">{value}</p>
    </div>
  </div>
);

export default SuperAdminDashboard;
