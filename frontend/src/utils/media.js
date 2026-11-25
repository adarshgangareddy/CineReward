const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export function resolveMoviePoster(posterPath, fallbackSeed = "cinema") {
  if (!posterPath) return `https://picsum.photos/seed/${fallbackSeed}/400/600`;
  if (posterPath.startsWith("http")) return posterPath;
  if (posterPath.startsWith("/")) return `${TMDB_IMAGE_BASE}${posterPath}`;
  return posterPath;
}

