import { Search } from "lucide-react";

const GENRE_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "28", label: "Action" },
  { value: "12", label: "Adventure" },
  { value: "16", label: "Animation / Anime" },
  { value: "35", label: "Comedy" },
  { value: "80", label: "Crime" },
  { value: "18", label: "Drama" },
  { value: "14", label: "Fantasy" },
  { value: "27", label: "Horror" },
  { value: "9648", label: "Mystery" },
  { value: "10749", label: "Romance" },
  { value: "878", label: "Sci-Fi" },
  { value: "53", label: "Thriller" },
];

const LANGUAGE_OPTIONS = [
  { value: "all", label: "All languages" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
  { value: "ta", label: "Tamil" },
  { value: "ml", label: "Malayalam" },
  { value: "kn", label: "Kannada" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
];

const YEAR_OPTIONS = [
  { value: "all", label: "All years" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2020s", label: "2020s" },
  { value: "2010s", label: "2010s" },
  { value: "classic", label: "Classic (<2010)" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "top_rated", label: "TMDB rating" },
  { value: "newest", label: "Recently added" },
];

const CatalogFilterBar = ({
  filters,
  onChange,
  onApply,
  onReset,
  collectionOptions = null,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onApply();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card rounded-2xl p-4 sm:p-5 mb-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Search */}
        <div className="lg:col-span-3 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Search
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.q || ""}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              placeholder="Movie or series title"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914]"
            />
          </div>
        </div>

        {/* Type */}
        <div className="lg:col-span-2 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Type
          </label>
          <select
            value={filters.type || "all"}
            onChange={(e) => onChange({ ...filters, type: e.target.value })}
            className="w-full bg-[#13131c] border border-white/[0.1] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#e50914]"
          >
            <option value="all">Movies &amp; series</option>
            <option value="movie">Movies only</option>
            <option value="tv">Series &amp; shows</option>
          </select>
        </div>

        {/* Category / Genre or Collection */}
        <div className="lg:col-span-2 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {collectionOptions ? "Collection" : "Category"}
          </label>
          {collectionOptions ? (
            <select
              value={filters.collectionSlug || ""}
              onChange={(e) =>
                onChange({ ...filters, collectionSlug: e.target.value }, true)
              }
              className="w-full bg-[#13131c] border border-white/[0.1] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#e50914]"
            >
              {collectionOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={filters.genre || "all"}
              onChange={(e) => onChange({ ...filters, genre: e.target.value })}
              className="w-full bg-[#13131c] border border-white/[0.1] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#e50914]"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Language */}
        <div className="lg:col-span-1 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Language
          </label>
          <select
            value={filters.language || "all"}
            onChange={(e) => onChange({ ...filters, language: e.target.value })}
            className="w-full bg-[#13131c] border border-white/[0.1] rounded-xl py-2.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
          >
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="lg:col-span-1 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Year
          </label>
          <select
            value={filters.year || "all"}
            onChange={(e) => onChange({ ...filters, year: e.target.value })}
            className="w-full bg-[#13131c] border border-white/[0.1] rounded-xl py-2.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="lg:col-span-1 space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sort By
          </label>
          <select
            value={filters.sort || "popular"}
            onChange={(e) => onChange({ ...filters, sort: e.target.value })}
            className="w-full bg-[#13131c] border border-white/[0.1] rounded-xl py-2.5 px-2.5 text-xs text-white focus:outline-none focus:border-[#e50914]"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="lg:col-span-2 flex gap-2">
          <button
            type="submit"
            className="flex-grow btn-crimson py-2.5 px-4 rounded-xl text-xs whitespace-nowrap"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={onReset}
            className="glass-button py-2.5 px-3.5 rounded-xl text-xs font-semibold"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
};

export default CatalogFilterBar;

