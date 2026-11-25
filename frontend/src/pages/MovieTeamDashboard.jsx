import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Film,
  Users,
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getActiveSession, saveRoleSession } from "../utils/auth";

const MovieTeamDashboard = () => {
  const [session] = useState(() => getActiveSession());
  const [teamsList, setTeamsList] = useState([]);
  const [activeTeam, setActiveTeam] = useState(() =>
    session?.role === "movie_team" ? session.data : null
  );
  const [selectedMovie, setSelectedMovie] = useState("");
  const [data, setData] = useState({
    ticketCount: 0,
    recentReviews: [],
    pastReviewers: [],
    freeTicketsCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAwarding, setIsAwarding] = useState(null);
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

  // If super_admin opens /team/dashboard, fetch all teams so they can inspect any team
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
      alert("Successfully awarded 100 coins!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to award coins.");
    } finally {
      setIsAwarding(null);
    }
  };

  const updateTicketCount = async () => {
    const count = prompt("Enter free tickets / reward quota:", data.freeTicketsCount);
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

  if (!activeTeam && session?.role !== "super_admin") {
    return (
      <div className="text-center py-20 text-white">Unauthorized Access.</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:py-10 min-w-0">
      <div className="glass-panel rounded-3xl p-5 sm:p-8 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
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
                Movie Team Hub
              </h1>
              <p className="text-slate-400 text-xs mt-1 break-words">
                Manage AI-scored reviews &amp; coin rewards for{" "}
                <span className="text-white font-semibold">
                  {activeTeam?.name || "Team"}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Argon2d Authenticated
                </span>
                {activeTeam?.secretKeyHint && (
                  <span className="text-slate-300 bg-white/[0.06] border border-white/[0.1] px-2.5 py-0.5 rounded-full">
                    Secret Key: {activeTeam.secretKeyHint}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setSecMsg({ type: "", text: "" });
                setSecurityOpen(true);
              }}
              className="glass-button px-4 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
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
                className="bg-[#14141e] border border-white/[0.1] text-white py-3 px-4 rounded-xl text-xs font-bold"
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
              className="glass-button px-5 py-3 rounded-xl text-xs font-bold"
            >
              Reward Quota ({data.freeTicketsCount || 0})
            </button>

            <div className="relative min-w-[200px]">
              <Film className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff2e3b]" />
              <select
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
                className="w-full bg-[#14141e] border border-white/[0.1] text-white py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:border-[#e50914] text-xs font-bold"
              >
                {(activeTeam?.assignedMovies || []).map((mid) => (
                  <option key={mid} value={mid}>
                    Movie ID: {mid}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          [Ticket, "Bookings", data.ticketCount, "text-cyan-300", "bg-cyan-400/10"],
          [
            MessageSquare,
            "Pending Reviews",
            data.recentReviews.length,
            "text-amber-300",
            "bg-amber-400/10",
          ],
          [
            Award,
            "Rewarded",
            data.pastReviewers.length,
            "text-emerald-300",
            "bg-emerald-400/10",
          ],
          [
            Sparkles,
            "AI Queue",
            data.recentReviews.filter((r) => !r.isWinner).length,
            "text-[#ff2e3b]",
            "bg-[#e50914]/15",
          ],
        ].map(([Icon, label, value, color, background]) => (
          <div key={label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${background} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        <div className="lg:col-span-1 space-y-5 min-w-0">
          <div className="glass-card rounded-3xl p-7 text-center">
            <div className="w-12 h-12 bg-[#e50914]/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-[#ff2e3b]" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Average Rating
            </p>
            <p className="text-4xl font-black text-white">
              {data.recentReviews.length + data.pastReviewers.length > 0
                ? (
                    (data.recentReviews.reduce((acc, r) => acc + (r.rating || 0), 0) +
                      data.pastReviewers.reduce((acc, r) => acc + (r.rating || 0), 0)) /
                    (data.recentReviews.length + data.pastReviewers.length)
                  ).toFixed(1)
                : "0.0"}
            </p>
          </div>

          <div className="glass-card rounded-3xl p-7 text-center">
            <div className="w-12 h-12 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
              Verified Bookings
            </p>
            <p className="text-4xl font-black text-white">{data.ticketCount}</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8 min-w-0">
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Recent Verified Reviews
              </h2>
              <button
                type="button"
                onClick={selectAiWinners}
                disabled={isAiProcessing || data.recentReviews.length === 0}
                className="btn-crimson px-5 py-2 rounded-xl text-xs disabled:opacity-50"
              >
                {isAiProcessing ? "AI Analyzing..." : "Pick Winners (AI)"}
              </button>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {data.recentReviews.map((review) => (
                <div key={review._id} className="p-6 hover:bg-white/[0.02] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#e50914]/20 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/10 overflow-hidden">
                        {review.userId?.profilePicture ? (
                          <img
                            src={review.userId.profilePicture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          review.userId?.name?.[0] || "U"
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">
                          {review.userId?.name || "Verified Reviewer"}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {review.userId?.email || ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {review.rating}/10
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed mb-4 italic">
                    &quot;{review.comment}&quot;
                  </p>

                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        AI Relevance
                      </span>
                      <div className="w-28 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#e50914]"
                          style={{ width: `${review.aiScore || 50}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#ff2e3b]">
                        {review.aiScore || 50}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => awardIndividual(review._id)}
                      disabled={isAwarding === review._id}
                      className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Award 100 Coins</span>
                    </button>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading reviews...
                </div>
              )}

              {!loading && data.recentReviews.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No new verified reviews to evaluate yet.
                </div>
              )}
            </div>
          </div>

          {data.pastReviewers.length > 0 && (
            <div ref={winnersRef}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" /> Rewarded Winners
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Team Secret Key / Password Rotation Modal */}
      {securityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">
                  Update Team Security
                </h2>
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
              Change your Movie Team Secret Key or Password. Updated keys are encrypted immediately using Argon2d.
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
                  New Secret Key (Optional)
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
                  placeholder="Leave blank to keep existing"
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
