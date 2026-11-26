/**
 * Generate a unique 16-digit numeric Secret Key for Movie Teams.
 */
export function generate16DigitKey() {
  const arr = new Uint32Array(16);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i += 1) {
      arr[i] = Math.floor(Math.random() * 10000);
    }
  }
  const first = (arr[0] % 9) + 1;
  let out = String(first);
  for (let i = 1; i < 16; i += 1) {
    out += String(arr[i] % 10);
  }
  return out;
}

/**
 * Generate a unique @cinereward.com team email from a movie or studio title.
 */
export function generateCineRewardEmail(title = "movie", existingTeams = []) {
  const baseSlug =
    String(title || "movie")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 26) || "studio";

  const taken = new Set(
    (existingTeams || []).map((t) => String(t.email || "").trim().toLowerCase())
  );

  let candidate = `${baseSlug}@cinereward.com`;
  if (!taken.has(candidate)) return candidate;

  for (let i = 2; i <= 99; i += 1) {
    candidate = `${baseSlug}-${i}@cinereward.com`;
    if (!taken.has(candidate)) return candidate;
  }

  const rand = Math.floor(100 + Math.random() * 900);
  return `${baseSlug}-${rand}@cinereward.com`;
}
