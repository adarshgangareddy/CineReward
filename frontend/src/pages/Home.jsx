import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Play,
  Info,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  Star,
  Coins,
  Film,
  Sparkles,
  Ticket,
  Tv,
  Globe,
  ShieldCheck,
  Layers,
  Zap,
  Calendar,
  Award,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieCard from "../components/MovieCard";
import { resolveMoviePoster } from "../utils/media";
import { isInWatchlist, toggleWatchlist } from "../utils/watchlist";
import { setActiveBackdrop } from "../utils/backdrop";
import { getCached, setCached } from "../utils/cache";

const BROWSE_CATEGORIES = [
  {
    title: "Bollywood Movies",
    desc: "Latest Hindi cinema — action, drama, comedy & blockbusters.",
    to: "/catalog?section=bollywood",
    icon: Film,
  },
  {
    title: "Hollywood Movies",
    desc: "Global hits in English, IMAX formats & franchise epics.",
    to: "/catalog?section=hollywood",
    icon: Sparkles,
  },
  {
    title: "South Indian",
    desc: "Tamil, Telugu, Malayalam & Kannada pan-India releases.",
    to: "/catalog?section=south-indian",
    icon: Zap,
  },
  {
    title: "Web Series & Shows",
    desc: "Top rated series powered by TMDB & TVMaze live APIs.",
    to: "/catalog?section=shows",
    icon: Tv,
  },
  {
    title: "Anime & Studio Ghibli",
    desc: "Spirited Away, anime adventures & animated masterpieces.",
    to: "/catalog?section=anime",
    icon: Star,
  },
  {
    title: "Korean Cinema",
    desc: "K-dramas, acclaimed Korean thrillers & festival winners.",
    to: "/catalog?section=korean",
    icon: Globe,
  },
];

const FEATURE_LIST = [
  {
    title: "Bollywood & Hollywood",
    desc: "Latest theatrical releases — from blockbusters to indie gems.",
    icon: Film,
  },
  {
    title: "Instant Seat Booking",
    desc: "Interactive cinema seat maps with Razorpay & coin checkout.",
    icon: Ticket,
  },
  {
    title: "Curated Collections",
    desc: "Marvel, DC, Studio Ghibli, Fast & Furious & Indian epics.",
    icon: Layers,
  },
  {
    title: "AI Review Rewards",
    desc: "Write genuine reviews and win 100+ coins per selection.",
    icon: Award,
  },
  {
    title: "Live Events & Partners",
    desc: "Host shows, film festivals & track partner inquiries live.",
    icon: Calendar,
  },
];

const WHY_CHOOSE = [
  {
    title: "Multi-API Discovery",
    desc: "Real-time cinema catalogs powered by TMDB, TVMaze, Studio Ghibli & OMDb.",
    icon: Globe,
  },
  {
    title: "Seamless Seat Booking",
    desc: "Pick seats, showtimes & pay via Razorpay or earned CineReward coins.",
    icon: Ticket,
  },
  {
    title: "AI-Scored Rewards",
    desc: "Verified ticket holders earn coins for thoughtful movie reviews.",
    icon: Sparkles,
  },
  {
    title: "Daily Live Updates",
    desc: "Now playing, trending charts & top series updated automatically.",
    icon: ShieldCheck,
  },
];

const CarouselSection = ({ eyebrow = "YOUR NEXT DISCOVERY", title, viewAllTo, items = [] }) => {
  const scrollRef = useRef(null);

  if (!items || items.length === 0) return null;

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = Math.max(480, scrollRef.current.clientWidth * 0.75);
    scrollRef.current.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-7">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 mb-1">
            {eyebrow}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to={viewAllTo}
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 mr-1 transition-colors"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} left`}
            className="w-8 h-8 rounded-full glass-button flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} right`}
            className="w-8 h-8 rounded-full glass-button flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
      >
        {items.map((movie) => (
          <div
            key={movie.id}
            className="w-[155px] sm:w-[175px] md:w-[190px] lg:w-[205px] shrink-0"
          >
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
};

const LeaderboardCard = ({ eyebrow, title, viewAllTo, items = [] }) => {
  const [, setTick] = useState(0);

  const handleToggle = (item) => {
    toggleWatchlist(item);
    setTick((t) => t + 1);
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
            {eyebrow}
          </p>
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
        </div>
        <Link
          to={viewAllTo}
          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 mt-1"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {items.slice(0, 6).map((item, idx) => {
          const saved = isInWatchlist(item.id);
          return (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3 group"
            >
              <Link
                to={`/movie/${item.id}`}
                state={{ movie: item }}
                className="flex items-center gap-3.5 min-w-0 flex-grow"
              >
                <span className="w-7 text-lg font-extrabold text-slate-600 group-hover:text-slate-400 tabular-nums shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <img
                  src={resolveMoviePoster(item.poster_path, item.id)}
                  alt={item.title}
                  className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#ff2e3b] transition-colors truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{item.year || item.release_date?.slice(0, 4) || "2026"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {Number(item.vote_average || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleToggle(item)}
                title={saved ? "In Watchlist" : "Add to Watchlist"}
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  saved
                    ? "bg-[#e50914] text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Home = () => {
  const cachedHome = getCached("home_feed");
  const [feed, setFeed] = useState(cachedHome);
  const [loading, setLoading] = useState(!cachedHome);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [, setWatchTick] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadHome = async () => {
      try {
        if (!getCached("home_feed")) setLoading(true);
        const res = await axios.get("/api/movies/home");
        if (res.data) {
          setFeed(res.data);
          setCached("home_feed", res.data);
        }
      } catch (err) {
        console.error("Failed to fetch home feed:", err);
      } finally {
        setLoading(false);
      }
    };
    loadHome();
  }, []);

  const slides = feed?.heroSlides || [];
  const activeSlide = slides[slideIndex] || feed?.featured?.[0];
  const heroWatchlisted = activeSlide ? isInWatchlist(activeSlide.id) : false;

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  useEffect(() => {
    if (activeSlide?.backdrop_path) {
      setActiveBackdrop(activeSlide.backdrop_path, "hero");
    }
  }, [activeSlide?.backdrop_path]);

  if (loading) {
    return <LoadingSpinner fullPage message="Curating CineReward Cinema..." />;
  }

  const collectionPosterFan = (feed?.collections || [])
    .flatMap((c) => c.previewPosters || [])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="min-h-screen pb-24 lg:pb-20">
      {/* 1. Full-Bleed Cinematic Hero Spotlight Carousel (Screenshot 3) */}
      {activeSlide && (
        <section
          className="relative w-full min-h-[78vh] flex items-end overflow-hidden -mt-20 pt-24"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <img
            src={
              activeSlide.backdrop_path ||
              resolveMoviePoster(activeSlide.poster_path, activeSlide.id)
            }
            alt={activeSlide.title}
            className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/95 via-[#07080d]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080d]/95 via-[#07080d]/20 to-[#07080d]/45" />

          <div className="relative z-10 max-w-[1400px] mx-auto w-full px-5 sm:px-6 lg:px-8 pb-10 sm:pb-12 pt-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-5 h-0.5 bg-[#e50914] inline-block" />
                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">
                  Latest Updates &amp; In Theatres
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] mb-3.5">
                {activeSlide.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300 mb-4">
                {activeSlide.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {Number(activeSlide.vote_average).toFixed(1)}
                  </span>
                )}
                <span>{activeSlide.year || "2026"}</span>
                <span>•</span>
                <span>{activeSlide.mediaType === "tv" ? "Series" : "Movie"}</span>
                <span className="bg-white/[0.08] border border-white/[0.12] px-2 py-0.5 rounded-md text-[10px] font-bold text-white">
                  {activeSlide.quality || "IMAX"}
                </span>
                <span className="bg-[#e50914]/20 border border-[#e50914]/40 px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-200 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" /> +100 Coins Eligible
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-2 max-w-xl mb-7">
                {activeSlide.overview}
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-9">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      activeSlide.bookable !== false
                        ? `/book/${activeSlide.id}`
                        : `/movie/${activeSlide.id}`,
                      { state: { movie: activeSlide } }
                    )
                  }
                  className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs sm:text-sm px-5 sm:px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-xl"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>
                    {activeSlide.bookable !== false ? "Book Tickets" : "Explore Show"}
                  </span>
                </button>

                <Link
                  to={`/movie/${activeSlide.id}`}
                  state={{ movie: activeSlide }}
                  className="glass-button font-semibold text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  <span>More info</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    toggleWatchlist(activeSlide);
                    setWatchTick((t) => t + 1);
                  }}
                  aria-label="Toggle Watchlist"
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                    heroWatchlisted
                      ? "bg-[#e50914] border-[#e50914] text-white"
                      : "glass-button"
                  }`}
                >
                  {heroWatchlisted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Carousel Pagination Bar (01 / 10) */}
              {slides.length > 1 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-white tabular-nums">
                    {String(slideIndex + 1).padStart(2, "0")}
                    <span className="text-slate-500 text-xs font-medium">
                      {" "}
                      / {String(slides.length).padStart(2, "0")}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {slides.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSlideIndex(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          idx === slideIndex
                            ? "w-7 bg-white"
                            : "w-3 bg-white/25 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex(
                          (prev) => (prev - 1 + slides.length) % slides.length
                        )
                      }
                      aria-label="Previous featured movie"
                      className="w-8 h-8 rounded-full glass-button flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex((prev) => (prev + 1) % slides.length)
                      }
                      aria-label="Next featured movie"
                      className="w-8 h-8 rounded-full glass-button flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. Rewards Promo Banner (Matching Screenshot 3 Telegram Glass Banner) */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 mt-4 mb-4">
        <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-r from-[#0e3455]/90 via-[#0b4b7a]/80 to-[#0e223d]/90 backdrop-blur-xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-400/20 border border-sky-300/30 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Earn 100+ Reward Coins on Every Movie Review
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/80">
                Book theatre tickets, submit genuine AI-scored reviews, and redeem free tickets.
              </p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg transition-all"
          >
            <span>Open Rewards Wallet</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. Horizontal Carousels (Screenshot 4) */}
      <CarouselSection
        eyebrow="YOUR NEXT DISCOVERY"
        title="Featured selections"
        viewAllTo="/catalog?section=featured"
        items={feed?.featured}
      />

      <CarouselSection
        eyebrow="BOOK NOW IN THEATRES"
        title="Now Playing movies"
        viewAllTo="/catalog?section=now-playing"
        items={feed?.nowPlaying}
      />

      <CarouselSection
        eyebrow="TRENDING THIS WEEK"
        title="Recently updated movies"
        viewAllTo="/catalog?section=trending"
        items={feed?.trending}
      />

      <CarouselSection
        eyebrow="TMDB & TVMAZE DIRECTORY"
        title="Popular TV & Web Series"
        viewAllTo="/catalog?section=shows"
        items={feed?.popularShows}
      />

      {/* 4. Discover Collections Banner (Screenshot 9) */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
        <div className="glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-lg relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-3">
              More Than A Movie Night
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
              A different world.
              <br />
              Every time you watch.
            </h2>
            <p className="text-sm text-slate-400 mb-7 leading-relaxed">
              Anime adventures, timeless franchises, and cinematic universes grouped
              ready for your next marathon or theatre outing.
            </p>
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-xl transition-all"
            >
              <span>Discover collections</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3 Tilted Collection Posters Fan */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 relative z-10">
            {collectionPosterFan.map((poster, i) => (
              <Link
                key={i}
                to="/collections"
                className={`w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl transition-transform duration-500 hover:scale-105 ${
                  i === 0
                    ? "-rotate-6 translate-y-2"
                    : i === 1
                      ? "z-10 -translate-y-2"
                      : "rotate-6 translate-y-2"
                }`}
              >
                <img
                  src={resolveMoviePoster(poster, `col-${i}`)}
                  alt="Collection highlight"
                  className="w-full h-full object-cover"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Top Movies & Top Shows Split Leaderboards (Screenshot 9) */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeaderboardCard
            eyebrow="TOP RATED • VOTED BY FANS"
            title="Top Movies"
            viewAllTo="/catalog?section=top-rated"
            items={feed?.topMovies || []}
          />
          <LeaderboardCard
            eyebrow="TOP RATED • SERIES & TVMAZE"
            title="Top Shows"
            viewAllTo="/catalog?section=shows"
            items={feed?.topShows || []}
          />
        </div>
      </section>

      {/* 6. Landing Spotlight Split + Browse by Category + Why Choose (Screenshots 1 & 2) */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#e50914]/10 border border-[#e50914]/30 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-rose-300">
              <span className="w-2 h-2 rounded-full bg-[#ff2e3b] animate-pulse" />
              LIVE • Movies, Bookings &amp; AI Rewards Daily
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.08]">
              The Best Cinema Hub
              <br />
              for <span className="text-[#ff2e3b]">Movie Lovers</span>
            </h2>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              Discover Bollywood, Hollywood, South Indian &amp; Anime releases powered by
              public cinema APIs — book theatre seats, post AI-scored reviews, and unlock
              free ticket rewards.
            </p>

            <div className="flex flex-wrap gap-3.5 pt-1">
              <Link
                to="/catalog?section=featured"
                className="btn-crimson px-6 py-3.5 rounded-full text-xs sm:text-sm inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Explore All Movies →</span>
              </Link>
              <Link
                to="/collections"
                className="bg-gradient-to-r from-[#e50914] to-rose-600 hover:brightness-110 text-white font-bold px-6 py-3.5 rounded-full text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Discover Collections →</span>
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 max-w-md border-t border-white/[0.08]">
              {[
                ["IMAX / 4K", "Formats"],
                ["AI-Scored", "Reviews"],
                ["100 Coins", "Per Win"],
                ["Daily", "New Titles"],
              ].map(([val, lbl]) => (
                <div key={lbl}>
                  <p className="text-base sm:text-lg font-extrabold text-white">{val}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    {lbl}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            {FEATURE_LIST.map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="glass-card-hover rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e50914]/15 border border-[#e50914]/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#ff2e3b]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category (Screenshot 2) */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Browse by Category
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Find exactly what you want to watch or book tonight
          </p>
          <div className="w-10 h-1 bg-[#e50914] mx-auto mt-3 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BROWSE_CATEGORIES.map(({ title, desc, to, icon: Icon }) => (
            <Link
              key={title}
              to={to}
              className="glass-card-hover rounded-2xl p-6 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#e50914]/15 border border-[#e50914]/25 flex items-center justify-center mb-4 group-hover:bg-[#e50914] transition-colors">
                <Icon className="w-5 h-5 text-[#ff2e3b] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Choose CineReward? (Screenshot 2) */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Why Choose <span className="text-[#ff2e3b]">CineReward?</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Everything a cinema lover needs in one place
          </p>
          <div className="w-10 h-1 bg-[#e50914] mx-auto mt-3 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WHY_CHOOSE.map(({ title, desc, icon: Icon }) => (
            <div key={title} className="glass-card rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[#e50914]/15 border border-[#e50914]/25 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[#ff2e3b]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
