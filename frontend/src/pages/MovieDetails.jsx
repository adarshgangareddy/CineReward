import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import {
  Play,
  Plus,
  Check,
  Eye,
  Star,
  Ticket as TicketIcon,
  Award,
  MessageSquare,
  X,
  ArrowRight,
  Coins,
  Youtube,
  Tv,
} from "lucide-react";
import MovieCard from "../components/MovieCard";
import { resolveMoviePoster } from "../utils/media";
import LoadingSpinner from "../components/LoadingSpinner";
import { isInWatchlist, toggleWatchlist } from "../utils/watchlist";
import { getActiveSession } from "../utils/auth";
import { setActiveBackdrop } from "../utils/backdrop";
import { getCached, setCached } from "../utils/cache";

const formatRuntime = (mins) => {
  const n = Number(mins);
  if (!n || Number.isNaN(n)) return "2h 15m";
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const discussionRef = useRef(null);

  const passedMovie = location.state?.movie;
  const cachedDetail = getCached(`movie:${id}`);
  const initialMovie = cachedDetail || (passedMovie && String(passedMovie.id) === String(id) ? passedMovie : null);

  const [movie, setMovie] = useState(initialMovie);
  const [episodes, setEpisodes] = useState(initialMovie?.episodes || []);
  const [selectedSeason, setSelectedSeason] = useState(
    initialMovie?.seasons?.[0]?.season_number || 1
  );
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!initialMovie);
  const [saved, setSaved] = useState(() => isInWatchlist(id));
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [expandOverview, setExpandOverview] = useState(false);

  const session = getActiveSession();
  const [displayName, setDisplayName] = useState(session?.data?.name || "");
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(9);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    const cached = getCached(`movie:${id}`);
    const stateMovie =
      location.state?.movie && String(location.state.movie.id) === String(id)
        ? location.state.movie
        : null;
    const prefill = cached || stateMovie;

    if (prefill) {
      setMovie(prefill);
      setEpisodes(Array.isArray(prefill.episodes) ? prefill.episodes : []);
      setLoading(false);
      const bg =
        prefill.backdrop_path || resolveMoviePoster(prefill.poster_path, prefill.id);
      setActiveBackdrop(bg, "detail");
    } else {
      setMovie(null);
      setEpisodes([]);
      setLoading(true);
      // Clear any previous movie's backdrop immediately so the wrong film never shows while loading
      setActiveBackdrop(null, "detail");
    }

    setSaved(isInWatchlist(id));
    setExpandOverview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    let cancelled = false;

    axios
      .get(`/api/movies/${id}`)
      .then((movieRes) => {
        if (cancelled) return;
        const data = movieRes.data;
        setCached(`movie:${id}`, data);
        setMovie(data);
        setEpisodes(Array.isArray(data?.episodes) ? data.episodes : []);
        setSelectedSeason(data?.seasons?.[0]?.season_number || 1);
        const bg =
          data?.backdrop_path || resolveMoviePoster(data?.poster_path, data?.id);
        setActiveBackdrop(bg, "detail");
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Error fetching movie details:", err);
          if (!prefill) setMovie(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    axios
      .get(`/api/reviews/movie/${id}`)
      .then((res) => {
        if (!cancelled) setReviews(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id, location.state]);

  const handleSeasonChange = async (seasonNum) => {
    const num = Number(seasonNum);
    setSelectedSeason(num);
    setLoadingEpisodes(true);
    try {
      const res = await axios.get(`/api/movies/${id}/season/${num}`);
      setEpisodes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error switching season:", err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleToggleWatchlist = () => {
    if (!movie) return;
    toggleWatchlist(movie);
    setSaved(isInWatchlist(movie.id));
  };

  const handlePostDiscussion = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    setPostError("");

    try {
      const res = await axios.post("/api/reviews/discussion", {
        movieId: id,
        displayName: displayName.trim() || "Cinema Fan",
        comment: commentText.trim(),
        rating: commentRating,
      });
      if (res.data?.review) {
        setReviews((prev) => [res.data.review, ...prev]);
      }
      setCommentText("");
    } catch (err) {
      setPostError(err.response?.data?.message || "Could not post comment right now.");
    } finally {
      setPosting(false);
    }
  };

  if (loading && !movie) {
    return <LoadingSpinner fullPage message="Loading Cinema Details..." />;
  }
  if (!movie) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white px-5 text-center">
        <p className="text-lg font-bold mb-4">Title not found</p>
        <Link to="/" className="btn-crimson px-6 py-2.5 rounded-xl text-xs">
          Back Home
        </Link>
      </div>
    );
  }

  const backdropSrc =
    movie.backdrop_path || resolveMoviePoster(movie.poster_path, movie.id);
  const posterSrc = resolveMoviePoster(movie.poster_path, movie.id);
  const genreLine = (movie.genres || []).map((g) => g.name).join(" • ") || "Cinema";
  const formattedDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";
  const languageText =
    movie.spokenLanguages?.length > 0
      ? movie.spokenLanguages.slice(0, 2).join(", ")
      : movie.languageLabel || "Not specified";
  const isSeries = movie.mediaType === "tv";

  return (
    <div className="min-h-screen relative pb-24 sm:pb-20 -mt-20">
      <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 pt-28 sm:pt-32">
        {/* Hero Floating Over Crisp Full-Bleed Backdrop */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 lg:gap-10 pb-10 sm:pb-12">
          <div className="max-w-2xl w-full">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.06] mb-2.5 drop-shadow-[0_6px_24px_rgba(0,0,0,0.85)]">
              {movie.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 font-medium mb-5 sm:mb-6 drop-shadow">
              {genreLine}
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {movie.bookable !== false ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/book/${movie.id}`, { state: { movie } })
                  }
                  className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-full sm:rounded-xl transition-all flex items-center gap-2 shadow-2xl"
                >
                  <TicketIcon className="w-4 h-4" />
                  <span>Book Tickets</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    movie.trailerKey
                      ? setTrailerOpen(true)
                      : discussionRef.current?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-full sm:rounded-xl transition-all flex items-center gap-2 shadow-2xl"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{movie.trailerKey ? "Play Trailer" : "Explore Show"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleWatchlist}
                title={saved ? "Remove from Watchlist" : "Add to Watchlist"}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                  saved ? "bg-[#e50914] border-[#e50914] text-white" : "glass-button"
                }`}
              >
                {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() =>
                  discussionRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                title="Jump to Reviews & Discussion"
                className="w-11 h-11 rounded-full glass-button flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Pill Strip */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] font-bold">
              {movie.year && (
                <span className="bg-black/45 backdrop-blur-xl border border-white/[0.14] px-2.5 py-1 rounded-md text-slate-100">
                  {movie.year}
                </span>
              )}
              {!isSeries && (
                <span className="bg-black/45 backdrop-blur-xl border border-white/[0.14] px-2.5 py-1 rounded-md text-slate-100">
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              <span className="bg-sky-500/25 backdrop-blur-xl border border-sky-400/35 px-2.5 py-1 rounded-md text-sky-200">
                {movie.quality || "1080p"}
              </span>
              {movie.certification && (
                <span className="bg-black/45 backdrop-blur-xl border border-white/[0.14] px-2.5 py-1 rounded-md text-slate-100">
                  {movie.certification}
                </span>
              )}
              {movie.vote_average > 0 && (
                <span className="bg-amber-500/20 backdrop-blur-xl border border-amber-400/35 px-2.5 py-1 rounded-md text-amber-300 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(movie.vote_average).toFixed(1)} TMDB
                </span>
              )}
              {movie.imdbRating && (
                <span className="bg-yellow-500/20 backdrop-blur-xl border border-yellow-400/35 px-2.5 py-1 rounded-md text-yellow-300">
                  IMDb {movie.imdbRating}
                </span>
              )}
              {movie.bookable !== false && (
                <span className="bg-[#e50914]/25 backdrop-blur-xl border border-[#e50914]/45 px-2.5 py-1 rounded-md text-rose-100 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" /> +100 Coins
                </span>
              )}
            </div>

            {movie.director && (
              <p className="text-xs text-slate-200 mb-3 drop-shadow">
                <span className="text-slate-400">
                  {isSeries ? "Creator:" : "Director:"}
                </span>{" "}
                <span className="font-semibold text-white">{movie.director}</span>
              </p>
            )}

            <p
              className={`text-slate-100/90 text-sm leading-relaxed max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${
                expandOverview ? "" : "line-clamp-3 sm:line-clamp-none"
              }`}
            >
              {movie.overview}
            </p>
            {movie.overview && movie.overview.length > 140 && (
              <button
                type="button"
                onClick={() => setExpandOverview(!expandOverview)}
                className="sm:hidden text-xs font-bold text-[#ff2e3b] mt-1.5"
              >
                {expandOverview ? "Show less" : "Read more"}
              </button>
            )}
          </div>

          {/* Right Floating Frosted Glass Info Box (2-col on mobile, sleek stack on desktop) */}
          <div className="w-full lg:w-80 bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] rounded-2xl p-5 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.65)] shrink-0">
            <dl className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-3.5 text-xs">
              {isSeries ? (
                <>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Status</dt>
                    <dd className="text-white font-semibold lg:text-right">
                      {movie.status || "TV Series"}
                    </dd>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Language</dt>
                    <dd className="text-white font-semibold lg:text-right truncate">
                      {languageText}
                    </dd>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">First Aired</dt>
                    <dd className="text-white font-semibold lg:text-right">
                      {formattedDate}
                    </dd>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Seasons / Episodes</dt>
                    <dd className="text-white font-semibold lg:text-right">
                      {movie.seasonsCount || 1}S •{" "}
                      {movie.episodesCount || episodes.length}E
                    </dd>
                  </div>
                  {movie.network && (
                    <div className="col-span-2 lg:col-span-1 flex justify-end pt-2 border-t border-white/[0.1]">
                      <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-[#ff2e3b]" />
                        {movie.network}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Runtime</dt>
                    <dd className="text-white font-semibold lg:text-right">
                      {formatRuntime(movie.runtime)}
                    </dd>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Language</dt>
                    <dd className="text-white font-semibold lg:text-right truncate">
                      {languageText}
                    </dd>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Release Date</dt>
                    <dd className="text-white font-semibold lg:text-right">
                      {formattedDate}
                    </dd>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between gap-1 lg:gap-4">
                    <dt className="text-slate-300">Quality / Format</dt>
                    <dd className="text-white font-semibold lg:text-right">
                      {movie.quality || "IMAX 2D"}
                    </dd>
                  </div>
                  {movie.awards && (
                    <div className="col-span-2 lg:col-span-1 flex justify-between gap-4">
                      <dt className="text-slate-300">Awards</dt>
                      <dd className="text-amber-300 font-semibold text-right">
                        {movie.awards}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Floating Frosted Glass Episodes Grid for TV Series */}
        {isSeries && (episodes.length > 0 || (movie.seasons && movie.seasons.length > 0)) && (
          <section className="mb-10">
            <div className="glass-panel rounded-3xl p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <h2 className="text-xl font-bold text-white">Episodes</h2>
                {movie.seasons && movie.seasons.length > 0 && (
                  <select
                    value={selectedSeason}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    className="bg-white/[0.08] border border-white/[0.15] text-white text-xs font-semibold rounded-xl px-4 py-2 focus:outline-none focus:border-[#e50914]"
                  >
                    {movie.seasons.map((s) => (
                      <option
                        key={s.season_number}
                        value={s.season_number}
                        className="bg-[#121520]"
                      >
                        {s.name || `Season ${s.season_number}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-5">
                {episodes.length} episodes in this season
              </p>

              {loadingEpisodes ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading season episodes...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {episodes.map((ep) => (
                    <div
                      key={ep.id || ep.episode_number}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] rounded-2xl overflow-hidden transition-all group"
                    >
                      <div className="relative aspect-video bg-black/50 overflow-hidden">
                        <img
                          src={ep.still_path || backdropSrc}
                          alt={ep.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
                        <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          E{ep.episode_number}
                        </span>
                        <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-slate-200">
                          <Eye className="w-3 h-3" />
                        </span>
                        {ep.runtime && (
                          <span className="absolute bottom-2 right-2.5 bg-black/75 backdrop-blur-md text-slate-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            {ep.runtime}m
                          </span>
                        )}
                      </div>
                      <div className="p-3.5">
                        <h3 className="text-xs font-bold text-white line-clamp-1 mb-1">
                          {ep.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {ep.overview || "Episode details available in CineReward library."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Cast Strip */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="py-6">
            <h2 className="text-lg font-bold text-white mb-5 drop-shadow">Cast</h2>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
              {movie.cast.slice(0, 10).map((person) => (
                <div
                  key={person.id || person.name}
                  className="w-24 shrink-0 text-center group"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border border-white/20 bg-white/[0.06] mb-2.5 shadow-xl">
                    <img
                      src={
                        person.profile_path ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          person.name || "Cast"
                        )}&background=181822&color=fff`
                      }
                      alt={person.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="text-xs font-semibold text-white line-clamp-1">
                    {person.name}
                  </h3>
                  <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                    {person.character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trailer Frosted Glass Card */}
        <section className="py-6">
          <div
            onClick={() => movie.trailerKey && setTrailerOpen(true)}
            className={`bg-white/[0.08] backdrop-blur-2xl border border-white/[0.16] rounded-2xl p-3 max-w-2xl flex items-center gap-4 sm:gap-5 shadow-2xl transition-all ${
              movie.trailerKey
                ? "cursor-pointer hover:bg-white/[0.13] hover:border-white/30"
                : ""
            }`}
          >
            <div className="relative w-32 sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/50 shrink-0">
              <img
                src={backdropSrc || posterSrc}
                alt={`${movie.title} trailer`}
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#e50914] flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 mb-1">
                TRAILER
              </p>
              <h3 className="text-sm sm:text-lg font-bold text-white truncate">
                {movie.title}
              </h3>
              {movie.trailerKey ? (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="text-xs text-slate-200 hover:text-white mt-1.5 inline-flex items-center gap-1.5"
                >
                  <Youtube className="w-3.5 h-3.5 text-[#ff2e3b]" />
                  <span>Watch Trailer Now →</span>
                </button>
              ) : (
                <p className="text-xs text-slate-300 mt-1">
                  Explore show details &amp; community reviews
                </p>
              )}
            </div>
          </div>
        </section>

        {/* You Might Also Like */}
        {movie.similar && movie.similar.length > 0 && (
          <section className="py-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                You Might Also Like
              </h2>
              <Link
                to="/catalog?section=featured"
                className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5">
              {movie.similar.slice(0, 6).map((sim) => (
                <MovieCard key={sim.id} movie={sim} />
              ))}
            </div>
          </section>
        )}

        {/* Discussion & Reviews Frosted Glass Card */}
        <section ref={discussionRef} className="py-8 scroll-mt-24">
          <div className="max-w-2xl mx-auto bg-white/[0.07] backdrop-blur-3xl border border-white/[0.15] rounded-2xl p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.7)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Discussion</span>
                <span className="text-xs font-semibold text-slate-300">
                  ({reviews.length})
                </span>
              </h2>
              {movie.bookable !== false && (
                <Link
                  to={`/book/${movie.id}`}
                  state={{ movie }}
                  className="text-[11px] font-bold text-[#ff2e3b] hover:underline flex items-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" /> Book &amp; review to win 100 coins
                </Link>
              )}
            </div>
            <p className="text-xs text-slate-300 mb-6">
              Join the conversation. Verified ticket reviews are scored by AI for CineReward coins.
            </p>

            <form onSubmit={handlePostDiscussion} className="space-y-4 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    required
                    className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Rating
                  </label>
                  <select
                    value={commentRating}
                    onChange={(e) => setCommentRating(Number(e.target.value))}
                    className="w-full bg-[#131722] border border-white/[0.14] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e50914]"
                  >
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        ★ {n} / 10
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Your comment
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts about the story, cast, or direction..."
                  required
                  rows={3}
                  className="w-full bg-white/[0.07] border border-white/[0.14] rounded-xl p-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#e50914]"
                />
              </div>

              {postError && <p className="text-xs text-red-400">{postError}</p>}

              <button
                type="submit"
                disabled={posting}
                className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post comment"}
              </button>
            </form>

            {reviews.length > 0 ? (
              <div className="space-y-4 pt-4 border-t border-white/[0.1]">
                {reviews.map((rev) => {
                  const name = rev.userId?.name || rev.authorName || "Cinema Fan";
                  return (
                    <div
                      key={rev._id}
                      className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#e50914]/30 border border-[#e50914]/50 flex items-center justify-center text-xs font-bold text-white">
                            {name[0]?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">{name}</span>
                            {rev.isVerifiedTicket && (
                              <span className="ml-2 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 px-2 py-0.5 rounded-full">
                                Verified Ticket
                              </span>
                            )}
                            {rev.isWinner && (
                              <span className="ml-1.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Award className="w-3 h-3" /> Winner +100 Coins
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {rev.rating}/10
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-300 text-xs flex items-center justify-center gap-2 border-t border-white/[0.1]">
                <MessageSquare className="w-4 h-4" />
                <span>No comments yet. Start the conversation!</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Inline YouTube Trailer Modal */}
      {trailerOpen && movie.trailerKey && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <div
            className="w-full max-w-4xl glass-panel rounded-3xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
              <span className="text-sm font-bold text-white">
                {movie.title} — Official Trailer
              </span>
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
