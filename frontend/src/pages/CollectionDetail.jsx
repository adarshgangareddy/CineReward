import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Layers } from "lucide-react";
import MovieCard from "../components/MovieCard";
import CatalogFilterBar from "../components/CatalogFilterBar";
import LoadingSpinner from "../components/LoadingSpinner";

const CollectionDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [allCollections, setAllCollections] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    q: "",
    type: "all",
    collectionSlug: slug,
    language: "all",
    year: "all",
    sort: "popular",
  });

  const fetchCollection = useCallback(async (targetSlug, activeFilters) => {
    setLoading(true);
    try {
      const [colRes, listRes] = await Promise.all([
        axios.get(`/api/movies/collections/${targetSlug}`, {
          params: activeFilters,
        }),
        axios.get("/api/movies/collections"),
      ]);
      setCollection(colRes.data.collection);
      setItems(Array.isArray(colRes.data.items) ? colRes.data.items : []);
      setAllCollections(Array.isArray(listRes.data) ? listRes.data : []);
    } catch (err) {
      console.error("Failed to fetch collection:", err);
      setCollection(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = {
      q: "",
      type: "all",
      collectionSlug: slug,
      language: "all",
      year: "all",
      sort: "popular",
    };
    setFilters(initial);
    fetchCollection(slug, initial);
  }, [slug, fetchCollection]);

  const handleFilterChange = (nextFilters, changedCollection) => {
    setFilters(nextFilters);
    if (changedCollection && nextFilters.collectionSlug !== slug) {
      navigate(`/collection/${nextFilters.collectionSlug}`);
    }
  };

  const applyFilters = () => {
    fetchCollection(slug, filters);
  };

  const resetFilters = () => {
    const reset = {
      q: "",
      type: "all",
      collectionSlug: slug,
      language: "all",
      year: "all",
      sort: "popular",
    };
    setFilters(reset);
    fetchCollection(slug, reset);
  };

  if (loading && !collection) {
    return <LoadingSpinner fullPage message="Loading Collection..." />;
  }

  if (!collection) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <Layers className="w-12 h-12 text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Collection not found</h1>
        <Link to="/collections" className="btn-crimson px-6 py-2.5 rounded-xl text-xs mt-3">
          Browse All Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090d] pb-20 pt-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/collections"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Collections</span>
        </Link>

        <div className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
            THE CINEREWARD LIBRARY
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {collection.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl">
            {items.length} matching titles. {collection.description}
          </p>
        </div>

        <CatalogFilterBar
          filters={filters}
          onChange={handleFilterChange}
          onApply={applyFilters}
          onReset={resetFilters}
          collectionOptions={allCollections.length > 0 ? allCollections : null}
        />

        {loading ? (
          <LoadingSpinner fullPage message="Filtering Collection..." />
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
            {items.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-14 text-center">
            <p className="text-white font-bold text-base mb-2">
              No titles match those filters in {collection.title}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="btn-crimson px-5 py-2.5 rounded-xl text-xs mt-3"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;
