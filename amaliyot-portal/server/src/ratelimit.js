// Oddiy xotiradagi so'rovlar chegarasi (bitta server uchun yetarli; ko'p serverda teskari proksi chegarasi qo'shing).
export function createRateLimiter({ windowMs = 60000 } = {}) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs).unref();
  return function allow(key, limit) {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    h.n++;
    return { ok: h.n <= limit, retryAfterSec: Math.ceil((h.reset - now) / 1000) };
  };
}
