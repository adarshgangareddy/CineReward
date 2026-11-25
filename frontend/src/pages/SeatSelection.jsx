import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import {
  MapPin,
  Clock,
  Calendar,
  Coins,
  ArrowLeft,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Film,
  ChevronRight,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Ticket,
  Info,
} from "lucide-react";
import { getActiveSession } from "../utils/auth";
import { getCached, setCached } from "../utils/cache";
import { setActiveBackdrop } from "../utils/backdrop";
import LoadingSpinner from "../components/LoadingSpinner";

const ROWS = ["A", "B", "C", "D", "E", "F", "G"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FORMAT_FILTERS = ["All", "2D", "3D", "IMAX 2D", "Dolby Atmos"];
const CONVENIENCE_FEE_PER_TICKET = 30;

const buildUpcomingDays = () => {
  const days = [];
  const base = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const dayLabel =
      i === 0
        ? "Today"
        : i === 1
        ? "Tom"
        : d.toLocaleDateString("en-US", { weekday: "short" });
    const dateNum = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    days.push({ iso, dayLabel, dateNum, month });
  }
  return days;
};

const getTierForRow = (row, basePrice = 240) => {
  if (row === "F" || row === "G") {
    return { label: "Recliner VIP", price: basePrice + 160 };
  }
  if (row === "C" || row === "D" || row === "E") {
    return { label: "Executive", price: basePrice + 60 };
  }
  return { label: "Classic", price: basePrice };
};

const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const getOccupiedSeats = (seedKey) => {
  const booked = new Set();
  const baseHash = hashSeed(seedKey || "cinereward");
  ROWS.forEach((row, rIdx) => {
    COLS.forEach((col, cIdx) => {
      const score = (baseHash + rIdx * 31 + cIdx * 17) % 19;
      if (score === 2 || score === 7 || score === 13) {
        booked.add(`${row}${col}`);
      }
    });
  });
  return booked;
};

const SeatSelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const upcomingDays = useMemo(() => buildUpcomingDays(), []);

  const [movie, setMovie] = useState(
    () => location.state?.movie || getCached(`movie:${id}`) || null
  );
  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem("selectedCity") || "Hyderabad"
  );
  const [theatres, setTheatres] = useState(
    () => getCached(`theatres:${id}:${localStorage.getItem("selectedCity") || "Hyderabad"}`) || []
  );
  const [loadingTheatres, setLoadingTheatres] = useState(false);

  const [step, setStep] = useState("theatres"); // "theatres" | "seats" | "confirmed"
  const [selectedDate, setSelectedDate] = useState(upcomingDays[0].iso);
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [selectedLang, setSelectedLang] = useState("All");
  const [theatreSearch, setTheatreSearch] = useState("");

  const [selectedTheatre, setSelectedTheatre] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  const [userCoins, setUserCoins] = useState(() => {
    const session = getActiveSession();
    return Number(session?.user?.coins || 0);
  });
  const [useCoins, setUseCoins] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  // Sync city changes from Navbar
  useEffect(() => {
    const onCityChange = (e) => {
      const nextCity = e?.detail || localStorage.getItem("selectedCity") || "Hyderabad";
      setSelectedCity(nextCity);
    };
    window.addEventListener("cinereward:city", onCityChange);
    return () => window.removeEventListener("cinereward:city", onCityChange);
  }, []);

  // Load movie details + sync ambient backdrop cleanly
  useEffect(() => {
    let active = true;
    const prefill = location.state?.movie || getCached(`movie:${id}`);
    if (prefill) {
      setMovie(prefill);
      setCached(`movie:${id}`, prefill);
      setActiveBackdrop(
        prefill.backdrop_path || prefill.backdrop || prefill.poster_path || prefill.poster,
        "detail"
      );
    } else {
      setActiveBackdrop(null, "detail");
    }

    axios
      .get(`/api/movies/${id}`)
      .then((res) => {
        if (!active || !res.data) return;
        setMovie(res.data);
        setCached(`movie:${id}`, res.data);
        setActiveBackdrop(
          res.data.backdrop_path || res.data.backdrop || res.data.poster_path || res.data.poster,
          "detail"
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id, location.state]);

  // Fetch 10 theatres for movie + city
  useEffect(() => {
    let active = true;
    const cacheKey = `theatres:${id}:${selectedCity}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setTheatres(cached);
    } else {
      setLoadingTheatres(true);
    }

    axios
      .get(`/api/movies/${id}/theatres`, { params: { city: selectedCity } })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setTheatres(list);
        setCached(cacheKey, list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingTheatres(false);
      });

    return () => {
      active = false;
    };
  }, [id, selectedCity]);

  // Refresh coin balance if logged in
  useEffect(() => {
    const session = getActiveSession();
    if (!session?.token || session.role !== "user") return;
    axios
      .get("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      .then((res) => {
        if (typeof res.data?.coins === "number") {
          setUserCoins(res.data.coins);
        }
      })
      .catch(() => {});
  }, []);

  const languageOptions = useMemo(() => {
    const base = ["All"];
    const movieLang = movie?.language;
    if (movieLang && movieLang !== "Not specified" && !base.includes(movieLang)) {
      base.push(movieLang);
    }
    ["English", "Hindi", "Telugu", "Tamil"].forEach((lang) => {
      if (!base.includes(lang)) base.push(lang);
    });
    return base;
  }, [movie]);

  const filteredTheatres = useMemo(() => {
    const query = theatreSearch.trim().toLowerCase();
    return theatres.filter((th) => {
      const matchesFormat =
        selectedFormat === "All" ||
        (Array.isArray(th.formats) && th.formats.includes(selectedFormat));
      const matchesQuery =
        !query ||
        th.name.toLowerCase().includes(query) ||
        th.area.toLowerCase().includes(query) ||
        th.badge?.toLowerCase().includes(query);
      return matchesFormat && matchesQuery;
    });
  }, [theatres, selectedFormat, theatreSearch]);

  const occupiedSeats = useMemo(() => {
    if (!selectedTheatre || !selectedSlot) return new Set();
    return getOccupiedSeats(
      `${id}-${selectedTheatre.id}-${selectedDate}-${selectedSlot.time}`
    );
  }, [id, selectedTheatre, selectedDate, selectedSlot]);

  const pricingSummary = useMemo(() => {
    const base = selectedTheatre?.basePrice || 240;
    const subtotal = selectedSeats.reduce((sum, seat) => {
      return sum + getTierForRow(seat[0], base).price;
    }, 0);
    const fee = selectedSeats.length * CONVENIENCE_FEE_PER_TICKET;
    const maxCoinDiscount = Math.floor(subtotal * 0.5);
    const coinsToApply = useCoins ? Math.min(userCoins, maxCoinDiscount) : 0;
    const finalTotal = Math.max(0, subtotal + fee - coinsToApply);
    return { base, subtotal, fee, coinsToApply, finalTotal };
  }, [selectedSeats, selectedTheatre, useCoins, userCoins]);

  const selectedDayObj =
    upcomingDays.find((d) => d.iso === selectedDate) || upcomingDays[0];

  const handleSelectShowtime = (theatre, slot) => {
    setSelectedTheatre(theatre);
    setSelectedSlot(slot);
    setSelectedSeats([]);
    setError("");
    setStep("seats");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSeat = (seatId) => {
    if (occupiedSeats.has(seatId)) return;
    setError("");
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((s) => s !== seatId);
      }
      if (prev.length >= 8) {
        setError("You can book up to 8 seats per transaction.");
        return prev;
      }
      return [...prev, seatId];
    });
  };

  const handleConfirmBooking = async () => {
    setError("");
    if (!selectedTheatre || !selectedSlot || selectedSeats.length === 0) {
      setError("Please select at least 1 seat to continue.");
      return;
    }

    const session = getActiveSession();
    if (!session?.token || !session?.user) {
      navigate("/login", {
        state: {
          from: `/book/${id}`,
          message: "Sign in to confirm your tickets and earn CineReward coins.",
        },
      });
      return;
    }

    setBookingLoading(true);
    const userId = session.user.id || session.user._id;
    const bookingPayload = {
      userId,
      movieId: id,
      movieTitle: movie?.title || "Cinema Booking",
      theatre: `${selectedTheatre.name} (${selectedSlot.screen})`,
      seat: selectedSeats.join(", "),
      date: selectedDate,
      time: selectedSlot.time,
      price: pricingSummary.finalTotal,
      useCoins: useCoins ? pricingSummary.coinsToApply : 0,
    };

    try {
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (pricingSummary.finalTotal > 0 && razorpayKey && window.Razorpay) {
        const orderRes = await axios.post("/api/tickets/create-order", {
          amount: pricingSummary.finalTotal,
          receipt: `cr_${id}_${Date.now()}`,
        });

        const { id: orderId, amount, currency, keyId } = orderRes.data;
        if (orderId && !String(orderId).startsWith("order_mock")) {
          const paid = await new Promise((resolve, reject) => {
            const rzp = new window.Razorpay({
              key: keyId || razorpayKey,
              amount,
              currency: currency || "INR",
              name: "CineReward",
              description: `${movie?.title || "Movie Ticket"} — ${selectedTheatre.shortName}`,
              order_id: orderId,
              handler: async (response) => {
                try {
                  await axios.post("/api/tickets/verify-payment", response);
                  resolve(true);
                } catch (verifyErr) {
                  reject(verifyErr);
                }
              },
              modal: { ondismiss: () => resolve(false) },
              theme: { color: "#e50914" },
            });
            rzp.open();
          });

          if (!paid) {
            setBookingLoading(false);
            return;
          }
        }
      }

      const res = await axios.post("/api/tickets/book", bookingPayload, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const coinsEarned = res.data?.coinsEarned ?? Math.max(25, selectedSeats.length * 25);
      const nextCoins = Math.max(
        0,
        userCoins - pricingSummary.coinsToApply + coinsEarned
      );
      setUserCoins(nextCoins);

      setConfirmation({
        bookingId:
          res.data?.ticket?._id?.slice(-8)?.toUpperCase() ||
          `CR${Date.now().toString().slice(-6)}`,
        movieTitle: bookingPayload.movieTitle,
        theatre: selectedTheatre.name,
        area: selectedTheatre.area,
        city: selectedTheatre.city,
        screen: selectedSlot.screen,
        date: `${selectedDayObj.dayLabel}, ${selectedDayObj.dateNum} ${selectedDayObj.month}`,
        time: selectedSlot.time,
        seats: [...selectedSeats],
        totalPaid: pricingSummary.finalTotal,
        coinsUsed: pricingSummary.coinsToApply,
        coinsEarned,
      });
      setStep("confirmed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Booking failed. If the database is disconnected, check your connection and retry."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (step === "confirmed" && confirmation) {
    return (
      <div className="min-h-[calc(100vh-5rem)] pt-6 pb-28 lg:pt-8 lg:pb-16 px-5">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#0e111b]/80 backdrop-blur-2xl border border-white/[0.14] rounded-3xl p-6 sm:p-9 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-bold">
                    Booking Confirmed
                  </p>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                    {confirmation.movieTitle}
                  </h1>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/15 text-xs font-mono text-slate-200 self-start">
                <Ticket className="w-3.5 h-3.5 text-[#e50914]" />
                #{confirmation.bookingId}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 py-6 border-b border-dashed border-white/15">
              <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.08]">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Cinema &amp; Screen
                </p>
                <p className="text-sm font-bold text-white mt-1">
                  {confirmation.theatre}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {confirmation.area}, {confirmation.city} • {confirmation.screen}
                </p>
              </div>

              <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.08]">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Show Date &amp; Time
                </p>
                <p className="text-sm font-bold text-white mt-1">
                  {confirmation.date}
                </p>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  {confirmation.time}
                </p>
              </div>

              <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.08]">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Selected Seats ({confirmation.seats.length})
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {confirmation.seats.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-0.5 rounded-lg bg-[#e50914]/20 border border-[#e50914]/40 text-xs font-bold text-white"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.08]">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Payment &amp; Coins
                </p>
                <p className="text-lg font-extrabold text-white mt-1">
                  ₹{confirmation.totalPaid}
                </p>
                <p className="text-xs text-amber-400 mt-0.5">
                  +{confirmation.coinsEarned} CineCoins earned
                  {confirmation.coinsUsed > 0
                    ? ` • ${confirmation.coinsUsed} redeemed`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-sm font-semibold text-white transition-all"
              >
                <Printer className="w-4 h-4" />
                Print M-Ticket
              </button>
              <Link
                to="/dashboard"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#e50914] hover:bg-red-700 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-all"
              >
                View My Tickets &amp; Coins
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] pt-6 pb-28 lg:pt-8 lg:pb-16 px-5">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Movie & Booking Header */}
        <div className="bg-[#0e111b]/65 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-4 sm:p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              {step === "seats" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("theatres");
                    setError("");
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change Theatre
                </button>
              ) : (
                <Link
                  to={`/movie/${id}`}
                  state={movie ? { movie } : undefined}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                    {movie?.title || "Book Movie Tickets"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 text-[11px] font-bold text-red-300">
                    {movie?.language && movie.language !== "Not specified"
                      ? movie.language
                      : "UA 13+"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#e50914]" />
                    {selectedCity}
                  </span>
                  {step === "seats" && selectedTheatre && selectedSlot ? (
                    <>
                      <span className="inline-flex items-center gap-1 font-semibold text-white">
                        <Film className="w-3.5 h-3.5 text-amber-400" />
                        {selectedTheatre.name} • {selectedSlot.screen}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedDayObj.dayLabel}, {selectedDayObj.dateNum}{" "}
                        {selectedDayObj.month} • {selectedSlot.time}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">
                      Step 1 of 2 — Pick any theatre &amp; showtime in{" "}
                      {selectedCity}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  step === "theatres"
                    ? "bg-white text-black border-white"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                1. Theatres (10)
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  step === "seats"
                    ? "bg-white text-black border-white"
                    : "bg-white/[0.06] text-slate-400 border-white/10"
                }`}
              >
                2. Seats &amp; Pay
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: BookMyShow-style Theatre & Showtime Selection */}
        {step === "theatres" && (
          <div className="space-y-5">
            {/* Date Strip & Filter Controls */}
            <div className="bg-[#0e111b]/70 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* 7-Day Date Strip */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                  {upcomingDays.map((day) => {
                    const isActive = selectedDate === day.iso;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => setSelectedDate(day.iso)}
                        className={`shrink-0 flex flex-col items-center px-3.5 py-2 rounded-2xl border transition-all min-w-[62px] ${
                          isActive
                            ? "bg-[#e50914] border-[#e50914] text-white shadow-lg shadow-red-900/40"
                            : "bg-white/[0.05] border-white/[0.09] text-slate-300 hover:bg-white/[0.1]"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider opacity-85 font-semibold">
                          {day.dayLabel}
                        </span>
                        <span className="text-base font-extrabold leading-tight">
                          {day.dateNum}
                        </span>
                        <span className="text-[10px] uppercase opacity-75">
                          {day.month}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Theatre + Legend */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={theatreSearch}
                      onChange={(e) => setTheatreSearch(e.target.value)}
                      placeholder="Filter AMB, IMAX, Dolby, area..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Available
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Fast Filling
                    </span>
                  </div>
                </div>
              </div>

              {/* Format & Language Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Experience:
                  </span>
                  {FORMAT_FILTERS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        selectedFormat === fmt
                          ? "bg-white text-black border-white"
                          : "bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.1]"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">
                    Audio:
                  </span>
                  {languageOptions.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLang(lang)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedLang === lang
                          ? "bg-[#e50914]/25 border-[#e50914] text-red-200"
                          : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Theatres List (10 Theatres) */}
            {loadingTheatres && theatres.length === 0 ? (
              <LoadingSpinner message={`Loading 10 cinemas in ${selectedCity}...`} />
            ) : filteredTheatres.length === 0 ? (
              <div className="bg-[#0e111b]/70 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-10 text-center space-y-3">
                <p className="text-white font-semibold">
                  No theatres match your active filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormat("All");
                    setTheatreSearch("");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-white border border-white/15"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredTheatres.map((theatre, idx) => {
                  const isDolbyOrImax =
                    theatre.badge?.toLowerCase().includes("dolby") ||
                    theatre.badge?.toLowerCase().includes("imax");
                  return (
                    <div
                      key={theatre.id || theatre.name}
                      className="bg-[#10131e]/75 backdrop-blur-2xl border border-white/[0.1] hover:border-white/[0.2] rounded-2xl p-4 sm:p-5 transition-all shadow-xl"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Theatre Info */}
                        <div className="space-y-2 lg:max-w-md">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">
                              #{String(idx + 1).padStart(2, "0")}
                            </span>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                              {theatre.name}
                            </h2>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isDolbyOrImax
                                  ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
                                  : "bg-white/[0.07] border-white/15 text-slate-300"
                              }`}
                            >
                              {theatre.badge}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-[#e50914]" />
                              {theatre.area}, {theatre.city}
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              From ₹{theatre.basePrice}
                            </span>
                            <span className="text-slate-400 inline-flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              {theatre.cancellable
                                ? "Cancellation Available"
                                : "Non-cancellable"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(theatre.amenities || []).map((am) => (
                              <span
                                key={am}
                                className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] text-slate-300"
                              >
                                {am}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Showtime Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 lg:flex lg:flex-wrap lg:justify-end">
                          {(theatre.slots || []).map((slot) => {
                            const isFast = slot.status === "fast";
                            return (
                              <button
                                key={`${theatre.id}-${slot.time}`}
                                type="button"
                                onClick={() => handleSelectShowtime(theatre, slot)}
                                className={`group flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 ${
                                  isFast
                                    ? "bg-amber-500/10 border-amber-400/45 hover:bg-amber-500/20 text-amber-300"
                                    : "bg-emerald-500/10 border-emerald-400/40 hover:bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                <span className="text-xs sm:text-sm font-bold tracking-tight">
                                  {slot.time}
                                </span>
                                <span className="text-[10px] text-slate-300/80 group-hover:text-white mt-0.5">
                                  {slot.screen}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Interactive Seat Grid & Checkout */}
        {step === "seats" && selectedTheatre && selectedSlot && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left: Screen + Seat Map */}
            <div className="lg:col-span-8 bg-[#0e111b]/75 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-4 sm:p-7 shadow-2xl">
              {/* Seat Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-white/[0.08] border border-white/25 inline-block" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-[#e50914] border border-red-400 inline-block" />
                    Selected
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-white/[0.03] border border-white/5 opacity-40 inline-block" />
                    Sold Out
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {selectedLang !== "All" ? `${selectedLang} • ` : ""}
                  {selectedTheatre.badge}
                </span>
              </div>

              {/* Curved Cinema Screen */}
              <div className="mb-8 flex flex-col items-center">
                <div className="w-full max-w-md h-3 rounded-t-[100%] bg-gradient-to-r from-transparent via-white/75 to-transparent shadow-[0_-6px_24px_rgba(255,255,255,0.28)]" />
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400 mt-2">
                  All Eyes This Way • {selectedSlot.screen}
                </p>
              </div>

              {/* Seat Rows (scroll-safe on narrow viewports) */}
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[440px] flex flex-col items-center gap-2.5">
                  {ROWS.map((row) => {
                    const tier = getTierForRow(row, pricingSummary.base);
                    const showTierBanner =
                      row === "A" || row === "C" || row === "F";
                    return (
                      <div key={row} className="w-full flex flex-col items-center gap-1.5">
                        {showTierBanner && (
                          <div
                            className={`w-full max-w-lg flex items-center justify-between text-[11px] font-semibold text-slate-400 ${
                              row !== "A"
                                ? "pt-2 border-t border-white/[0.06]"
                                : ""
                            }`}
                          >
                            <span>{tier.label}</span>
                            <span className="text-slate-200">₹{tier.price}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-slate-400 text-right">
                            {row}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {COLS.map((col) => {
                              const seatId = `${row}${col}`;
                              const isBooked = occupiedSeats.has(seatId);
                              const isSelected = selectedSeats.includes(seatId);
                              return (
                                <button
                                  key={seatId}
                                  type="button"
                                  disabled={isBooked}
                                  onClick={() => toggleSeat(seatId)}
                                  title={`${seatId} • ${tier.label} (₹${tier.price})`}
                                  className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                                    col === 5 ? "mr-3" : ""
                                  } ${
                                    isBooked
                                      ? "bg-white/[0.03] border border-white/[0.06] text-slate-600 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-[#e50914] border border-red-300 text-white shadow-md shadow-red-900/50 scale-105"
                                      : "bg-white/[0.07] hover:bg-white/[0.18] border border-white/20 text-slate-200"
                                  }`}
                                >
                                  {col}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Checkout Glass Summary */}
            <div className="lg:col-span-4 bg-[#0e111b]/80 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#e50914]" />
                  Booking Summary
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTheatre.name} ({selectedTheatre.area})
                </p>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Showtime</span>
                  <span className="font-semibold text-white">
                    {selectedDayObj.dayLabel}, {selectedDayObj.dateNum}{" "}
                    {selectedDayObj.month} • {selectedSlot.time}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Screen</span>
                  <span className="font-semibold text-amber-300">
                    {selectedSlot.screen}
                  </span>
                </div>
                <div className="flex justify-between items-start text-slate-300">
                  <span>Seats ({selectedSeats.length})</span>
                  <span className="font-bold text-white text-right">
                    {selectedSeats.length > 0
                      ? selectedSeats.join(", ")
                      : "None selected"}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-sm border-t border-white/10 pt-4">
                <div className="flex justify-between text-slate-300">
                  <span>Tickets ({selectedSeats.length})</span>
                  <span>₹{pricingSummary.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Convenience Fee (₹{CONVENIENCE_FEE_PER_TICKET}/ticket)</span>
                  <span>₹{pricingSummary.fee}</span>
                </div>

                {/* Coin Discount Toggle */}
                {userCoins > 0 && selectedSeats.length > 0 && (
                  <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 cursor-pointer text-xs">
                    <span className="flex items-center gap-2 text-amber-200 font-semibold">
                      <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                      Redeem CineCoins (Bal: {userCoins})
                    </span>
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => setUseCoins(e.target.checked)}
                      className="accent-[#e50914] w-4 h-4"
                    />
                  </label>
                )}

                {pricingSummary.coinsToApply > 0 && (
                  <div className="flex justify-between text-emerald-400 text-xs font-semibold">
                    <span>CineCoins Applied</span>
                    <span>-₹{pricingSummary.coinsToApply}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-base font-extrabold text-white pt-3 border-t border-white/10">
                  <span>Amount Payable</span>
                  <span>₹{pricingSummary.finalTotal}</span>
                </div>
              </div>

              {selectedSeats.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                  You will earn +{Math.max(25, selectedSeats.length * 25)}{" "}
                  CineReward Coins on this booking!
                </div>
              )}

              {error && (
                <div className="text-xs text-red-200 bg-red-500/15 border border-red-500/35 rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={bookingLoading || selectedSeats.length === 0}
                onClick={handleConfirmBooking}
                className="w-full py-3.5 rounded-xl bg-[#e50914] hover:bg-red-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {bookingLoading
                  ? "Confirming Tickets..."
                  : selectedSeats.length === 0
                  ? "Pick Seats to Proceed"
                  : `Pay ₹${pricingSummary.finalTotal} & Book`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatSelection;
