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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MovieTeamDashboard = () => {
  const [team] = useState(() => JSON.parse(localStorage.getItem("team")));
  const [selectedMovie, setSelectedMovie] = useState("");
  const [data, setData] = useState({
    ticketCount: 0,
    recentReviews: [],
    pastReviewers: [],
  });
  const [loading, setLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAwarding, setIsAwarding] = useState(null); // Track specific review being awarded
  const winnersRef = React.useRef(null);
  const navigate = useNavigate();

  const fetchMovieStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/admin/team/dashboard/${selectedMovie}?teamId=${team.id}`,
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMovie, team]);

  useEffect(() => {
    if (team && team.assignedMovies.length > 0) {
      setSelectedMovie(team.assignedMovies[0]);
    }
  }, [team]);

  useEffect(() => {
    if (selectedMovie) {
      fetchMovieStats();
    }
  }, [selectedMovie, fetchMovieStats]);

  const selectAiWinners = async () => {
    if (!selectedMovie) return;
    setIsAiProcessing(true);
    try {
      await axios.post("/api/admin/team/select-winners", {
        movieId: selectedMovie,
        teamId: team.id,
      });
      await fetchMovieStats();
      setTimeout(() => {
        winnersRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "AI Winner Selection failed.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const awardIndividual = async (reviewId) => {
    if (!team.id) return;
    setIsAwarding(reviewId);
    try {
      await axios.post("/api/admin/team/award-individual", {
        reviewId,
        teamId: team.id,
      });
      await fetchMovieStats();
      alert("Successfully awarded 100 coins!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to award coins.");
    } finally {
      setIsAwarding(null);
    }
  };

  const updateTicketCount = async () => {
    const count = prompt(
      "Enter new free tickets count:",
      data.freeTicketsCount,
    );
    if (count === null) return;
    try {
      await axios.post("/api/admin/team/update-tickets", {
        teamId: team.id,
        count: parseInt(count),
      });
      fetchMovieStats();
    } catch (err) {
      alert("Update failed");
    }
  };

  if (!team)
    return (
      <div className="text-center py-20 text-white">Unauthorized Access.</div>
    );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-primary/10 border border-white/10 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:border-primary transition-all text-slate-400 hover:text-white"
              title="Go to Previous Movies"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter">
                MOVIE<span className="text-primary">TEAM</span> HUB
              </h1>
              <p className="text-slate-400 font-medium">
                Manage reviews, rewards, and ticket capacity for {team.name}.
              </p>
              <div className="flex items-center gap-2 mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                <ShieldCheck className="w-4 h-4" /> Team workspace secured
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={updateTicketCount}
              className="bg-slate-900 border border-slate-800 text-white px-6 rounded-2xl font-bold hover:border-primary transition-all text-sm"
            >
              Manage Tickets ({data.freeTicketsCount || 0})
            </button>
            <div className="relative flex-grow md:w-64">
              <Film className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <select
                value={selectedMovie}
                onChange={(e) => setSelectedMovie(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white py-4 pl-12 pr-4 rounded-2xl focus:outline-none focus:border-primary appearance-none font-bold"
              >
                {team.assignedMovies.map((mid) => (
                  <option key={mid} value={mid}>
                    Movie ID: {mid}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          [
            Ticket,
            "Bookings",
            data.ticketCount,
            "text-cyan-300",
            "bg-cyan-400/10",
          ],
          [
            MessageSquare,
            "Recent reviews",
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
            "AI queue",
            data.recentReviews.filter((review) => !review.isWinner).length,
            "text-primary-light",
            "bg-primary/10",
          ],
        ].map(([Icon, label, value, color, background]) => (
          <div
            key={label}
            className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl ${background} flex items-center justify-center`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center hover:border-primary/30 transition-all">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">
              Impact Factor
            </p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {data.recentReviews.length + data.pastReviewers.length > 0
                ? (
                    (data.recentReviews.reduce(
                      (acc, r) => acc + (r.rating || 0),
                      0,
                    ) +
                      data.pastReviewers.reduce(
                        (acc, r) => acc + (r.rating || 0),
                        0,
                      )) /
                    (data.recentReviews.length + data.pastReviewers.length)
                  ).toFixed(1)
                : "0.0"}
            </p>
            <p className="text-[10px] text-green-500 font-bold uppercase mt-4">
              Based on {data.recentReviews.length + data.pastReviewers.length}{" "}
              total reviews
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">
              Total Bookings
            </p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {data.ticketCount}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> Recent Reviews
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={selectAiWinners}
                  disabled={isAiProcessing || data.recentReviews.length === 0}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-primary hover:bg-primary-dark text-white disabled:opacity-50`}
                >
                  {isAiProcessing ? "Analyzing..." : "Pick winners (AI)"}
                </button>
                <span className="text-slate-500 text-xs font-bold self-center">
                  {data.recentReviews.length} recent
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {data.recentReviews.map((review) => (
                <div
                  key={review._id}
                  className="p-8 hover:bg-slate-800/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center text-xs font-black text-primary border border-slate-800 overflow-hidden">
                        {review.userId.profilePicture ? (
                          <img
                            src={review.userId.profilePicture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : review.userId.name ? (
                          review.userId.name[0]
                        ) : (
                          "U"
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">
                          {review.userId.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {review.userId.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-yellow-500 font-black text-xs">
                        {review.rating}/10
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 italic">
                    &quot;{review.comment}&quot;
                  </p>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        AI Relevance
                      </span>
                      <div className="w-32 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${review.aiScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-black text-primary">
                        {review.aiScore}%
                      </span>
                    </div>

                    <button
                      onClick={() => awardIndividual(review._id)}
                      disabled={isAwarding === review._id}
                      className="opacity-0 group-hover:opacity-100 transition-all bg-green-500/10 text-green-500 border border-green-500/30 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-green-500 hover:text-white disabled:opacity-50"
                    >
                      {isAwarding === review._id ? (
                        <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Award className="w-4 h-4" />
                      )}
                      AWARD 100 COINS
                    </button>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="py-20 text-center text-slate-600">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-slate-700 border-t-primary rounded-full animate-spin"></div>
                  <p className="font-bold">Loading reviews...</p>
                </div>
              )}

              {!loading && data.recentReviews.length === 0 && (
                <div className="py-20 text-center text-slate-600">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No new reviews to show</p>
                </div>
              )}
            </div>
          </div>

          {/* Past Winners Section */}
          {data.pastReviewers.length > 0 && (
            <div ref={winnersRef} className="mt-12 scroll-mt-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                    Past Reviewers
                  </h3>
                  <p className="text-slate-500 text-xs font-bold">
                    Successfully rewarded with coins
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {data.pastReviewers.map((winner) => (
                  <div
                    key={winner._id}
                    className="bg-slate-900 border border-green-500/20 p-6 rounded-3xl relative overflow-hidden group hover:border-green-500/40 transition-all"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                      <Award className="w-16 h-16 text-green-500" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-slate-950 rounded-full flex items-center justify-center text-sm font-black text-green-500 border border-green-500/20 overflow-hidden">
                        {winner.userId?.profilePicture ? (
                          <img
                            src={winner.userId.profilePicture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : winner.userId?.name ? (
                          winner.userId.name[0]
                        ) : (
                          "U"
                        )}
                      </div>
                      <div className="max-w-[150px]">
                        <h4 className="text-white font-bold truncate">
                          {winner.userId?.name || "User"}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block truncate">
                          {winner.userId?.email || "No Email"}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs italic leading-relaxed border-l-2 border-green-500/30 pl-4 py-1 line-clamp-2">
                      &quot;{winner.comment}&quot;
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span>{winner.rating}/10</span>
                      <span className="mx-1">•</span>
                      <span className="text-green-500">Rewarded</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieTeamDashboard;
