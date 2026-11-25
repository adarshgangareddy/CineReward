import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import MovieCard from "../components/MovieCard";
import { resolveMoviePoster } from "../utils/media";
import LoadingSpinner from "../components/LoadingSpinner";
import { isInWatchlist, toggleWatchlist } from "../utils/watchlist";
import { getActiveSession } from "../utils/auth";

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
  const discussionRef = useRef(null);

  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const session = getActiveSession();
  const [displayName, setDisplayName] = useState(session?.data?.name || "");
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(9);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [movieRes, reviewsRes] = await Promise.all([
          axios.get(`/api/movies/${id}`),
          axios.get(`/api/reviews/movie/${id}`).catch(() => ({ data: [] })),
        ]);
        setMovie(movieRes.data);
        setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
        setSaved(isInWatchlist(id));
      } catch (err) {
        console.error("Error fetching movie details:", err);
        setMovie(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

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

  if (loading) return <LoadingSpinner fullPage message="Loading Movie Details..." />;
  if (!movie) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-white">
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
      : movie.languageLabel || (movie.original_language || "en").toUpperCase();

  return (
    <div className="min-h-screen bg-[#09090d] relative pb-20 -mt-20">
      {/* Full-page atmospheric backdrop matching Screenshots 6, 7, 8 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src={backdropSrc}
          alt=""
          className="w-full h-full object-cover opacity-25 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090d]/70 via-[#09090d]/85 to-[#09090d]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090d] via-[#09090d]/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-32">
        {/* Hero Split Section (Screenshot 6) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 pb-14">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.06] mb-3">
              {movie.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium mb-6">
              {genreLine}
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {movie.bookable !== false ? (
                <button
                  type="button"
                  onClick={() => navigate(`/book/${movie.id}`)}
                  className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-2xl"
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
                  className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-2xl"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Watch Trailer</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleWatchlist}
                title={saved ? "Remove from Watchlist" : "Add to Watchlist"}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                  saved
                    ? "bg-[#e50914] border-[#e50914] text-white"
                    : "glass-button"
                }`}
              >
                {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() =>
                  discussionRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                title="View Reviews & Discussion"
                className="w-11 h-11 rounded-full glass-button flex items-center justify-center"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Pill Strip (Screenshot 6) */}
            <div className="flex flex-wrap items-center gap-2 mb-5 text-[11px] font-bold">
              {movie.year && (
                <span className="bg-white/[0.08] border border-white/[0.12] px-2.5 py-1 rounded-md text-slate-200">
                  {movie.year}
                </span>
              )}
              <span className="bg-white/[0.08] border border-white/[0.12] px-2.5 py-1 rounded-md text-slate-200">
                {formatRuntime(movie.runtime)}
              </span>
              <span className="bg-sky-500/20 border border-sky-400/30 px-2.5 py-1 rounded-md text-sky-200">
                {movie.quality || "IMAX"}
              </span>
              {movie.certification && (
                <span className="bg-white/[0.08] border border-white/[0.12] px-2.5 py-1 rounded-md text-slate-200">
                  {movie.certification}
                </span>
              )}
              {movie.vote_average > 0 && (
                <span className="bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 rounded-md text-amber-300 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(movie.vote_average).toFixed(1)} TMDB
                </span>
              )}
              {movie.imdbRating && (
                <span className="bg-yellow-500/15 border border-yellow-400/30 px-2.5 py-1 rounded-md text-yellow-300">
                  IMDb {movie.imdbRating}
                </span>
              )}
              <span className="bg-[#e50914]/15 border border-[#e50914]/35 px-2.5 py-1 rounded-md text-rose-200 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                Review Reward: +100 Coins
              </span>
            </div>

            {movie.director && (
              <p className="text-xs text-slate-300 mb-3">
                <span className="text-slate-400">Director:</span>{" "}
                <span className="font-semibold text-white">{movie.director}</span>
              </p>
            )}

            <p className="text-slate-200/90 text-sm leading-relaxed max-w-xl">
              {movie.overview}
            </p>
          </div>

          {/* Right Floating Frosted Glass Info Box (Screenshot 6) */}
          <div className="w-full lg:w-80 bg-white/[0.06] backdrop-blur-2xl border border-white/[0.14] rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)] shrink-0">
            <dl className="space-y-3.5 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Runtime</dt>
                <dd className="text-white font-semibold text-right">
                  {formatRuntime(movie.runtime)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Language</dt>
                <dd className="text-white font-semibold text-right truncate max-w-[170px]">
                  {languageText}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Release Date</dt>
                <dd className="text-white font-semibold text-right">{formattedDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Quality / Format</dt>
                <dd className="text-white font-semibold text-right">
                  {movie.quality || "IMAX 2D"}
                </dd>
              </div>
              {movie.awards && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Awards</dt>
                  <dd className="text-amber-300 font-semibold text-right max-w-[175px]">
                    {movie.awards}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-2 border-t border-white/[0.08]">
                <dt className="text-slate-400">Verified Reviews</dt>
                <dd className="text-white font-semibold text-right">
                  {reviews.length} posted
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Cast Section (Screenshot 6) */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="py-8">
            <h2 className="text-lg font-bold text-white mb-5">Cast</h2>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
              {movie.cast.slice(0, 10).map((person) => (
                <div
                  key={person.id || person.name}
                  className="w-24 shrink-0 text-center group"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border border-white/15 bg-white/[0.05] mb-2.5">
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
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {person.character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trailer Frosted Glass Card (Screenshot 7) */}
        <section className="py-6">
          <div
            onClick={() => movie.trailerKey && setTrailerOpen(true)}
            className={`bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-3 max-w-2xl flex items-center gap-5 transition-all ${
              movie.trailerKey
                ? "cursor-pointer hover:bg-white/[0.1] hover:border-white/25"
                : ""
            }`}
          >
            <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-black/50 shrink-0">
              <img
                src={backdropSrc || posterSrc}
                alt={`${movie.title} trailer`}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-10 h-10 rounded-full bg-[#e50914] flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                TRAILER
              </p>
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {movie.title}
              </h3>
              {movie.trailerKey ? (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="text-xs text-slate-300 hover:text-white mt-1.5 inline-flex items-center gap-1.5"
                >
                  <Youtube className="w-3.5 h-3.5 text-[#ff2e3b]" />
                  <span>Watch Trailer Now →</span>
                </button>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Book seats to experience in theatres
                </p>
              )}
            </div>
          </div>
        </section>

        {/* You Might Also Like (Screenshot 7) */}
        {movie.similar && movie.similar.length > 0 && (
          <section className="py-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                You Might Also Like
              </h2>
              <Link
                to="/catalog?section=featured"
                className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
              {movie.similar.slice(0, 6).map((sim) => (
                <MovieCard key={sim.id} movie={sim} />
              ))}
            </div>
          </section>
        )}

        {/* Discussion & Reviews Frosted Glass Card (Screenshots 7 & 8) */}
        <section ref={discussionRef} className="py-10 scroll-mt-24">
          <div className="max-w-2xl mx-auto bg-white/[0.05] backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Discussion</span>
                <span className="text-xs font-semibold text-slate-400">
                  ({reviews.length})
                </span>
              </h2>
              {movie.bookable !== false && (
                <Link
                  to={`/book/${movie.id}`}
                  className="text-[11px] font-bold text-[#ff2e3b] hover:underline flex items-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" /> Book &amp; review to win 100 coins
                </Link>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Join the conversation. Verified ticket reviews are scored by AI for CineReward coins.
            </p>

            {/* Comment Form */}
            <form onSubmit={handlePostDiscussion} className="space-y-4 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    required
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Rating
                  </label>
                  <select
                    value={commentRating}
                    onChange={(e) => setCommentRating(Number(e.target.value))}
                    className="w-full bg-[#13131c] border border-white/[0.12] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e50914]"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your comment
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts about the story, cast, or direction..."
                  required
                  rows={3}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
                />
              </div>

              {postError && (
                <p className="text-xs text-red-400">{postError}</p>
              )}

              <button
                type="submit"
                disabled={posting}
                className="bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post comment"}
              </button>
            </form>

            {/* Reviews / Comments List */}
            {reviews.length > 0 ? (
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                {reviews.map((rev) => {
                  const name = rev.userId?.name || rev.authorName || "Cinema Fan";
                  return (
                    <div
                      key={rev._id}
                      className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#e50914]/25 border border-[#e50914]/40 flex items-center justify-center text-xs font-bold text-white">
                            {name[0]?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">{name}</span>
                            {rev.isVerifiedTicket && (
                              <span className="ml-2 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                Verified Ticket
                              </span>
                            )}
                            {rev.isWinner && (
                              <span className="ml-1.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
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
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2 border-t border-white/[0.06]">
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
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
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
