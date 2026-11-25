const memoryCache = new Map();
const TTL_MS = 5 * 60 * 1000;

export function getCached(key) {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts < TTL_MS) return mem.val;

  try {
    const raw = sessionStorage.getItem(`cr_cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - parsed.ts < TTL_MS) {
      memoryCache.set(key, parsed);
      return parsed.val;
    }
  } catch {
    // ignore storage quota errors
  }
  return null;
}

export function setCached(key, val) {
  const entry = { val, ts: Date.now() };
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(`cr_cache_${key}`, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}
