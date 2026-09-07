import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Armchair, Check, Ticket, ArrowLeft, ShieldCheck } from "lucide-react";

const SeatSelection = () => {
  const { id } = useParams(); // TMDB ID
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  // Generate next 7 days in YYYY-MM-DD format
  const getNextSevenDays = () => {
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");
    });
  };

  const days = getNextSevenDays();
  const [bookingDate, setBookingDate] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const timeSlots = ["10:00 AM", "01:00 PM", "04:30 PM", "08:00 PM"];
  const [useCoins, setUseCoins] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [ticketDetails, setTicketDetails] = useState(null);

  const [selectedLanguage, setSelectedLanguage] = useState("Hindi");
  const [selectedFormat, setSelectedFormat] = useState("2D");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");

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
  }, [id, user, navigate]);

  const rows = ["A", "B", "C", "D", "E", "F"];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];

  const getAvailableTimeSlots = () => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const isToday = bookingDate === today;

    if (!isToday) return timeSlots;

    return timeSlots.filter((slot) => {
      const [time, period] = slot.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const slotTime = new Date(
        `${bookingDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
      );
      return slotTime > now;
    });
  };

  const availableSlots = getAvailableTimeSlots();

  useEffect(() => {
    // Automatically select the first available slot if current selection is invalid
    if (!selectedTime || !availableSlots.includes(selectedTime)) {
      if (availableSlots.length > 0) {
        setSelectedTime(availableSlots[0]);
      } else {
        setSelectedTime("");
      }
    }
  }, [bookingDate, availableSlots, selectedTime]);

  const handleSeatClick = (seat) => {
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleBooking = async () => {
    if (selectedSeats.length === 0) return alert("Please select seats");

    setBookingLoading(true);
    try {
      const totalPrice = selectedSeats.length * 250;

      if (!useCoins) {
        // --- RAZORPAY FLOW ---
        // 1. Create Order
        const orderRes = await axios.post("/api/tickets/create-order", {
          amount: totalPrice,
          receipt: `rcpt_${Date.now()}`,
        });

        const { id: order_id, currency, amount, keyId } = orderRes.data;

        if (!keyId) {
          throw new Error(
            "Online payments are not configured. Please contact the administrator.",
          );
        }
        if (typeof window.Razorpay !== "function") {
          throw new Error(
            "Payment gateway failed to load. Check your internet connection and retry.",
          );
        }

        // 2. Configure Razorpay
        const options = {
          key: keyId,
          amount: amount,
          currency: currency,
          name: "CineReward",
          description: `Booking for ${movie.title}`,
          order_id: order_id,
          handler: async function (response) {
            // 3. Verify Payment
            try {
              const verifyRes = await axios.post(
                "/api/tickets/verify-payment",
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              );

              if (verifyRes.data.status === "success") {
                // 4. Finalise Booking
                completeBooking();
              } else {
                alert("Payment verification failed. Please contact support.");
              }
            } catch (err) {
              console.error("Verification Error:", err);
              alert("Payment verification failed.");
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || "",
          },
          theme: { color: "#f84464" },
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.on("payment.failed", function (response) {
          setBookingLoading(false);
          alert(
            "Payment failed: " +
              (response.error?.description ||
                "Razorpay could not complete the payment."),
          );
        });
        rzp1.open();
        setBookingLoading(false);
      } else {
        // --- COIN FLOW ---
        await completeBooking();
      }
    } catch (err) {
      console.error("Booking Error:", err);
      const errorMessage =
        err.response?.data?.details ||
        err.response?.data?.message ||
        err.message ||
        "Booking failed.";
      if (err.response && err.response.status === 400) {
        alert(errorMessage);
      } else {
        alert(
          `Booking failed: ${errorMessage}\n\nPlease check your connection and try again.`,
        );
      }
      setBookingLoading(false);
    }
  };

  const completeBooking = async () => {
    try {
      if (!bookingLoading) setBookingLoading(true);
      const res = await axios.post("/api/tickets/book", {
        userId: user.id,
        movieId: id,
        movieTitle: movie.title,
        theatre: "PVR Premium",
        seat: selectedSeats.join(", "),
        date: bookingDate,
        time: selectedTime,
        price: useCoins ? 0 : selectedSeats.length * 250,
        useCoins,
      });

      if (useCoins) {
        const updatedUser = {
          ...user,
          coins: user.coins - selectedSeats.length * 100,
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setTicketDetails(res.data);
      setBookingSuccess(true);
    } catch (err) {
      console.error("Final Booking Error:", err);
      const errorMessage = err.response?.data?.message || err.message;
      alert(
        `Booking finalization failed: ${errorMessage}\n\nIf amount was deducted, please contact support.`,
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return (
      <div className="text-center py-20 text-white">
        Initialising Cinema Map...
      </div>
    );

  if (bookingSuccess && ticketDetails) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 print-container">
        {/* Hide these buttons when printing */}
        <div className="flex justify-between items-center mb-8 no-print">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2"
          >
            <Ticket className="w-5 h-5" /> Print / Download Ticket
          </button>
        </div>

        {/* The Printable Ticket */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 printable-ticket">
          {/* Ticket Header */}
          <div className="bg-slate-900 border-b-4 border-primary p-8 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter relative z-10">
              CINE<span className="text-primary">REWARD</span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 relative z-10">
              Boarding Pass
            </p>
          </div>

          {/* Ticket Body */}
          <div className="p-8">
            <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight line-clamp-2">
              {movie.title}
            </h3>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Date
                </p>
                <p className="text-lg font-black text-slate-800">
                  {ticketDetails.date}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Time
                </p>
                <p className="text-lg font-black text-slate-800">
                  {ticketDetails.time}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Theatre
                </p>
                <p className="text-lg font-black text-slate-800">
                  {ticketDetails.theatre}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Seats
                </p>
                <p className="text-xl font-black text-primary">
                  {ticketDetails.seatNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Total Paid
                </p>
                <p className="text-xl font-black text-slate-800">
                  ₹{ticketDetails.price}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Bottom (Barcode) */}
          <div className="bg-slate-100 p-8 border-t border-slate-200 text-center relative">
            <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-[#f5f5f5]"></div>
            <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-[#f5f5f5]"></div>
            <div className="flex justify-center flex-col items-center gap-2">
              {/* CSS Barcode Mock */}
              <div className="flex justify-center gap-[2px] h-12 w-full max-w-[250px]">
                {[...Array(40)].map((_, i) => (
                  <div
                    key={i}
                    className={`bg-slate-800 h-full ${Math.random() > 0.5 ? "w-1" : Math.random() > 0.8 ? "w-2" : "w-[2px]"}`}
                  ></div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] font-mono mt-2">
                {ticketDetails._id}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-green-600 text-xs font-bold uppercase tracking-widest">
              <Check className="w-4 h-4" /> Booking Confirmed
            </div>
          </div>
        </div>

        {/* CSS block for printing logic directly injected into component to guarantee effect */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            body { background-color: white !important; }
            .no-print { display: none !important; }
            nav, footer { display: none !important; }
            .printable-ticket { box-shadow: none !important; border: 2px solid #e2e8f0 !important; margin: 0 auto; }
            .print-container { padding: 0 !important; margin-top: 2rem !important; }
          }
        `,
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* BookMyShow Style Header */}
      <div className="bg-white border-b border-slate-200 text-slate-800 pt-8 pb-4 w-full">
        <div className="max-w-7xl mx-auto px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#f84464] mb-6 transition-colors font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Movie
          </button>

          <h1 className="text-4xl font-normal tracking-tight mb-2">
            {movie.title} - ({selectedLanguage} {selectedFormat})
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">
            <span className="border border-slate-300 px-2 py-0.5 rounded-full hover:border-slate-400 transition-colors cursor-default">
              Movie runtime: 3h 55m
            </span>
            <span className="border border-slate-300 px-2 py-0.5 rounded-full hover:border-slate-400 transition-colors cursor-default">
              A
            </span>
            <span className="border border-slate-300 px-2 py-0.5 rounded-full hover:border-slate-400 transition-colors cursor-default">
              Action
            </span>
            <span className="border border-slate-300 px-2 py-0.5 rounded-full hover:border-slate-400 transition-colors cursor-default">
              Thriller
            </span>
          </div>

          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pt-4 border-t border-slate-200">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {days.map((dateStr, i) => {
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
                    key={i}
                    onClick={() => setBookingDate(dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[3.5rem] h-14 rounded-lg transition-all ${isSelected ? "bg-[#f84464] text-white shadow-md" : "bg-transparent text-slate-600 hover:text-[#f84464]"}`}
                  >
                    <span
                      className={`text-[10px] font-bold ${isSelected ? "text-white/90" : "text-slate-400"}`}
                    >
                      {dayStr}
                    </span>
                    <span className="text-lg font-black leading-none my-0.5">
                      {dateNum}
                    </span>
                    <span
                      className={`text-[10px] ${isSelected ? "text-white/90" : "text-slate-400"}`}
                    >
                      {monthStr}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 bg-white">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer py-2 hover:text-[#f84464] transition-colors"
              >
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Telugu">Telugu</option>
                <option value="Tamil">Tamil</option>
                <option value="Kannada">Kannada</option>
                <option value="Malayalam">Malayalam</option>
              </select>
              <span className="w-px h-4 bg-slate-300"></span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer py-2 hover:text-[#f84464] transition-colors"
              >
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="IMAX 2D">IMAX 2D</option>
                <option value="IMAX 3D">IMAX 3D</option>
              </select>
              <span className="w-px h-4 bg-slate-300"></span>
              <select className="bg-transparent border-none outline-none cursor-pointer py-2 hover:text-[#f84464] transition-colors">
                <option>Filter Price Range</option>
                <option>Rs. 0-100</option>
                <option>Rs. 101-200</option>
                <option>Rs. 201-300</option>
              </select>
              <span className="w-px h-4 bg-slate-300"></span>
              <select className="bg-transparent border-none outline-none cursor-pointer py-2 hover:text-[#f84464] transition-colors">
                <option>Filter Showtimes</option>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Evening</option>
                <option>Night</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-6 border-t border-slate-200 mt-6">
            <span className="text-sm font-bold text-slate-800 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">
              Select Time
            </span>
            <div className="flex flex-wrap gap-3">
              {availableSlots.length > 0 ? (
                availableSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`px-5 py-2.5 rounded-lg text-xs font-black transition-all border-2 ${selectedTime === time ? "bg-[#f84464] text-white border-[#f84464] shadow-md shadow-rose-200" : "bg-white text-slate-700 border-slate-200 hover:border-[#f84464] hover:text-[#f84464]"}`}
                  >
                    {time}
                  </button>
                ))
              ) : (
                <span className="text-slate-400 text-sm italic py-2">
                  No shows available for this day.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 text-center overflow-hidden">
              {/* Screen */}
              <div className="w-3/4 h-2 bg-primary/40 mx-auto rounded-full blur-sm mb-2"></div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mb-12 md:mb-16 italic">
                Screen this way
              </p>

              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <div className="inline-block min-w-full space-y-3 md:space-y-4">
                  {rows.map((row) => (
                    <div
                      key={row}
                      className="flex justify-center gap-2 md:gap-4"
                    >
                      {cols.map((col) => {
                        const seat = `${row}${col}`;
                        const isSelected = selectedSeats.includes(seat);
                        return (
                          <button
                            key={seat}
                            onClick={() => handleSeatClick(seat)}
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? "bg-primary text-white scale-110 shadow-lg shadow-primary/40" : "bg-slate-800 text-slate-600 hover:bg-slate-700"}`}
                          >
                            <Armchair className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 md:mt-16 flex flex-wrap justify-center gap-4 md:gap-8 text-[10px] md:text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-800"></div> Available
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary"></div> Selected
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-600"></div> Occupied
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sticky top-28">
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">
                Booking Summary
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Movie</span>
                  <span className="text-white font-bold truncate max-w-[150px]">
                    {movie.title}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Theater</span>
                  <span className="text-white font-bold">PVR Premium</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Time</span>
                  <span className="text-white font-bold">{selectedTime}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">Date</span>
                  <span className="text-white font-bold">{bookingDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Seats</span>
                  <span className="text-primary font-bold">
                    {selectedSeats.length > 0
                      ? selectedSeats.join(", ")
                      : "None selected"}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white uppercase tracking-widest">
                        Pay with Coins
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        100 coins per ticket
                      </span>
                    </div>
                    <button
                      onClick={() => setUseCoins(!useCoins)}
                      className={`w-12 h-6 rounded-full transition-all relative ${useCoins ? "bg-primary" : "bg-slate-800"}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useCoins ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Price</span>
                    <span className="text-white font-black text-lg">
                      {useCoins
                        ? `${selectedSeats.length * 100} Coins`
                        : `₹${selectedSeats.length * 250}`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                disabled={selectedSeats.length === 0 || bookingLoading}
                onClick={handleBooking}
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale cursor-pointer disabled:cursor-not-allowed"
              >
                {bookingLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-6 h-6" />
                    <span>PAY NOW</span>
                  </>
                )}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" /> Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SeatSelection;
