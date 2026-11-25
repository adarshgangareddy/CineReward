import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Trash2, Sparkles } from "lucide-react";
import MovieCard from "../components/MovieCard";
import { getWatchlist, toggleWatchlist } from "../utils/watchlist";

const Watchlist = () => {
  const [items, setItems] = useState(() => getWatchlist());

  useEffect(() => {
    const sync = () => setItems(getWatchlist());
    window.addEventListener("watchlistUpdated", sync);
    return () => window.removeEventListener("watchlistUpdated", sync);
  }, []);

  const clearAll = () => {
    items.forEach((item) => toggleWatchlist(item));
    setItems([]);
  };

  return (
    <div className="min-h-screen pb-20 pt-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
              SAVED FOR LATER
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              My Watchlist
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
              {items.length} saved movies and series ready whenever you are.
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="glass-button px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 self-start sm:self-auto hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Watchlist</span>
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {items.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-16 text-center">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">
              Your watchlist is empty
            </h2>
            <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto">
              Tap the + icon on any movie or series card to save it here for your next cinema night.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/catalog" className="btn-crimson px-6 py-2.5 rounded-xl text-xs">
                Browse Catalog
              </Link>
              <Link
                to="/collections"
                className="glass-button px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Collections
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
