/** Sozlamalarning ruxsat etilgan oralig'i va boshlang'ich qiymati (UI va serverda bir xil). */
export const SETTING_BOUNDS: Record<string, { min: number; max: number; def: number }> = {
  max_speed_bonus: { min: 0, max: 100, def: 10 },
  correct_points: { min: 1, max: 1000, def: 100 },
  live_question_seconds: { min: 5, max: 600, def: 30 },
  live_grace_ms: { min: 0, max: 10000, def: 1500 },
  qr_window_sec: { min: 15, max: 300, def: 45 },
}

export interface AppSettings {
  max_speed_bonus: number
  correct_points: number
  live_question_seconds: number
  live_grace_ms: number
  qr_window_sec: number
}

/** DB'dan kelgan xom qiymatlarni (noto'g'ri bo'lsa ham) xavfsiz oraliqqa keltiradi. */
export function clampSettings(raw: Record<string, unknown>): AppSettings {
  const out: Record<string, number> = {}
  for (const [k, b] of Object.entries(SETTING_BOUNDS)) {
    const n = Number(raw[k])
    out[k] = Number.isFinite(n) ? Math.min(b.max, Math.max(b.min, n)) : b.def
  }
  return out as unknown as AppSettings
}
