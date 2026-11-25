import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Armchair, Check, Ticket, ArrowLeft, ShieldCheck, Coins } from "lucide-react";
import { getActiveSession, saveRoleSession } from "../utils/auth";
import LoadingSpinner from "../components/LoadingSpinner";

const SeatSelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session] = useState(() => getActiveSession());
  const [user, setUser] = useState(() => (session?.role === "user" ? session.data : null));

  const days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
    });
  }, []);

  const [bookingDate, setBookingDate] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const timeSlots = useMemo(
    () => ["10:00 AM", "01:00 PM", "04:30 PM", "08:00 PM"],
    []
  );
  const [useCoins, setUseCoins] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [ticketDetails, setTicketDetails] = useState(null);

  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedFormat, setSelectedFormat] = useState("IMAX 2D");
  const [selectedTheatre, setSelectedTheatre] = useState("PVR IMAX Premium");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!session || session.role !== "user") {
      navigate("/login", { state: { from: { pathname: `/book/${id}` } } });
      return;
    }

    const fetchMovie = async () => {
      try {
        const res = await axios.get(`/api/movies/${id}`);
        setMovie(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id, session, navigate]);

  const rows = ["A", "B", "C", "D", "E", "F"];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  const availableSlots = useMemo(() => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    if (bookingDate !== today) return timeSlots;

    return timeSlots.filter((slot) => {
      const [time, period] = slot.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const slotTime = new Date(
        `${bookingDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
      );
      return slotTime > now;
    });
  }, [bookingDate, timeSlots]);

  useEffect(() => {
    if (!selectedTime || !availableSlots.includes(selectedTime)) {
      setSelectedTime(availableSlots.length > 0 ? availableSlots[0] : "");
    }
  }, [bookingDate, availableSlots, selectedTime]);

  const handleSeatClick = (seat) => {
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const completeBooking = async () => {
    try {
      setBookingLoading(true);
      const res = await axios.post("/api/tickets/book", {
        userId: user.id,
        movieId: id,
        movieTitle: movie.title,
        theatre: selectedTheatre,
        seat: selectedSeats.join(", "),
        date: bookingDate,
        time: selectedTime,
        price: useCoins ? 0 : selectedSeats.length * 250,
        useCoins,
      });

      if (useCoins) {
        const updatedUser = {
          ...user,
          coins: Math.max(0, (user.coins || 0) - selectedSeats.length * 100),
        };
        setUser(updatedUser);
        saveRoleSession("user", updatedUser, session.token);
      }

      setTicketDetails(res.data);
      setBookingSuccess(true);
    } catch (err) {
      console.error("Final Booking Error:", err);
      const errorMessage = err.response?.data?.message || err.message;
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) return alert("Please select seats first.");
    if (!selectedTime) return alert("Please select an available showtime.");

    setBookingLoading(true);
    try {
      const totalPrice = selectedSeats.length * 250;

      if (!useCoins) {
        const orderRes = await axios.post("/api/tickets/create-order", {
          amount: totalPrice,
          receipt: `rcpt_${Date.now()}`,
        });

        const { id: order_id, currency, amount, keyId } = orderRes.data;
        if (!keyId || typeof window.Razorpay !== "function") {
          throw new Error("Payment gateway is not configured or failed to load.");
        }

        const options = {
          key: keyId,
          amount,
          currency,
          name: "CineReward",
          description: `Booking for ${movie.title}`,
          order_id,
          handler: async function (response) {
            try {
              const verifyRes = await axios.post("/api/tickets/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyRes.data.status === "success") {
                await completeBooking();
              } else {
                alert("Payment verification failed.");
              }
            } catch {
              alert("Payment verification failed.");
            }
          },
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          theme: { color: "#e50914" },
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.on("payment.failed", function (response) {
          setBookingLoading(false);
          alert(
            "Payment failed: " +
              (response.error?.description || "Razorpay could not complete payment.")
          );
        });
        rzp1.open();
        setBookingLoading(false);
      } else {
        await completeBooking();
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.details ||
        err.response?.data?.message ||
        err.message ||
        "Booking failed.";
      alert(errorMessage);
      setBookingLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage message="Initialising Cinema Seat Map..." />;
  if (!movie) return null;

  if (bookingSuccess && ticketDetails) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 print-container">
        <div className="flex justify-between items-center mb-8 no-print">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-crimson py-2.5 px-5 rounded-xl flex items-center gap-2 text-xs"
          >
            <Ticket className="w-4 h-4" /> Print / Download Pass
          </button>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 printable-ticket">
          <div className="bg-[#0e0e16] border-b-4 border-[#e50914] p-8 text-center">
            <h2 className="text-3xl font-black text-white italic tracking-tighter">
              CINE<span className="text-[#e50914]">REWARD</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Cinema Boarding Pass
            </p>
          </div>

          <div className="p-8">
            <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">
              {movie.title}
            </h3>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Date
                </p>
                <p className="text-lg font-black text-slate-800">{ticketDetails.date}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Time
                </p>
                <p className="text-lg font-black text-slate-800">{ticketDetails.time}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Theatre
                </p>
                <p className="text-lg font-black text-slate-800">{ticketDetails.theatre}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Seats
                </p>
                <p className="text-xl font-black text-[#e50914]">{ticketDetails.seatNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Total Paid
                </p>
                <p className="text-xl font-black text-slate-800">₹{ticketDetails.price}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 p-8 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] font-mono">
              {ticketDetails._id}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
              <Check className="w-4 h-4" /> Booking Confirmed
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090d] pb-20">
      {/* Obsidian Glass Header */}
      <div className="bg-[#101018]/90 backdrop-blur-2xl border-b border-white/[0.08] pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Movie
          </button>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            {movie.title}{" "}
            <span className="text-slate-400 text-lg font-semibold">
              ({selectedLanguage} • {selectedFormat})
            </span>
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-6">
            {movie.runtime && (
              <span className="bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 rounded-full">
                {movie.runtime} min
              </span>
            )}
            <span className="bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 rounded-full">
              {movie.certification || "UA"}
            </span>
            {(movie.genres || []).slice(0, 3).map((g) => (
              <span
                key={g.id || g.name}
                className="bg-white/[0.06] border border-white/[0.1] px-2.5 py-1 rounded-full"
              >
                {g.name}
              </span>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pt-5 border-t border-white/[0.08]">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {days.map((dateStr) => {
                const d = new Date(dateStr);
                const dayStr = d
                  .toLocaleDateString("en-US", { weekday: "short" })
                  .toUpperCase();
                const dateNum = d.getDate();
                const monthStr = d
                  .toLocaleDateString("en-US", { month: "short" })
                  .toUpperCase();
                const isSelected = bookingDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setBookingDate(dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded-xl transition-all border ${
                      isSelected
                        ? "bg-[#e50914] text-white border-[#e50914] shadow-lg shadow-red-600/30"
                        : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:border-white/25"
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-80">{dayStr}</span>
                    <span className="text-base font-extrabold leading-none my-0.5">
                      {dateNum}
                    </span>
                    <span className="text-[10px] opacity-80">{monthStr}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <select
                value={selectedTheatre}
                onChange={(e) => setSelectedTheatre(e.target.value)}
                className="bg-[#15151f] border border-white/[0.1] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#e50914]"
              >
                <option value="PVR IMAX Premium">PVR IMAX Premium</option>
                <option value="INOX Laserplex">INOX Laserplex</option>
                <option value="Cinepolis VIP">Cinepolis VIP</option>
              </select>

              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-[#15151f] border border-white/[0.1] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#e50914]"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
                <option value="Tamil">Tamil</option>
                <option value="Kannada">Kannada</option>
                <option value="Malayalam">Malayalam</option>
              </select>

              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="bg-[#15151f] border border-white/[0.1] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#e50914]"
              >
                <option value="IMAX 2D">IMAX 2D</option>
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="4DX">4DX</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-5 border-t border-white/[0.08] mt-5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showtimes
            </span>
            <div className="flex flex-wrap gap-2.5">
              {availableSlots.length > 0 ? (
                availableSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedTime === time
                        ? "bg-[#e50914] text-white border-[#e50914] shadow-lg shadow-red-600/25"
                        : "bg-white/[0.04] text-slate-300 border-white/[0.1] hover:border-white/30"
                    }`}
                  >
                    {time}
                  </button>
                ))
              ) : (
                <span className="text-slate-500 text-xs italic py-1">
                  No remaining shows for today. Choose another date.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seat Map & Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="glass-card rounded-3xl p-6 sm:p-10 text-center">
              <div className="w-3/4 h-1.5 bg-gradient-to-r from-transparent via-[#e50914] to-transparent mx-auto rounded-full mb-2" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.45em] mb-10">
                Screen This Way
              </p>

              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <div className="inline-block min-w-full space-y-3">
                  {rows.map((row) => (
                    <div key={row} className="flex justify-center items-center gap-2 sm:gap-3.5">
                      <span className="w-5 text-[11px] font-bold text-slate-500">{row}</span>
                      {cols.map((col) => {
                        const seat = `${row}${col}`;
                        const isSelected = selectedSeats.includes(seat);
                        return (
                          <button
                            key={seat}
                            type="button"
                            onClick={() => handleSeatClick(seat)}
                            title={`Seat ${seat}`}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                              isSelected
                                ? "bg-[#e50914] border-[#ff2e3b] text-white scale-110 shadow-lg shadow-red-600/40"
                                : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:bg-white/[0.12] hover:text-white"
                            }`}
                          >
                            <Armchair className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white/[0.06] border border-white/[0.1]" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#e50914]" />
                  <span>Selected</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="glass-panel rounded-3xl p-7 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-5">Booking Summary</h2>

              <div className="space-y-3.5 mb-7 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Movie</span>
                  <span className="text-white font-semibold text-right truncate max-w-[170px]">
                    {movie.title}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Theatre</span>
                  <span className="text-white font-semibold">{selectedTheatre}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Date &amp; Time</span>
                  <span className="text-white font-semibold">
                    {bookingDate} • {selectedTime || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Seats</span>
                  <span className="text-[#ff2e3b] font-bold">
                    {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None selected"}
                  </span>
                </div>

                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pay with Coins</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Balance: {user?.coins || 0} coins (100/seat)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseCoins(!useCoins)}
                      className={`w-11 h-6 rounded-full transition-all relative ${
                        useCoins ? "bg-[#e50914]" : "bg-white/[0.12]"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          useCoins ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-400">Total</span>
                    <span className="text-white font-extrabold text-xl">
                      {useCoins
                        ? `${selectedSeats.length * 100} Coins`
                        : `₹${selectedSeats.length * 250}`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={selectedSeats.length === 0 || !selectedTime || bookingLoading}
                onClick={handleBooking}
                className="w-full btn-crimson py-4 rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bookingLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>{useCoins ? "Redeem With Coins" : "Proceed to Pay"}</span>
                  </>
                )}
              </button>

              <div className="mt-5 flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Razorpay Verified Checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
