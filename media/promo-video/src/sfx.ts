import { SCENES } from './theme';

/**
 * Ovoz effektlari (UI tovushlari) jadvali. Fayllar: public/sfx/<name>.wav (scripts/make-sfx.py yaratadi).
 * Kadrlar sahna ichidagi mahalliy kadrlar bo'yicha yoziladi va `at(sahna, kadr)` bilan umumiy vaqtga o'giriladi:
 * animatsiya vaqti o'zgarsa, shu yerdagi raqamni ham o'zgartiring.
 *   sahna indeksi: 0 brand, 1 order, 2 promo, 3 seller, 4 courier, 5 rating, 6 outro
 */
export interface SfxEvent { name: string; frame: number; volume?: number }

/** Fayl davomiyligi (soniya): <Sequence> uzunligi uchun. */
export const SFX_SECONDS: Record<string, number> = {
  click: 0.08, tap: 0.09, tick: 0.05, tick_hi: 0.05, pop: 0.16, pop_hi: 0.13, pop_low: 0.2, whoosh: 0.5, whoosh_up: 0.45,
  thud: 0.35, blip: 0.09, chime: 1.0, buzz: 0.55, success: 0.9, coin: 0.8, star1: 0.5, star2: 0.5, star3: 0.5, star4: 0.5, star5: 0.5,
  lock: 0.25, rolldown: 1.0, sweep_up: 0.95, doorbell: 1.4, confetti: 0.7, engine: 1.6,
};

const at = (scene: number, local: number) => SCENES[scene].from + local;
const e = (name: string, scene: number, local: number, volume = 1): SfxEvent => ({ name, frame: at(scene, local), volume });

export const SFX_EVENTS: SfxEvent[] = [
  // ---- 1. Brend (0–3 s) ----
  e('whoosh_up', 0, 0, 0.55), e('pop_hi', 0, 4, 0.7), e('pop', 0, 12, 0.9), e('pop', 0, 16, 0.9),
  e('pop_hi', 0, 16, 0.4), e('pop_hi', 0, 21, 0.4), e('pop_hi', 0, 26, 0.4), e('pop_hi', 0, 31, 0.4),
  e('thud', 0, 34, 1), e('pop_low', 0, 34, 0.8),

  // ---- 2. Xaridor (3–8 s) ----
  e('whoosh', 1, -3, 0.8), e('pop', 1, 0, 0.7), e('pop', 1, 14, 0.6), e('whoosh_up', 1, 6, 0.5),
  e('tap', 1, 20, 0.9), e('tap', 1, 46, 0.9), e('tap', 1, 72, 0.9),
  e('click', 1, 96, 1),
  e('whoosh', 1, 102, 0.55),
  e('pop_low', 1, 112, 0.9),
  ...[14, 17, 20, 23, 26, 29].map((g) => e('tick', 1, 104 + g, 0.9)),
  e('whoosh_up', 1, 128, 0.5), e('click', 1, 154, 1), e('success', 1, 156, 0.5),

  // ---- 3. Promokod (8–13 s) ----
  e('whoosh', 2, -3, 0.8), e('pop', 2, 0, 0.7), e('pop', 2, 14, 0.6), e('whoosh_up', 2, 4, 0.5),
  ...[21, 26, 31, 36].map((f) => e('tick_hi', 2, f, 0.9)),
  e('click', 2, 48, 1), e('success', 2, 52, 0.7),
  e('coin', 2, 54, 0.9), e('confetti', 2, 54, 0.8), e('rolldown', 2, 55, 0.7), e('pop_low', 2, 64, 0.7),

  // ---- 4. Sotuvchi (13–18 s) ----
  e('whoosh', 3, -3, 0.8), e('pop', 3, 0, 0.7), e('pop', 3, 14, 0.6), e('whoosh_up', 3, 2, 0.5),
  e('chime', 3, 22, 1), e('buzz', 3, 24, 0.55), e('pop_low', 3, 24, 0.7), e('pop', 3, 40, 0.8),
  e('click', 3, 84, 1), e('success', 3, 92, 0.9), e('pop_low', 3, 94, 0.8),

  // ---- 5. Kuryer (18–24 s) ----
  e('whoosh', 4, -3, 0.8), e('pop', 4, 0, 0.7), e('pop', 4, 14, 0.6), e('whoosh_up', 4, 4, 0.5),
  e('blip', 4, 14, 0.5), e('blip', 4, 19, 0.5), e('blip', 4, 24, 0.5), e('blip', 4, 29, 0.5),
  e('lock', 4, 44, 0.9), e('pop_low', 4, 50, 0.8),
  e('sweep_up', 4, 62, 0.55),
  e('whoosh', 4, 98, 0.7), e('engine', 4, 108, 0.35),
  e('doorbell', 4, 174, 0.9), e('pop_low', 4, 176, 0.8),

  // ---- 6. Baho (24–28 s) ----
  e('whoosh', 5, -3, 0.8), e('pop', 5, 0, 0.7), e('pop', 5, 14, 0.6), e('whoosh_up', 5, 3, 0.5),
  e('star1', 5, 26, 0.9), e('star2', 5, 33, 0.9), e('star3', 5, 40, 0.9), e('star4', 5, 47, 0.9), e('star5', 5, 54, 1),
  e('pop_low', 5, 40, 0.5), e('confetti', 5, 56, 0.9), e('pop_low', 5, 58, 0.9),

  // ---- 7. Yakuniy ekran (28–30 s) ----
  e('whoosh', 6, -3, 0.8), e('pop', 6, 0, 0.8),
  e('pop_hi', 6, 4, 0.9), e('pop_hi', 6, 8, 1), e('pop_hi', 6, 12, 1.1),
  e('pop_low', 6, 24, 0.9), e('success', 6, 25, 0.7), e('pop_hi', 6, 34, 0.5),
];
