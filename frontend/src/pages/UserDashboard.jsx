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
  Printer,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { getActiveSession, saveRoleSession } from "../utils/auth";
import LoadingSpinner from "../components/LoadingSpinner";
import WhiteTicketCard from "../components/WhiteTicketCard";

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
  const [selectedPass, setSelectedPass] = useState(null);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-28 lg:py-10 min-w-0">
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start min-w-0">
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
                className="glass-card-hover rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row gap-5 min-w-0 overflow-hidden"
              >
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
                        <Ticket className="w-3 h-3" /> M-Ticket Confirmed
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-white mb-1 break-words">
                        {ticket.movieTitle || "Movie Ticket"}
                      </h2>
                      <p className="text-slate-300 font-medium text-xs flex items-center gap-1.5 break-words">
                        <MapPin className="w-3.5 h-3.5 text-[#ff2e3b] shrink-0" />
                        <span>{ticket.theatre}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPass(ticket)}
                        className="glass-button text-[11px] font-bold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3 h-3" /> Pass
                      </button>
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
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/[0.08] min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                        Seats
                      </span>
                      <span className="text-white font-bold break-words">
                        {ticket.seatNumber}
                      </span>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/[0.08] min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                        <Calendar className="w-3 h-3" /> Date
                      </span>
                      <span className="text-white font-semibold">{ticket.date}</span>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/[0.08] min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-0.5">
                        <Clock className="w-3 h-3" /> Time
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {ticket.time}
                      </span>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/[0.08] min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                        Total Paid
                      </span>
                      <span className="text-white font-bold">
                        ₹{ticket.price ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:border-l sm:border-dashed sm:border-white/[0.15] sm:pl-5 flex sm:flex-col justify-between sm:justify-center items-center sm:min-w-[125px] pt-3 sm:pt-0 border-t border-dashed border-white/10 sm:border-t-0">
                  <div className="text-left sm:text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Booking ID
                    </span>
                    <span className="text-white font-mono text-xs font-bold tracking-wider">
                      #{ticket._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPass(ticket)}
                    className="sm:mt-3 bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.12] rounded-xl px-3 py-2 text-[10px] font-bold text-slate-200 uppercase tracking-wider"
                  >
                    Show Barcode
                  </button>
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

      {/* White M-Ticket Boarding Pass Modal with QR Scanner */}
      {selectedPass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
          onClick={() => setSelectedPass(null)}
        >
          <div
            className="w-full max-w-lg space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <WhiteTicketCard
              bookingId={selectedPass._id}
              movieTitle={selectedPass.movieTitle}
              languageFormat={selectedPass.languageFormat}
              theatre={selectedPass.theatre}
              city={selectedPass.city}
              date={selectedPass.date}
              time={selectedPass.time}
              seats={selectedPass.seatNumber}
              snacksSummary={selectedPass.snacksSummary}
              totalPaid={selectedPass.price}
              paymentMethod={selectedPass.paymentMethod || "Razorpay"}
            />

            <div className="flex gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-white hover:bg-slate-100 text-slate-950 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Printer className="w-4 h-4" /> Print White Pass
              </button>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="flex-1 btn-crimson py-3 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
