import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Film,
  MessageSquare,
  TrendingUp,
  Award,
  Star,
  ArrowLeft,
  ShieldCheck,
  Ticket,
  Sparkles,
  KeyRound,
  X,
  Search,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getActiveSession, saveRoleSession } from "../utils/auth";

const GROQ_KEYWORD_FILTERS = [
  "All",
  "Best",
  "Comedy",
  "Serious",
  "Emotional",
  "Medium",
  "Action",
  "Story",
  "Music",
  "Rewatchable",
];

const MovieTeamDashboard = () => {
  const [session] = useState(() => getActiveSession());
  const [teamsList, setTeamsList] = useState([]);
  const [activeTeam, setActiveTeam] = useState(() =>
    session?.role === "movie_team" ? session.data : null
  );
  const [selectedMovie, setSelectedMovie] = useState("");
  const [data, setData] = useState({
    ticketCount: 0,
    ticketRevenue: 0,
    recentReviews: [],
    pastReviewers: [],
    allComments: [],
    movieTitle: "",
    movieFinancials: null,
    freeTicketsCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAwarding, setIsAwarding] = useState(null);

  // Groq AI Keyword Filter State
  const [activeTagFilter, setActiveTagFilter] = useState("All");
  const [keywordInput, setKeywordInput] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [aiFilterInsight, setAiFilterInsight] = useState("");
  const [aiMatchedIds, setAiMatchedIds] = useState(null);

  // Security Key Rotation State
  const [securityOpen, setSecurityOpen] = useState(false);
  const [secForm, setSecForm] = useState({
    currentCredential: "",
    newSecretKey: "",
    newPassword: "",
  });
  const [secSaving, setSecSaving] = useState(false);
  const [secMsg, setSecMsg] = useState({ type: "", text: "" });

  const winnersRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.role === "super_admin") {
      axios
        .get("/api/admin/teams")
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setTeamsList(list);
          if (list.length > 0 && !activeTeam) {
            setActiveTeam({ ...list[0], id: list[0]._id });
          }
        })
        .catch((err) => console.error("Failed loading teams for admin:", err));
    }
  }, [session?.role, activeTeam]);

  useEffect(() => {
    if (activeTeam?.assignedMovies?.length > 0) {
      setSelectedMovie(activeTeam.assignedMovies[0]);
    } else {
      setSelectedMovie("");
    }
  }, [activeTeam]);

  const activeTeamId = activeTeam?.id || activeTeam?._id;

  const fetchMovieStats = useCallback(async () => {
    if (!selectedMovie || !activeTeamId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/admin/team/dashboard/${selectedMovie}?teamId=${activeTeamId}`
      );
      setData(res.data);
      setAiMatchedIds(null);
      setAiFilterInsight("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMovie, activeTeamId]);

  useEffect(() => {
    if (selectedMovie && activeTeamId) {
      fetchMovieStats();
    }
  }, [selectedMovie, activeTeamId, fetchMovieStats]);

  const handleRunGroqFilter = async (customQuery) => {
    const query = typeof customQuery === "string" ? customQuery : keywordInput;
    if (!selectedMovie || !activeTeamId) return;
    setIsAiProcessing(true);
    try {
      const res = await axios.post("/api/admin/team/analyze-comments", {
        movieId: selectedMovie,
        teamId: activeTeamId,
        keywords: query,
      });
      const returned = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
      if (query.trim()) {
        const matched = new Set(
          returned.filter((r) => r.matchesFilter).map((r) => String(r._id))
        );
        setAiMatchedIds(matched);
      } else {
        setAiMatchedIds(null);
      }
      setAiFilterInsight(res.data?.insight || "Groq AI comment analysis updated.");
      setData((prev) => ({
        ...prev,
        allComments: returned,
      }));
    } catch (err) {
      setAiFilterInsight(
        err.response?.data?.message || "Could not contact Groq AI analyzer."
      );
    } finally {
      setIsAiProcessing(false);
    }
  };

  const selectAiWinners = async () => {
    if (!selectedMovie || !activeTeamId) return;
    setIsAiProcessing(true);
    try {
      await axios.post("/api/admin/team/select-winners", {
        movieId: selectedMovie,
        teamId: activeTeamId,
      });
      await fetchMovieStats();
      setTimeout(() => {
        winnersRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 400);
    } catch (err) {
      alert(err.response?.data?.message || "AI Winner Selection failed.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const awardIndividual = async (reviewId) => {
    if (!activeTeamId) return;
    setIsAwarding(reviewId);
    try {
      await axios.post("/api/admin/team/award-individual", {
        reviewId,
        teamId: activeTeamId,
      });
      await fetchMovieStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to award coins.");
    } finally {
      setIsAwarding(null);
    }
  };

  const updateTicketCount = async () => {
    const count = prompt("Enter reward coin quota (tickets):", data.freeTicketsCount);
    if (count === null) return;
    try {
      await axios.post("/api/admin/team/update-tickets", {
        teamId: activeTeamId,
        count: parseInt(count, 10) || 0,
      });
      fetchMovieStats();
    } catch {
      alert("Update failed");
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    if (!activeTeamId) return;
    setSecSaving(true);
    setSecMsg({ type: "", text: "" });
    try {
      const res = await axios.put("/api/admin/team/security", {
        teamId: activeTeamId,
        currentCredential:
          session?.role === "super_admin" ? undefined : secForm.currentCredential,
        newSecretKey: secForm.newSecretKey.trim() || undefined,
        newPassword: secForm.newPassword.trim() || undefined,
      });
      const updatedTeam = {
        ...activeTeam,
        secretKeyHint: res.data?.secretKeyHint || activeTeam.secretKeyHint,
      };
      setActiveTeam(updatedTeam);
      if (session?.role === "movie_team") {
        saveRoleSession("movie_team", updatedTeam, session.token);
      }
      setSecForm({ currentCredential: "", newSecretKey: "", newPassword: "" });
      setSecMsg({
        type: "success",
        text: res.data?.message || "Credentials updated with Argon2d!",
      });
    } catch (err) {
      setSecMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update security key.",
      });
    } finally {
      setSecSaving(false);
    }
  };

  const visibleComments = useMemo(() => {
    const source =
      Array.isArray(data.allComments) && data.allComments.length > 0
        ? data.allComments
        : [...(data.recentReviews || []), ...(data.pastReviewers || [])];

    return source.filter((r) => {
      if (onlyVerified && r.commentType === "discussion") return false;
      if (aiMatchedIds && !aiMatchedIds.has(String(r._id))) return false;
      if (activeTagFilter !== "All") {
        const hasTag = (r.aiTags || []).some(
          (t) => t.toLowerCase() === activeTagFilter.toLowerCase()
        );
        const matchesText = (r.comment || "")
          .toLowerCase()
          .includes(activeTagFilter.toLowerCase());
        if (!hasTag && !matchesText) return false;
      }
      if (keywordInput.trim() && !aiMatchedIds) {
        const kw = keywordInput.trim().toLowerCase();
        const hay = `${r.comment || ""} ${(r.aiTags || []).join(" ")} ${
          r.userId?.name || r.authorName || ""
        }`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [data, onlyVerified, activeTagFilter, keywordInput, aiMatchedIds]);

  if (!activeTeam && session?.role !== "super_admin") {
    return <div className="text-center py-20 text-white">Unauthorized Access.</div>;
  }

  const fin = data.movieFinancials;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:py-10 min-w-0 space-y-7">
      {/* Studio Workspace Header */}
      <div className="glass-panel rounded-3xl p-5 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 shrink-0 rounded-xl glass-button flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {data.movieTitle ? `${data.movieTitle} — Studio Hub` : "Movie Team Hub"}
              </h1>
              <p className="text-slate-400 text-xs mt-1 break-words">
                Signed in as{" "}
                <span className="text-white font-semibold">
                  {activeTeam?.name || "Team"}
                </span>{" "}
                ({activeTeam?.email})
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-[10px] font-bold uppercase tracking-widest">
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Argon2d Secured
                </span>
                {activeTeam?.secretKeyHint && (
                  <span className="text-slate-200 bg-white/[0.07] border border-white/[0.12] px-2.5 py-0.5 rounded-full">
                    Secret Key: {activeTeam.secretKeyHint}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setSecMsg({ type: "", text: "" });
                setSecurityOpen(true);
              }}
              className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Change Secret Key
            </button>

            {teamsList.length > 0 && (
              <select
                value={activeTeamId || ""}
                onChange={(e) => {
                  const found = teamsList.find((t) => t._id === e.target.value);
                  if (found) setActiveTeam({ ...found, id: found._id });
                }}
                className="bg-[#14141e] border border-white/[0.12] text-white py-2.5 px-4 rounded-xl text-xs font-bold"
              >
                {teamsList.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={updateTicketCount}
              className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold"
            >
              Reward Pool: {data.freeTicketsCount || 0}
            </button>

            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Film className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff2e3b]" />
              <select
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
                className="w-full bg-[#14141e] border border-white/[0.12] text-white py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:border-[#e50914] text-xs font-bold"
              >
                {(activeTeam?.assignedMovies || []).map((mid) => (
                  <option key={mid} value={mid}>
                    Movie: {mid}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Financials & Box Office Currency Table + KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          [Ticket, "Bookings", data.ticketCount, "text-cyan-300", "bg-cyan-400/10"],
          [
            Coins,
            "Ticket Sales",
            `₹${Number(data.ticketRevenue || 0).toLocaleString()}`,
            "text-emerald-300",
            "bg-emerald-400/10",
          ],
          [
            TrendingUp,
            `Budget (${fin?.currencyCode || "INR"})`,
            fin?.formattedBudget || "Not Disclosed",
            "text-sky-300",
            "bg-sky-400/10",
          ],
          [
            Sparkles,
            `Collections (${fin?.currencyCode || "INR"})`,
            fin?.formattedCollections || "Not Disclosed",
            "text-amber-300",
            "bg-amber-400/10",
          ],
          [
            MessageSquare,
            "All Comments",
            visibleComments.length,
            "text-rose-300",
            "bg-[#e50914]/15",
          ],
          [
            Award,
            "Winners",
            data.pastReviewers.length,
            "text-emerald-300",
            "bg-emerald-400/10",
          ],
        ].map(([Icon, label, value, color, background]) => (
          <div key={label} className="glass-card rounded-2xl p-4 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${background} flex items-center justify-center mb-2.5`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-white truncate">
              {value}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 truncate">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Groq AI Keyword Comment Filtering Console + Comments Feed */}
      <div className="glass-card rounded-3xl overflow-hidden min-w-0">
        <div className="p-5 sm:p-6 border-b border-white/[0.08] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ff2e3b]" />
                Groq AI Comment &amp; Review Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Filter audience reviews and comments using Groq AI mood tags (comedy, serious, best, medium, emotional) or custom keywords.
              </p>
            </div>
            <button
              type="button"
              onClick={selectAiWinners}
              disabled={isAiProcessing || data.recentReviews.length === 0}
              className="btn-crimson px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 self-start"
            >
              {isAiProcessing ? "Processing AI..." : "Auto-Pick Top Winners (AI)"}
            </button>
          </div>

          {/* Groq Keyword Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => {
                  setKeywordInput(e.target.value);
                  if (!e.target.value.trim()) setAiMatchedIds(null);
                }}
                placeholder="Type Groq AI filter keywords (e.g. comedy, emotional climax, best acting, medium)..."
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914]"
              />
            </div>
            <button
              type="button"
              disabled={isAiProcessing}
              onClick={() => handleRunGroqFilter(keywordInput)}
              className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shrink-0 transition-all disabled:opacity-50"
            >
              {isAiProcessing ? "Analyzing with Groq..." : "Filter with Groq AI"}
            </button>
            {aiMatchedIds && (
              <button
                type="button"
                onClick={() => {
                  setKeywordInput("");
                  setActiveTagFilter("All");
                  setAiMatchedIds(null);
                  setAiFilterInsight("");
                }}
                className="glass-button px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0"
              >
                Clear AI Filter
              </button>
            )}
          </div>

          {/* Keyword Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {GROQ_KEYWORD_FILTERS.map((tag) => {
                const active = activeTagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTagFilter(tag)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                      active
                        ? "bg-[#e50914] border-[#e50914] text-white"
                        : "bg-white/[0.04] border-white/[0.1] text-slate-300 hover:bg-white/[0.1]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => setOnlyVerified(e.target.checked)}
                className="accent-[#e50914] w-4 h-4"
              />
              Verified Ticket Holders Only
            </label>
          </div>

          {aiFilterInsight && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-emerald-300 font-medium">
              <strong>Groq AI Insight:</strong> {aiFilterInsight}
            </div>
          )}
        </div>

        {/* Comments List */}
        <div className="divide-y divide-white/[0.06]">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading movie feedback &amp; financials...
            </div>
          ) : visibleComments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No comments match the selected Groq AI filter yet.
            </div>
          ) : (
            visibleComments.map((review) => (
              <div
                key={review._id}
                className="p-5 sm:p-6 hover:bg-white/[0.02] transition-all space-y-3"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#e50914]/25 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                      {review.userId?.profilePicture ? (
                        <img
                          src={review.userId.profilePicture}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (review.userId?.name || review.authorName || "U")[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-white font-semibold text-sm">
                          {review.userId?.name || review.authorName || "Cinema Fan"}
                        </h3>
                        {review.isVerifiedTicket && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Verified Ticket
                          </span>
                        )}
                        {review.isWinner && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-[10px] font-bold text-amber-300">
                            Winner (+100 Coins)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {review.aiSummary || "Audience Feedback"}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {review.rating}/10
                  </span>
                </div>

                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed italic">
                  &quot;{review.comment}&quot;
                </p>

                <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      AI Score: <strong className="text-[#ff2e3b]">{review.aiScore || 70}%</strong>
                    </span>
                    {(review.aiTags || []).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-[10px] font-bold text-slate-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {!review.isWinner && review.commentType !== "discussion" && (
                    <button
                      type="button"
                      onClick={() => awardIndividual(review._id)}
                      disabled={isAwarding === review._id}
                      className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Award 100 Coins</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rewarded Winners Section */}
      {data.pastReviewers.length > 0 && (
        <div ref={winnersRef}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" /> Rewarded Winners
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.pastReviewers.map((winner) => (
              <div
                key={winner._id}
                className="glass-card border-emerald-500/20 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">
                    {winner.userId?.name || "Winner"}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                    +100 Coins
                  </span>
                </div>
                <p className="text-xs text-slate-400 italic line-clamp-2">
                  &quot;{winner.comment}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Secret Key / Password Rotation Modal */}
      {securityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Update Team Security</h2>
              </div>
              <button
                type="button"
                onClick={() => setSecurityOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Change your Movie Team Secret Key or Password. Updated keys are encrypted using Argon2d.
            </p>

            {secMsg.text && (
              <div
                className={`px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                  secMsg.type === "success"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-red-500/15 border-red-500/40 text-red-200"
                }`}
              >
                {secMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateSecurity} className="space-y-3.5">
              {session?.role !== "super_admin" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                    Current Secret Key or Password
                  </label>
                  <input
                    type="password"
                    required
                    value={secForm.currentCredential}
                    onChange={(e) =>
                      setSecForm({ ...secForm, currentCredential: e.target.value })
                    }
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
                    placeholder="Verify current key/password"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  New Secret Key
                </label>
                <input
                  type="text"
                  value={secForm.newSecretKey}
                  onChange={(e) =>
                    setSecForm({ ...secForm, newSecretKey: e.target.value })
                  }
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
                  placeholder="e.g. CR-NEWKEY99"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  New Team Password (Optional)
                </label>
                <input
                  type="password"
                  value={secForm.newPassword}
                  onChange={(e) =>
                    setSecForm({ ...secForm, newPassword: e.target.value })
                  }
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
                  placeholder="Optional password"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSecurityOpen(false)}
                  className="flex-1 glass-button py-2.5 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={secSaving}
                  className="flex-1 btn-crimson py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {secSaving ? "Saving..." : "Save Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieTeamDashboard;
