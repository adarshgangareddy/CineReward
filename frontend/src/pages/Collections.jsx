import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { resolveMoviePoster } from "../utils/media";

const CATEGORY_TABS = [
  "All",
  "Superheroes",
  "Action Franchises",
  "Sci-Fi & Fantasy",
  "Indian Universes",
  "Anime & Animation",
];

const Collections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await axios.get("/api/movies/collections");
        setCollections(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching collections:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage message="Curating Cinematic Universes..." />;
  }

  const visibleCollections =
    activeCategory === "All"
      ? collections
      : collections.filter((c) => c.category === activeCategory);

  return (
    <div className="min-h-screen pb-20 pt-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
            STORIES THAT BELONG TOGETHER
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore collections
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Follow a favorite franchise, discover a cinematic universe, or find your next marathon.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-[#e50914] text-white shadow-lg shadow-red-600/25"
                  : "glass-button text-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Triptych Collection Grid matching Screenshot 10 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCollections.map((col) => {
            const posters = col.previewPosters || [];
            return (
              <Link
                key={col.slug}
                to={`/collection/${col.slug}`}
                className="group relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-white/[0.1] hover:border-white/30 bg-[#12121a] shadow-2xl transition-all duration-300"
              >
                {/* 3-Panel Triptych Posters */}
                <div className="absolute inset-0 grid grid-cols-3 gap-0.5 bg-black">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="relative h-full overflow-hidden">
                      <img
                        src={resolveMoviePoster(
                          posters[idx] || posters[0],
                          `${col.slug}-${idx}`
                        )}
                        alt={col.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />

                {/* Top Badge */}
                {col.badge && (
                  <span className="absolute top-3.5 right-3.5 bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-slate-200 px-2.5 py-1 rounded-full">
                    {col.badge}
                  </span>
                )}

                {/* Bottom Content */}
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300 mb-1">
                    COLLECTION
                  </p>
                  <h2 className="text-xl font-extrabold text-white tracking-tight group-hover:text-[#ff2e3b] transition-colors">
                    {col.title}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 font-medium">
                    <span>{col.totalCount || 0} titles</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Collections;
