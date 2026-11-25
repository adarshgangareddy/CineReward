const WATCHLIST_KEY = "cinereward_watchlist_v1";

export function getWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isInWatchlist(id) {
  const target = String(id);
  return getWatchlist().some((item) => String(item.id) === target);
}

export function toggleWatchlist(movie) {
  if (!movie || !movie.id) return getWatchlist();
  const current = getWatchlist();
  const target = String(movie.id);
  const exists = current.some((item) => String(item.id) === target);

  const next = exists
    ? current.filter((item) => String(item.id) !== target)
    : [
        {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          year: movie.year || (movie.release_date ? movie.release_date.slice(0, 4) : ""),
          mediaType: movie.mediaType || "movie",
          bookable: movie.bookable !== false,
          addedAt: Date.now(),
        },
        ...current,
      ];

  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("watchlistUpdated"));
  return next;
}
