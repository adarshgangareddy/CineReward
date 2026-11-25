export const DEFAULT_BACKDROP =
  "https://image.tmdb.org/t/p/original/8YFL5QQVPy3Mrs2MKOD6RZEa2Lf.jpg";

export function setActiveBackdrop(url, mode = "ambient") {
  window.dispatchEvent(
    new CustomEvent("cinereward:backdrop", {
      detail: { url: url === null ? "" : url || DEFAULT_BACKDROP, mode },
    })
  );
}
