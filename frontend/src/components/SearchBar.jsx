import { useState, useEffect } from "react";
import axios from "axios";
import { Search, X, Star, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { resolveMoviePoster } from "../utils/media";

const SearchBar = ({ modalMode = false, onNavigate }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchMovies = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/movies/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(Array.isArray(res.data) ? res.data.slice(0, 6) : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchMovies, 280);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    if (onNavigate) onNavigate();
    navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className={`relative ${modalMode ? "w-full" : "w-full"}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          autoFocus={modalMode}
          className="w-full bg-white/[0.05] border border-white/[0.12] rounded-2xl py-3 pl-11 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914] transition-all"
          placeholder="Search movies, series, anime, or collections..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {(isOpen || modalMode) && query.trim().length >= 2 && (
        <div
          className={`${
            modalMode
              ? "mt-4 max-h-[380px] overflow-y-auto"
              : "absolute top-full left-0 w-full mt-2 max-h-[360px] overflow-y-auto z-[100]"
          } bg-[#101018]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden`}
        >
          {loading ? (
            <div className="p-5 text-center text-xs text-slate-400">
              Searching TMDB, TVMaze & Studio Ghibli...
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/movie/${movie.id}`}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                    if (onNavigate) onNavigate();
                  }}
                  className="flex items-center gap-3.5 p-3 hover:bg-white/[0.07] transition-colors border-b border-white/[0.06] last:border-0"
                >
                  <img
                    src={resolveMoviePoster(movie.poster_path, movie.id)}
                    alt={movie.title}
                    className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {movie.title}
                    </h4>
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-400 font-medium">
                      {movie.vote_average > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {Number(movie.vote_average).toFixed(1)}
                        </span>
                      )}
                      <span>{movie.year || movie.release_date?.slice(0, 4) || "—"}</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                        {movie.mediaType === "tv" ? "Series" : "Movie"}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                </Link>
              ))}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-center text-xs font-semibold text-[#ff2e3b] border-t border-white/[0.06]"
              >
                View all results for &quot;{query.trim()}&quot; →
              </button>
            </>
          ) : (
            <div className="p-5 text-center text-xs text-slate-400">
              No titles found for &quot;{query.trim()}&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
