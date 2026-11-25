import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Ticket,
  Coins,
  Star,
  MessageSquare,
  Send,
  CheckCircle,
  Gift,
  ArrowRight,
  Bookmark,
} from "lucide-react";
import { getActiveSession, saveRoleSession } from "../utils/auth";
import LoadingSpinner from "../components/LoadingSpinner";

const UserDashboard = () => {
  const [session] = useState(() => getActiveSession());
  const [user, setUser] = useState(() => session?.data || null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("watching");
  const [reviewForm, setReviewForm] = useState({
    ticketId: "",
    movieId: "",
    rating: 10,
    comment: "",
  });

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTickets = async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    try {
      try {
        const userRes = await axios.get(`/api/users/${user.id}`);
        if (userRes.data) {
          const updatedUser = { ...user, coins: userRes.data.coins };
          setUser(updatedUser);
          saveRoleSession("user", updatedUser, session?.token);
        }
      } catch (e) {
        console.error("Failed to refresh user coins", e);
      }

      const res = await axios.get(`/api/tickets/user/${user.id}`);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = () => {
    if ((user?.coins || 0) < 500) {
      alert("You need at least 500 coins to redeem a free ticket voucher!");
      return;
    }
    alert(
      "Congratulations! You can apply your coins directly on any movie checkout (100 coins per seat)."
    );
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) return alert("Please sign in to submit a review.");

    try {
      await axios.post("/api/reviews/submit", { userId: user.id, ...reviewForm });
      alert("Verified review submitted! Movie teams will review it for 100 reward coins.");
      setReviewForm({ ticketId: "", movieId: "", rating: 10, comment: "" });
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review");
    }
  };

  const isTicketPast = (dateStr, timeStr) => {
    try {
      if (!timeStr || !dateStr) return false;
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":");
      if (hours === "12") hours = "00";
      if (modifier === "PM") hours = parseInt(hours, 10) + 12;
      const ticketDate = new Date(`${dateStr} ${hours}:${minutes}`);
      return ticketDate < new Date();
    } catch {
      return false;
    }
  };

  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const watchingTickets = safeTickets.filter((t) => !isTicketPast(t.date, t.time));
  const previousTickets = safeTickets.filter((t) => isTicketPast(t.date, t.time));
  const activeTickets = activeTab === "watching" ? watchingTickets : previousTickets;

  if (loading) return <LoadingSpinner fullPage message="Loading Your Cinema Profile..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Glass Profile Sidebar */}
        <div className="w-full lg:w-80 space-y-4 shrink-0">
          <div className="glass-panel rounded-3xl p-7 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-7">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-14 h-14 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-14 h-14 bg-[#e50914] rounded-full flex items-center justify-center text-2xl font-black text-white">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white truncate">
                  {user?.name || "Cine Viewer"}
                </h1>
                <p className="text-slate-400 text-xs truncate">
                  {user?.email || user?.phone || "CineReward Member"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Coin Balance
                  </span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-3xl font-black text-white">{user?.coins || 0}</p>
              </div>

              <button
                type="button"
                onClick={handleRedeem}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Gift className="w-4 h-4" />
                <span>Redeem With Coins</span>
              </button>
              <p className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                100 Coins = 1 Seat Discount
              </p>

              <Link
                to="/watchlist"
                className="w-full glass-button py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#ff2e3b]" />
                <span>Open My Watchlist</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tickets & Reviews */}
        <div className="flex-grow w-full space-y-6">
          <div className="flex gap-3 border-b border-white/[0.08] pb-3">
            {[
              { id: "watching", label: `Upcoming (${watchingTickets.length})` },
              { id: "previous", label: `Watched (${previousTickets.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#e50914] text-white"
                    : "text-slate-400 hover:text-white bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeTickets.map((ticket) => (
              <div
                key={ticket._id}
                className="glass-card-hover rounded-3xl p-6 flex flex-col sm:flex-row gap-6"
              >
                <div className="flex-grow">
                  <div className="flex justify-between items-start gap-4 mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {ticket.movieTitle || "Movie Ticket"}
                      </h2>
                      <p className="text-[#ff2e3b] font-semibold text-xs">
                        {ticket.theatre}
                      </p>
                    </div>
                    {ticket.reviewSubmitted ? (
                      <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Reviewed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewForm({
                            ...reviewForm,
                            ticketId: ticket._id,
                            movieId: ticket.movieId,
                          })
                        }
                        className="btn-crimson text-[11px] px-4 py-1.5 rounded-full flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3 h-3" /> Rate &amp; Earn
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.07]">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Seats
                      </span>
                      <span className="text-white font-semibold">{ticket.seatNumber}</span>
                    </div>
                    <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.07]">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Date
                      </span>
                      <span className="text-white font-semibold">{ticket.date}</span>
                    </div>
                    <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.07]">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Time
                      </span>
                      <span className="text-white font-semibold">{ticket.time}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:border-l sm:border-white/[0.08] sm:pl-6 flex flex-col justify-center items-center min-w-[110px]">
                  <div className="w-16 h-16 bg-white/[0.04] rounded-2xl border border-white/[0.08] flex items-center justify-center mb-2">
                    <Ticket className="w-7 h-7 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Ticket ID
                  </span>
                  <span className="text-white font-mono text-xs mt-0.5">
                    #{ticket._id.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            ))}

            {activeTickets.length === 0 && (
              <div className="glass-card rounded-3xl p-16 text-center">
                <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-white font-bold text-base mb-2">
                  {activeTab === "watching"
                    ? "You don't have any upcoming bookings."
                    : "No watched movie tickets yet."}
                </p>
                <Link
                  to="/catalog?section=now-playing"
                  className="text-[#ff2e3b] text-xs font-bold inline-flex items-center gap-1.5 mt-2 hover:underline"
                >
                  Browse Now Playing <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verified Ticket Review Modal */}
      {reviewForm.ticketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-8 relative">
            <h3 className="text-2xl font-bold text-white mb-1">Rate Your Experience</h3>
            <p className="text-slate-400 text-xs mb-6">
              Verified reviews are scored by AI — top picks earn 100 Reward Coins!
            </p>
            <form onSubmit={handleReviewSubmit} className="space-y-5">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase">
                    Rating
                  </label>
                  <span className="text-2xl font-black text-[#ff2e3b]">
                    {reviewForm.rating}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  {[...Array(10)].map((_, index) => {
                    const starValue = index + 1;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: starValue })}
                        className={`transition-transform hover:scale-125 ${
                          starValue <= reviewForm.rating ? "text-amber-400" : "text-slate-700"
                        }`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            starValue <= reviewForm.rating ? "fill-amber-400" : ""
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">
                  Your Review
                </label>
                <textarea
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-[#e50914] min-h-[130px]"
                  placeholder="Share what stood out — story, direction, soundtrack, performances..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, ticketId: "" })}
                  className="glass-button px-5 py-3 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-grow btn-crimson py-3 rounded-xl flex items-center justify-center gap-2 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Verified Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
