/**
 * Oddiy xotiradagi tezlik cheklovi (sliding window).
 * ESLATMA: serverless'da har instansiyaning o'z xotirasi bor, shuning uchun bu "yaxshi harakat"
 * darajasidagi himoya (ommaviy suiiste'mol va xatolarga qarshi). Qat'iy chegara kerak bo'lsa —
 * docs/decisions.md dagi "Rate limit" bandiga qarang.
 */
const buckets = new Map<string, number[]>()
let lastSweep = 0

export interface RateResult {
  ok: boolean
  retryAfterSec: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateResult {
  if (now - lastSweep > 60_000) {
    lastSweep = now
    for (const [k, hits] of buckets) {
      if (hits.length === 0 || now - (hits[hits.length - 1] ?? 0) > 10 * 60_000) buckets.delete(k)
    }
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    const oldest = hits[0] ?? now
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) }
  }
  hits.push(now)
  buckets.set(key, hits)
  return { ok: true, retryAfterSec: 0 }
}

export function resetRateLimits(): void {
  buckets.clear()
}
