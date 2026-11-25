import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, Plus, Check, Play } from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "../utils/watchlist";
import { resolveMoviePoster } from "../utils/media";

const MovieCard = ({ movie, compact = false }) => {
  const [saved, setSaved] = useState(() => isInWatchlist(movie.id));

  useEffect(() => {
    const sync = () => setSaved(isInWatchlist(movie.id));
    window.addEventListener("watchlistUpdated", sync);
    return () => window.removeEventListener("watchlistUpdated", sync);
  }, [movie.id]);

  const handleWatchlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(movie);
    setSaved(isInWatchlist(movie.id));
  };

  const posterSrc = resolveMoviePoster(movie.poster_path, movie.id);
  const year =
    movie.year ||
    (movie.release_date ? String(movie.release_date).slice(0, 4) : "—");
  const typeLabel = movie.mediaType === "tv" ? "Series" : "Movie";
  const rating =
    typeof movie.vote_average === "number" && movie.vote_average > 0
      ? movie.vote_average.toFixed(1)
      : null;

  return (
    <div className="group flex flex-col">
      <Link
        to={`/movie/${movie.id}`}
        state={{ movie }}
        className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#14141d] border border-white/[0.08] group-hover:border-white/25 transition-all duration-300 shadow-lg"
      >
        <img
          src={posterSrc}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Subtle dark bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top-left floating glass rating pill */}
        {rating && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-bold text-white shadow">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>{rating}</span>
          </div>
        )}

        {/* Hover center quick action */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white shadow-2xl">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>
      </Link>

      {!compact && (
        <div className="mt-2.5 px-0.5">
          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/movie/${movie.id}`}
              state={{ movie }}
              className="text-[13px] font-semibold text-white/95 hover:text-[#ff2e3b] transition-colors line-clamp-1"
              title={movie.title}
            >
              {movie.title}
            </Link>
            <button
              type="button"
              onClick={handleWatchlist}
              title={saved ? "Remove from Watchlist" : "Add to Watchlist"}
              aria-label={saved ? "Remove from Watchlist" : "Add to Watchlist"}
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                saved
                  ? "bg-[#e50914] text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {year} • {typeLabel}
          </p>
        </div>
      )}
    </div>
  );
};

export default MovieCard;
