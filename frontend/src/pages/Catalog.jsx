import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Film } from "lucide-react";
import MovieCard from "../components/MovieCard";
import CatalogFilterBar from "../components/CatalogFilterBar";
import LoadingSpinner from "../components/LoadingSpinner";
import { getCached, setCached } from "../utils/cache";

const GENRE_TITLES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  14: "Fantasy",
  10751: "Family",
  27: "Horror",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  36: "History",
  10752: "War",
};

const SECTION_TITLES = {
  all: "Discover your next watch",
  featured: "Featured Selections",
  "now-playing": "Now Playing in Theatres",
  trending: "Recently Updated & Trending",
  "top-rated": "Top Rated Cinema",
  upcoming: "Upcoming Releases",
  shows: "Popular TV & Web Series",
  bollywood: "Bollywood Movies",
  hollywood: "Hollywood Movies",
  "south-indian": "South Indian Cinema",
  anime: "Anime & Studio Ghibli",
  korean: "Korean Cinema & Dramas",
};

const OTT_TITLES = {
  netflix: "Streaming on Netflix",
  prime: "Streaming on Prime Video",
  hotstar: "Streaming on JioHotstar",
  apple: "Streaming on Apple TV+",
};

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const readFiltersFromUrl = useCallback(
    () => ({
      q: searchParams.get("q") || "",
      section: searchParams.get("section") || "all",
      type: searchParams.get("type") || "all",
      genre: searchParams.get("genre") || "all",
      language: searchParams.get("language") || "all",
      ott: searchParams.get("ott") || "",
      year: searchParams.get("year") || "all",
      sort: searchParams.get("sort") || "popular",
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState(readFiltersFromUrl);

  const fetchCatalog = useCallback(
    async (activeFilters, targetPage = 1, append = false) => {
      const cacheKey = `catalog:${JSON.stringify(activeFilters)}:${targetPage}`;
      if (append) {
        setLoadingMore(true);
      } else {
        const cached = getCached(cacheKey);
        if (cached) {
          setItems(cached.items || []);
          setHasMore(Boolean(cached.hasMore));
          setPage(targetPage);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const res = await axios.get("/api/movies/catalog", {
          params: { ...activeFilters, page: targetPage },
        });
        const fetched = Array.isArray(res.data?.items) ? res.data.items : [];
        const nextHasMore = Boolean(res.data?.hasMore);
        if (!append && targetPage === 1) {
          setCached(cacheKey, { items: fetched, hasMore: nextHasMore });
        }
        setItems((prev) => {
          if (!append) return fetched;
          const seen = new Set(prev.map((p) => String(p.id)));
          return [...prev, ...fetched.filter((f) => !seen.has(String(f.id)))];
        });
        setPage(targetPage);
        setHasMore(nextHasMore);
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
        if (!append && !getCached(cacheKey)) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    const next = readFiltersFromUrl();
    setFilters(next);
    fetchCatalog(next, 1, false);
  }, [readFiltersFromUrl, fetchCatalog]);

  const applyFilters = () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all") params[k] = v;
    });
    setSearchParams(params);
  };

  const resetFilters = () => {
    const cleared = {
      q: "",
      section: "all",
      type: "all",
      genre: "all",
      language: "all",
      ott: "",
      year: "all",
      sort: "popular",
    };
    setFilters(cleared);
    setSearchParams({});
  };

  const heading = filters.q
    ? `Results for "${filters.q}"`
    : OTT_TITLES[filters.ott] ||
      (filters.genre && filters.genre !== "all"
        ? GENRE_TITLES[filters.genre] || filters.genre
        : null) ||
      SECTION_TITLES[filters.section] ||
      "Discover your next watch";

  return (
    <div className="min-h-screen pb-24 lg:pb-20 pt-6 sm:pt-8">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
            THE CINEREWARD LIBRARY
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {heading}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            {items.length} matching titles. Explore by category, genre, language, year, or title.
          </p>
        </div>

        <CatalogFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        {loading ? (
          <LoadingSpinner fullPage message="Loading Cinema Catalog..." />
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
              {items.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  onClick={() => fetchCatalog(filters, page + 1, true)}
                  disabled={loadingMore}
                  className="glass-button px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {loadingMore ? "Loading more titles..." : "Load More Movies"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-3xl p-16 text-center">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">No matching titles found</h2>
            <p className="text-xs text-slate-400 mb-6">
              Try adjusting your search or filter selections.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="btn-crimson px-6 py-2.5 rounded-xl text-xs"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
