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
  ShieldCheck,
  Sparkles,
  Film,
  Search,
  RotateCcw,
  Info,
  Heart,
  X,
  Plus,
  Minus,
  ShoppingBag,
  Pencil,
} from "lucide-react";
import { getActiveSession } from "../utils/auth";
import { getCached, setCached } from "../utils/cache";
import { setActiveBackdrop } from "../utils/backdrop";
import { resolveMoviePoster } from "../utils/media";
import LoadingSpinner from "../components/LoadingSpinner";
import WhiteTicketCard from "../components/WhiteTicketCard";

const ROWS = ["A", "B", "C", "D", "E", "F", "G"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const CITIES_LIST = [
  "Mumbai",
  "Delhi-NCR",
  "Bengaluru",
  "Hyderabad",
  "Chandigarh",
  "Ahmedabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Kochi",
];

const LANGUAGE_FORMAT_GROUPS = [
  { language: "ENGLISH", formats: ["DOLBY CINEMA 2D", "IMAX 2D", "3D", "4DX 3D"] },
  { language: "HINDI", formats: ["2D", "3D", "IMAX 2D"] },
  { language: "TELUGU", formats: ["2D", "DOLBY ATMOS"] },
];

const SNACKS_MENU = [
  {
    id: "snack-1",
    name: "Small Popcorn Combo",
    desc: "Salted Popcorn 55g + Chilled Cola 300ml",
    price: 310,
    badge: "Bestseller",
  },
  {
    id: "snack-2",
    name: "Couple Combo",
    desc: "2x Classic Popcorn 55g + 2x Cola 300ml",
    price: 610,
    badge: "Popular",
  },
  {
    id: "snack-3",
    name: "Super Start Nachos Veg",
    desc: "Popcorn 90g + Loaded Cheese Nachos + 2 Drinks",
    price: 770,
    badge: "Value Pack",
  },
  {
    id: "snack-4",
    name: "French Fries Combo",
    desc: "Peri-Peri Crispy Fries 110g + Cola 650ml",
    price: 450,
    badge: "Veg",
  },
  {
    id: "snack-5",
    name: "Tub Popcorn Mega Combo",
    desc: "Caramel & Cheese Tub 110g + 2 Large Colas",
    price: 740,
    badge: "Theatre Special",
  },
];

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

const getTierForRow = (row, theatre) => {
  const tiers = theatre?.tiers || [];
  const majestic = tiers.find((t) => t.key === "majestic")?.price || (theatre?.basePrice || 240) + 240;
  const grand = tiers.find((t) => t.key === "grand")?.price || (theatre?.basePrice || 240) + 110;
  const classic = tiers.find((t) => t.key === "classic")?.price || theatre?.basePrice || 240;

  if (row === "F" || row === "G") {
    return { key: "majestic", label: "MAJESTIC", price: majestic };
  }
  if (row === "C" || row === "D" || row === "E") {
    return { key: "grand", label: "GRAND", price: grand };
  }
  return { key: "classic", label: "CLASSIC", price: classic };
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

const ensureRazorpayLoaded = () =>
  new Promise((resolve) => {
    if (typeof window.Razorpay === "function") return resolve(true);
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(typeof window.Razorpay === "function"));
      setTimeout(() => resolve(typeof window.Razorpay === "function"), 2500);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const SeatSelection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const upcomingDays = useMemo(() => buildUpcomingDays(), []);
  const session = getActiveSession();
  const sessionUser = session?.data || session?.user;

  const [movie, setMovie] = useState(
    () => location.state?.movie || getCached(`movie:${id}`) || null
  );
  const [selectedCity, setSelectedCity] = useState(
    () => localStorage.getItem("selectedCity") || "Bengaluru"
  );
  const [theatres, setTheatres] = useState(
    () =>
      getCached(
        `theatres:${id}:${localStorage.getItem("selectedCity") || "Bengaluru"}`
      ) || []
  );
  const [loadingTheatres, setLoadingTheatres] = useState(false);

  // BookMyShow Flow States
  const [step, setStep] = useState("theatres"); // "theatres" | "seats" | "snacks" | "confirmed"
  const [showFormatModal, setShowFormatModal] = useState(true);
  const [selectedLangFormat, setSelectedLangFormat] = useState({
    language: "English",
    format: "All Formats",
  });

  const [selectedDate, setSelectedDate] = useState(upcomingDays[0].iso);
  const [priceRange, setPriceRange] = useState("all");
  const [preferredTime, setPreferredTime] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [theatreSearch, setTheatreSearch] = useState("");
  const [favoriteTheatres, setFavoriteTheatres] = useState([]);

  // Step 1 -> "How many seats?" Modal -> Step 2 Seat Grid
  const [pendingShow, setPendingShow] = useState(null);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [seatQuantity, setSeatQuantity] = useState(2);

  const [selectedTheatre, setSelectedTheatre] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Step 2 -> Terms Modal -> Direct Razorpay OR Optional Snacks -> Razorpay
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [snackCart, setSnackCart] = useState({});

  const [userCoins, setUserCoins] = useState(() =>
    Number(sessionUser?.coins || 0)
  );
  const [useCoins, setUseCoins] = useState(false);
  const [contactEmail, setContactEmail] = useState(sessionUser?.email || "");
  const [contactPhone, setContactPhone] = useState(sessionUser?.phone || "");

  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    const onCityChange = (e) => {
      const nextCity =
        e?.detail || localStorage.getItem("selectedCity") || "Bengaluru";
      setSelectedCity(nextCity);
      setStep("theatres");
      setSelectedTheatre(null);
      setSelectedSlot(null);
      setSelectedSeats([]);
    };
    window.addEventListener("cinereward:city", onCityChange);
    return () => window.removeEventListener("cinereward:city", onCityChange);
  }, []);

  const handleCitySwitch = (city) => {
    setSelectedCity(city);
    localStorage.setItem("selectedCity", city);
    localStorage.setItem("selectedCityConfirmed", "1");
    window.dispatchEvent(new CustomEvent("cinereward:city", { detail: city }));
    setStep("theatres");
    setSelectedTheatre(null);
    setSelectedSlot(null);
    setSelectedSeats([]);
  };

  useEffect(() => {
    let active = true;
    const prefill = location.state?.movie || getCached(`movie:${id}`);
    if (prefill) {
      setMovie(prefill);
      setCached(`movie:${id}`, prefill);
      setActiveBackdrop(
        prefill.backdrop_path ||
          prefill.backdrop ||
          prefill.poster_path ||
          prefill.poster,
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
          res.data.backdrop_path ||
            res.data.backdrop ||
            res.data.poster_path ||
            res.data.poster,
          "detail"
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id, location.state]);

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

  useEffect(() => {
    if (!session?.token || session.role !== "user") return;
    axios
      .get("/api/auth/me", {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      .then((res) => {
        if (typeof res.data?.user?.coins === "number") {
          setUserCoins(res.data.user.coins);
        }
      })
      .catch(() => {});
  }, [session?.token, session?.role]);

  const filteredTheatres = useMemo(() => {
    const query = theatreSearch.trim().toLowerCase();
    const list = theatres.filter((th) => {
      const price = Number(th.basePrice || 240);
      const matchesPrice =
        priceRange === "all" ||
        (priceRange === "low" && price <= 300) ||
        (priceRange === "mid" && price > 300 && price <= 450) ||
        (priceRange === "high" && price > 450);

      const matchesQuery =
        !query ||
        th.name.toLowerCase().includes(query) ||
        th.area.toLowerCase().includes(query) ||
        th.badge?.toLowerCase().includes(query);

      return matchesPrice && matchesQuery;
    });

    const sorted = [...list];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sortBy === "fav") {
      sorted.sort(
        (a, b) =>
          (favoriteTheatres.includes(b.id) ? 1 : 0) -
          (favoriteTheatres.includes(a.id) ? 1 : 0)
      );
    }
    return sorted;
  }, [theatres, priceRange, theatreSearch, sortBy, favoriteTheatres]);

  const slotMatchesPreferredTime = (timeStr) => {
    if (preferredTime === "all") return true;
    const isPM = timeStr.includes("PM");
    const hourRaw = parseInt(timeStr.split(":")[0], 10);
    const hour24 = isPM ? (hourRaw === 12 ? 12 : hourRaw + 12) : hourRaw === 12 ? 0 : hourRaw;
    if (preferredTime === "morning") return hour24 < 12;
    if (preferredTime === "afternoon") return hour24 >= 12 && hour24 < 16;
    if (preferredTime === "evening") return hour24 >= 16 && hour24 < 20;
    if (preferredTime === "night") return hour24 >= 20;
    return true;
  };

  const occupiedSeats = useMemo(() => {
    if (!selectedTheatre || !selectedSlot) return new Set();
    return getOccupiedSeats(
      `${id}-${selectedTheatre.id}-${selectedDate}-${selectedSlot.time}`
    );
  }, [id, selectedTheatre, selectedDate, selectedSlot]);

  const snacksSummary = useMemo(() => {
    const items = [];
    let total = 0;
    for (const sn of SNACKS_MENU) {
      const qty = snackCart[sn.id] || 0;
      if (qty > 0) {
        items.push({ ...sn, qty, lineTotal: sn.price * qty });
        total += sn.price * qty;
      }
    }
    return {
      items,
      total,
      summaryText: items.map((i) => `${i.qty}x ${i.name}`).join(", "),
    };
  }, [snackCart]);

  const pricingSummary = useMemo(() => {
    const ticketSubtotal = selectedSeats.reduce((sum, seat) => {
      return sum + getTierForRow(seat[0], selectedTheatre).price;
    }, 0);
    const fee = selectedSeats.length * CONVENIENCE_FEE_PER_TICKET;
    const maxCoinDiscount = Math.floor(ticketSubtotal * 0.5);
    const coinsToApply = useCoins
      ? Math.min(userCoins, maxCoinDiscount)
      : 0;
    const finalTotal = Math.max(
      0,
      ticketSubtotal + snacksSummary.total + fee - coinsToApply
    );
    return {
      ticketSubtotal,
      snacksTotal: snacksSummary.total,
      fee,
      coinsToApply,
      finalTotal,
    };
  }, [
    selectedSeats,
    selectedTheatre,
    snacksSummary.total,
    useCoins,
    userCoins,
  ]);

  const selectedDayObj =
    upcomingDays.find((d) => d.iso === selectedDate) || upcomingDays[0];

  const handleOpenQtyModal = (theatre, slot) => {
    setPendingShow({ theatre, slot });
    setShowQtyModal(true);
  };

  const handleConfirmSeatQuantity = () => {
    if (pendingShow) {
      setSelectedTheatre(pendingShow.theatre);
      setSelectedSlot(pendingShow.slot);
      setSelectedSeats([]);
      setPendingShow(null);
      setStep("seats");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setShowQtyModal(false);
    setError("");
  };

  const handleSeatClick = (row, col) => {
    const seatId = `${row}${col}`;
    if (occupiedSeats.has(seatId)) return;
    setError("");

    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((s) => s !== seatId);
      }

      if (seatQuantity === 1) {
        return [seatId];
      }

      if (prev.length === 0) {
        const autoPicked = [seatId];
        for (let offset = 1; offset < seatQuantity; offset += 1) {
          const nextCol = col + offset;
          const nextId = `${row}${nextCol}`;
          if (nextCol <= 10 && !occupiedSeats.has(nextId)) {
            autoPicked.push(nextId);
          } else {
            break;
          }
        }
        return autoPicked;
      }

      if (prev.length >= seatQuantity) {
        return [...prev.slice(1), seatId];
      }
      return [...prev, seatId];
    });
  };

  const updateSnackQty = (snackId, delta) => {
    setSnackCart((prev) => {
      const nextQty = Math.max(0, Math.min(8, (prev[snackId] || 0) + delta));
      return { ...prev, [snackId]: nextQty };
    });
  };

  const finalizeTicketBooking = async (bookingPayload) => {
    const res = await axios.post("/api/tickets/book", bookingPayload);

    const coinsEarned =
      res.data?.coinsEarned ?? Math.max(25, selectedSeats.length * 25);
    setUserCoins(
      Math.max(0, userCoins - pricingSummary.coinsToApply + coinsEarned)
    );

    setConfirmation({
      bookingId:
        res.data?.ticket?._id?.slice(-8)?.toUpperCase() ||
        res.data?._id?.slice(-8)?.toUpperCase() ||
        `CR${Date.now().toString().slice(-6)}`,
      movieTitle: bookingPayload.movieTitle,
      poster: movie?.poster_path
        ? resolveMoviePoster(movie.poster_path, movie.id)
        : null,
      languageFormat: bookingPayload.languageFormat,
      theatre: selectedTheatre.name,
      area: selectedTheatre.area,
      city: selectedTheatre.city,
      screen: selectedSlot.screen,
      date: `${selectedDayObj.dayLabel}, ${selectedDayObj.dateNum} ${selectedDayObj.month}`,
      time: selectedSlot.time,
      seats: [...selectedSeats],
      ticketSubtotal: pricingSummary.ticketSubtotal,
      snacksTotal: pricingSummary.snacksTotal,
      snacksSummary: snacksSummary.summaryText,
      fee: pricingSummary.fee,
      totalPaid: pricingSummary.finalTotal,
      paymentMethod: bookingPayload.paymentMethod,
      coinsUsed: pricingSummary.coinsToApply,
      coinsEarned,
    });
    setStep("confirmed");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmBooking = async () => {
    setError("");
    if (!selectedTheatre || !selectedSlot || selectedSeats.length === 0) {
      setError("Please select your seats to continue.");
      return;
    }

    if (!session?.token || !sessionUser) {
      navigate("/login", {
        state: {
          from: { pathname: `/book/${id}` },
          message: "Sign in to confirm your tickets and earn CineReward coins.",
        },
      });
      return;
    }

    setBookingLoading(true);
    const userId = sessionUser.id || sessionUser._id;
    const methodLabel =
      pricingSummary.finalTotal === 0 ? "CineCoins" : "Razorpay";

    const bookingPayload = {
      userId,
      movieId: id,
      movieTitle: movie?.title || "Cinema Booking",
      theatre: `${selectedTheatre.name} (${selectedSlot.screen})`,
      city: selectedTheatre.city,
      languageFormat: `${selectedLangFormat.language} (${selectedLangFormat.format})`,
      seat: selectedSeats.join(", "),
      date: selectedDate,
      time: selectedSlot.time,
      price: pricingSummary.finalTotal,
      snacksTotal: pricingSummary.snacksTotal,
      snacksSummary: snacksSummary.summaryText,
      convenienceFee: pricingSummary.fee,
      paymentMethod: methodLabel,
      useCoins: pricingSummary.coinsToApply,
    };

    try {
      if (pricingSummary.finalTotal > 0) {
        const sdkReady = await ensureRazorpayLoaded();
        const orderRes = await axios.post("/api/tickets/create-order", {
          amount: pricingSummary.finalTotal,
          receipt: `cr_${id}_${Date.now()}`,
        });

        const { id: orderId, amount, currency, keyId } = orderRes.data;
        if (!keyId || !sdkReady || typeof window.Razorpay !== "function") {
          throw new Error(
            "Razorpay gateway could not be initialized. Check backend RAZORPAY_KEY_ID or disable extensions blocking checkout.razorpay.com."
          );
        }

        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency: currency || "INR",
          name: "CineReward",
          description: `${movie?.title || "Movie Ticket"} — ${selectedTheatre.shortName}`,
          order_id: orderId,
          handler: async (response) => {
            try {
              setBookingLoading(true);
              const verifyRes = await axios.post("/api/tickets/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              if (verifyRes.data?.status && verifyRes.data.status !== "success") {
                throw new Error("Payment signature verification failed.");
              }
              await finalizeTicketBooking({
                ...bookingPayload,
                paymentMethod: "Razorpay",
              });
            } catch (err) {
              setError(
                err.response?.data?.message ||
                  err.message ||
                  "Payment verification failed."
              );
            } finally {
              setBookingLoading(false);
            }
          },
          modal: {
            ondismiss: () => setBookingLoading(false),
          },
          prefill: {
            name: sessionUser?.name || "",
            email: contactEmail || sessionUser?.email || "",
            contact: contactPhone || sessionUser?.phone || "",
          },
          theme: { color: "#e50914" },
        });

        rzp.on("payment.failed", (resp) => {
          setBookingLoading(false);
          setError(
            resp.error?.description ||
              "Razorpay payment could not be completed."
          );
        });

        rzp.open();
        return;
      }

      await finalizeTicketBooking(bookingPayload);
      setBookingLoading(false);
    } catch (err) {
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Booking failed. Verify backend Razorpay & Supabase configuration."
      );
      setBookingLoading(false);
    }
  };

  if (step === "confirmed" && confirmation) {
    return (
      <div className="min-h-[calc(100vh-5rem)] pt-6 pb-28 lg:pt-8 lg:pb-16 px-4 sm:px-5">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <Link
              to="/dashboard"
              className="glass-button px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> My Tickets &amp; Dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-crimson px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print / Save White Pass
            </button>
          </div>

          <WhiteTicketCard {...confirmation} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] pt-5 pb-32 lg:pt-8 lg:pb-16 px-3.5 sm:px-5">
      <div className="max-w-7xl mx-auto space-y-5 min-w-0">
        {/* Top Movie & Progress Header */}
        <div className="bg-[#0e111b]/75 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-4 sm:p-6 shadow-2xl min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              {step !== "theatres" ? (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    if (step === "snacks") setStep("seats");
                    else setStep("theatres");
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <Link
                  to={`/movie/${id}`}
                  state={movie ? { movie } : undefined}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight break-words">
                    {movie?.title || "Book Movie Tickets"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 text-[10px] font-bold text-red-300 shrink-0">
                    {movie?.certification || "UA 16+"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFormatModal(true)}
                    className="px-2.5 py-0.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[10px] font-bold text-slate-200 inline-flex items-center gap-1"
                  >
                    <span>
                      {selectedLangFormat.language} • {selectedLangFormat.format}
                    </span>
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 mt-2">
                  <label className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1 text-white font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                    <select
                      aria-label="Select cinema city"
                      value={selectedCity}
                      onChange={(e) => handleCitySwitch(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                    >
                      {CITIES_LIST.map((city) => (
                        <option key={city} value={city} className="bg-[#121520]">
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedTheatre && selectedSlot && step !== "theatres" ? (
                    <>
                      <span className="inline-flex items-center gap-1 font-semibold text-white break-words">
                        <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {selectedTheatre.name} ({selectedSlot.screen})
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {selectedDayObj.dayLabel}, {selectedDayObj.dateNum}{" "}
                        {selectedDayObj.month} • {selectedSlot.time}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">
                      10 Cinemas in <strong className="text-white">{selectedCity}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {step === "seats" && (
              <button
                type="button"
                onClick={() => setShowQtyModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.15] text-xs font-bold text-white self-start lg:self-center shrink-0"
              >
                <Pencil className="w-3.5 h-3.5 text-[#ff2e3b]" />
                <span>{seatQuantity} Tickets</span>
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: BookMyShow Theatres & Showtimes */}
        {step === "theatres" && (
          <div className="space-y-4 min-w-0">
            <div className="bg-[#0e111b]/75 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
                  {upcomingDays.map((day) => {
                    const isActive = selectedDate === day.iso;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => setSelectedDate(day.iso)}
                        className={`shrink-0 flex flex-col items-center px-3.5 py-2 rounded-2xl border transition-all min-w-[58px] ${
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

                {/* Filters Row matching BookMyShow */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <select
                    aria-label="Price range filter"
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121520]">Price Range: All</option>
                    <option value="low" className="bg-[#121520]">Under ₹300</option>
                    <option value="mid" className="bg-[#121520]">₹301 – ₹450</option>
                    <option value="high" className="bg-[#121520]">₹450+</option>
                  </select>

                  <select
                    aria-label="Preferred time filter"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121520]">Preferred Time: All</option>
                    <option value="morning" className="bg-[#121520]">Morning (&lt;12 PM)</option>
                    <option value="afternoon" className="bg-[#121520]">Afternoon (12–4 PM)</option>
                    <option value="evening" className="bg-[#121520]">Evening (4–8 PM)</option>
                    <option value="night" className="bg-[#121520]">Night (8 PM+)</option>
                  </select>

                  <select
                    aria-label="Sort cinemas"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="featured" className="bg-[#121520]">Sort By: Popular</option>
                    <option value="price_asc" className="bg-[#121520]">Price: Low to High</option>
                    <option value="price_desc" className="bg-[#121520]">Price: High to Low</option>
                    <option value="fav" className="bg-[#121520]">Favorites First</option>
                  </select>

                  <div className="relative col-span-2 sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={theatreSearch}
                      onChange={(e) => setTheatreSearch(e.target.value)}
                      placeholder={`Search ${selectedCity} theatre...`}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.08] text-[11px] text-slate-300">
                <span>Tap any showtime pill to choose ticket quantity &amp; seats.</span>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    AVAILABLE
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    FAST FILLING
                  </span>
                </div>
              </div>
            </div>

            {loadingTheatres && theatres.length === 0 ? (
              <LoadingSpinner message={`Loading 10 cinemas in ${selectedCity}...`} />
            ) : filteredTheatres.length === 0 ? (
              <div className="bg-[#0e111b]/75 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-10 text-center space-y-3">
                <p className="text-white font-semibold">
                  No theatres match your active filters in {selectedCity}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPriceRange("all");
                    setPreferredTime("all");
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
                {filteredTheatres.map((theatre) => {
                  const isFav = favoriteTheatres.includes(theatre.id);
                  const matchingSlots = (theatre.slots || []).filter((s) =>
                    slotMatchesPreferredTime(s.time)
                  );
                  return (
                    <div
                      key={theatre.id || theatre.name}
                      className="bg-[#10131e]/80 backdrop-blur-2xl border border-white/[0.1] hover:border-white/[0.22] rounded-2xl p-4 sm:p-5 transition-all shadow-xl min-w-0"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
                        <div className="space-y-2 lg:max-w-md min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <button
                                type="button"
                                aria-label="Favorite cinema"
                                onClick={() =>
                                  setFavoriteTheatres((prev) =>
                                    prev.includes(theatre.id)
                                      ? prev.filter((x) => x !== theatre.id)
                                      : [...prev, theatre.id]
                                  )
                                }
                                className="text-slate-400 hover:text-[#e50914] transition-colors shrink-0"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isFav ? "fill-[#e50914] text-[#e50914]" : ""
                                  }`}
                                />
                              </button>
                              <h2 className="text-base font-bold text-white break-words">
                                {theatre.name}
                              </h2>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-amber-300 font-semibold">
                              {theatre.badge}
                            </span>
                            <span className="text-slate-400 inline-flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              {theatre.cancellable ? "Cancellation Available" : "Non-cancellable"}
                            </span>
                          </div>

                          {theatre.promo && (
                            <p className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-lg px-2.5 py-1 inline-block">
                              {theatre.promo}
                            </p>
                          )}

                          {/* Tier Prices Inline Preview (BookMyShow hover/tile info) */}
                          <div className="flex flex-wrap gap-3 text-[11px] pt-1">
                            {(theatre.tiers || []).map((tier) => (
                              <span key={tier.key} className="text-slate-300">
                                <strong className="text-white">₹{tier.price}</strong>{" "}
                                <span className="text-slate-400 text-[10px]">{tier.label}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 lg:flex lg:flex-wrap lg:justify-end">
                          {matchingSlots.map((slot) => {
                            const isFast = slot.status === "fast";
                            return (
                              <button
                                key={`${theatre.id}-${slot.time}`}
                                type="button"
                                onClick={() => handleOpenQtyModal(theatre, slot)}
                                title={(theatre.tiers || [])
                                  .map((t) => `${t.label}: ₹${t.price}`)
                                  .join(" • ")}
                                className={`group relative flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 ${
                                  isFast
                                    ? "bg-amber-500/10 border-amber-400/45 hover:bg-amber-500/20 text-amber-300"
                                    : "bg-emerald-500/10 border-emerald-400/40 hover:bg-emerald-500/20 text-emerald-300"
                                }`}
                              >
                                <span className="text-xs sm:text-sm font-bold tracking-tight">
                                  {slot.time}
                                </span>
                                <span className="text-[10px] text-slate-300/80 group-hover:text-white mt-0.5">
                                  {slot.experience || slot.screen}
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

        {/* STEP 2: BookMyShow Grouped Seat Map */}
        {step === "seats" && selectedTheatre && selectedSlot && (
          <div className="space-y-5 min-w-0">
            {/* Top Showtime Pill Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(selectedTheatre.slots || []).map((sl) => {
                const isActive = sl.time === selectedSlot.time;
                return (
                  <button
                    key={sl.time}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(sl);
                      setSelectedSeats([]);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 border-emerald-400"
                        : "bg-white/[0.06] text-emerald-300 border-emerald-500/35 hover:bg-white/[0.12]"
                    }`}
                  >
                    <div>{sl.time}</div>
                    <div className="text-[9px] font-medium opacity-80">{sl.screen}</div>
                  </button>
                );
              })}
            </div>

            <div className="bg-[#0e111b]/85 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-3.5 sm:p-7 shadow-2xl min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-white/10 text-[11px] sm:text-xs text-slate-300">
                <span>
                  Tap any seat to auto-select <strong className="text-white">{seatQuantity}</strong> ticket(s) ({selectedSeats.length}/{seatQuantity} picked)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border border-emerald-400/60 bg-emerald-500/10 inline-block" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
                    Selected
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-white/[0.05] opacity-40 inline-block" />
                    Sold
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-full">
                {[...ROWS].reverse().map((row) => {
                  const tier = getTierForRow(row, selectedTheatre);
                  const showTierHeader = row === "G" || row === "E" || row === "B";
                  return (
                    <div
                      key={row}
                      className="w-full max-w-[520px] flex flex-col items-center gap-1.5"
                    >
                      {showTierHeader && (
                        <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-300 pt-3 pb-1 border-b border-white/[0.08]">
                          <span>₹{tier.price} {tier.label}</span>
                          <span className="text-[10px] text-slate-400">
                            {tier.key === "majestic" ? "Filling Fast" : "Available"}
                          </span>
                        </div>
                      )}
                      <div className="w-full flex items-center justify-center gap-1 sm:gap-2">
                        <span className="w-3.5 sm:w-5 text-[10px] sm:text-xs font-bold text-slate-400 text-right shrink-0">
                          {row}
                        </span>
                        <div className="flex items-center justify-center gap-[3px] sm:gap-1.5">
                          {COLS.map((col) => {
                            const seatId = `${row}${col}`;
                            const isBooked = occupiedSeats.has(seatId);
                            const isSelected = selectedSeats.includes(seatId);
                            return (
                              <button
                                key={seatId}
                                type="button"
                                disabled={isBooked}
                                onClick={() => handleSeatClick(row, col)}
                                title={`${seatId} • ₹${tier.price} ${tier.label}`}
                                className={`w-[25px] h-7 sm:w-8 sm:h-8 rounded-md text-[10px] sm:text-[11px] font-bold transition-all shrink-0 ${
                                  col === 5 ? "mr-1.5 sm:mr-3" : ""
                                } ${
                                  isBooked
                                    ? "bg-white/[0.04] border border-white/[0.06] text-slate-600 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-emerald-500 border border-emerald-300 text-slate-950 shadow-md shadow-emerald-900/50 scale-105"
                                      : "bg-emerald-500/[0.08] hover:bg-emerald-500/25 border border-emerald-400/50 text-emerald-300"
                                }`}
                              >
                                {String(col).padStart(2, "0")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Screen indicator at bottom matching BookMyShow layout */}
              <div className="mt-8 flex flex-col items-center">
                <div className="w-4/5 max-w-md h-2.5 rounded-b-[100%] bg-gradient-to-r from-transparent via-sky-300/70 to-transparent shadow-[0_6px_20px_rgba(56,189,248,0.28)]" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mt-2 text-center">
                  All eyes this way please
                </p>
              </div>
            </div>

            {/* Bottom Pay Floating Bar */}
            {selectedSeats.length > 0 && (
              <div className="bg-[#0e111b]/90 backdrop-blur-2xl border border-white/[0.15] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
                <div className="text-xs text-slate-300">
                  Selected Seats:{" "}
                  <strong className="text-white">{selectedSeats.join(", ")}</strong> • Tickets:{" "}
                  <strong className="text-white">₹{pricingSummary.ticketSubtotal}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#e50914] hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition-all"
                >
                  Pay ₹{pricingSummary.ticketSubtotal}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Grab a Bite! (BookMyShow F&B Add-ons) */}
        {step === "snacks" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
            <div className="min-w-0 w-full lg:col-span-8 bg-[#0e111b]/85 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#ff2e3b]" />
                    Grab a Bite!
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Add pre-ordered snacks &amp; combos delivered right to your seat.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={bookingLoading}
                  onClick={handleConfirmBooking}
                  className="glass-button px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Skip &amp; Pay ₹{pricingSummary.finalTotal}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SNACKS_MENU.map((item) => {
                  const qty = snackCart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-white/[0.04] border border-white/[0.09] rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-white">{item.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <span className="text-sm font-extrabold text-white">
                          ₹{item.price}
                        </span>
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateSnackQty(item.id, 1)}
                            className="px-4 py-1.5 rounded-xl border border-[#e50914] text-[#ff2e3b] hover:bg-[#e50914] hover:text-white text-xs font-bold transition-all"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 bg-[#e50914]/20 border border-[#e50914]/50 rounded-xl px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateSnackQty(item.id, -1)}
                              className="p-0.5 text-white"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-white w-4 text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateSnackQty(item.id, 1)}
                              className="p-0.5 text-white"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 w-full lg:col-span-4 bg-[#0e111b]/90 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white break-words">
                    {movie?.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedTheatre?.name} • {selectedSlot?.time} • {selectedSeats.join(", ")}
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#ff2e3b] shrink-0">
                  {selectedSeats.length} M-Ticket
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Tickets ({selectedSeats.length})</span>
                  <span className="font-bold text-white">₹{pricingSummary.ticketSubtotal}.00</span>
                </div>
                {pricingSummary.snacksTotal > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Food &amp; Beverages</span>
                    <span className="font-bold text-white">₹{pricingSummary.snacksTotal}.00</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Convenience fees</span>
                  <span>₹{pricingSummary.fee}.00</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Your Food Cart
                </h3>
                {snacksSummary.items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                    Fill your cart with favourite combos or pay directly!
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {snacksSummary.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-slate-200">
                        <span>{it.qty}x {it.name}</span>
                        <span className="font-bold">₹{it.lineTotal}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  M-Ticket &amp; Notification Details
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email for M-Ticket"
                    className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e50914]"
                  />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone (+91...)"
                    className="bg-white/[0.06] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e50914]"
                  />
                </div>
              </div>

              {userCoins > 0 && (
                <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 cursor-pointer text-xs">
                  <span className="flex items-center gap-2 text-amber-200 font-semibold">
                    <Coins className="w-4 h-4 text-amber-400" />
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
                <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                  <span>CineCoins Discount</span>
                  <span>-₹{pricingSummary.coinsToApply}.00</span>
                </div>
              )}

              <div className="flex justify-between items-center text-base font-extrabold text-white pt-3 border-t border-white/10">
                <span>Amount Payable</span>
                <span>₹{pricingSummary.finalTotal}.00</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Earn +{Math.max(25, selectedSeats.length * 25)} CineReward Coins!
                </span>
              </div>

              {error && (
                <div className="text-xs text-red-200 bg-red-500/15 border border-red-500/35 rounded-xl px-3.5 py-2.5 break-words">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={bookingLoading}
                onClick={handleConfirmBooking}
                className="w-full btn-crimson py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {bookingLoading
                    ? "Opening Razorpay..."
                    : pricingSummary.finalTotal === 0
                      ? "Confirm Booking with Coins"
                      : `Pay ₹${pricingSummary.finalTotal}.00 via Razorpay`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Select Language & Format */}
      {showFormatModal && step === "theatres" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={() => setShowFormatModal(false)}
        >
          <div
            className="glass-panel w-full max-w-md rounded-3xl p-6 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowFormatModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-slate-400">{movie?.title || "Book Tickets"}</p>
              <h2 className="text-lg font-extrabold text-white">
                Select language and format
              </h2>
            </div>

            <div className="space-y-4">
              {LANGUAGE_FORMAT_GROUPS.map((grp) => (
                <div key={grp.language} className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {grp.language}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {grp.formats.map((fmt) => (
                      <button
                        key={`${grp.language}-${fmt}`}
                        type="button"
                        onClick={() => {
                          setSelectedLangFormat({ language: grp.language, format: fmt });
                          setShowFormatModal(false);
                        }}
                        className="px-3.5 py-2 rounded-full border border-[#e50914]/45 bg-[#e50914]/10 hover:bg-[#e50914] text-xs font-bold text-rose-200 hover:text-white transition-all"
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedLangFormat({ language: "Original", format: "All Formats" });
                  setShowFormatModal(false);
                }}
                className="w-full py-2.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-white"
              >
                Select All Formats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: "How many seats?" BookMyShow Scooter Popup */}
      {showQtyModal && pendingShow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={() => setShowQtyModal(false)}
        >
          <div
            className="glass-panel w-full max-w-md rounded-3xl p-6 text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-white">How many seats?</h2>
            <div className="text-4xl">🛵</div>

            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSeatQuantity(num)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    seatQuantity === num
                      ? "bg-[#e50914] text-white shadow-lg shadow-red-900/40 scale-110"
                      : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.14]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
              {(pendingShow.theatre.tiers || []).map((t) => (
                <div key={t.key} className="bg-white/[0.04] rounded-xl p-2.5 border border-white/[0.08]">
                  <p className="text-[10px] font-bold text-slate-400">{t.label}</p>
                  <p className="text-sm font-extrabold text-white mt-0.5">₹{t.price}</p>
                  <p
                    className={`text-[10px] font-bold mt-0.5 ${
                      t.status === "Filling Fast" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {t.status}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleConfirmSeatQuantity}
              className="w-full btn-crimson py-3.5 rounded-xl text-sm font-bold"
            >
              Select Seats
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: BookMyShow Terms & Conditions */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="glass-panel w-full max-w-md rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-white text-center">
              Terms &amp; Conditions
            </h2>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-xs text-slate-300 space-y-2 max-h-60 overflow-y-auto leading-relaxed">
              <p className="text-rose-300 font-semibold">
                Accessibility features such as closed captions or Audio Description vary by auditorium.
              </p>
              <p>
                Please arrive 20 minutes before showtime with your M-Ticket ID and barcode. Outside food and beverages are not permitted inside cinema halls; pre-booked combos can be added in the next step.
              </p>
              <p>
                Tickets once confirmed follow the selected theatre&apos;s cancellation policy ({selectedTheatre?.cancellable ? "Cancellation Available" : "Non-cancellable"}).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setStep("snacks");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="glass-button px-4 py-3 rounded-xl text-xs font-bold"
              >
                + Add Snacks
              </button>
              <button
                type="button"
                disabled={bookingLoading}
                onClick={() => {
                  setShowTermsModal(false);
                  handleConfirmBooking();
                }}
                className="flex-1 btn-crimson py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Accept &amp; Pay ₹{pricingSummary.finalTotal}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;
