// Tasodifiy hodisalar generatori asosi: seed'li RNG (testlar takrorlanuvchi bo'lishi uchun),
// ob-havo va kunlik yuklama grafigi.

import { LOAD_CURVES, WEATHER_WEIGHTS } from "../data/loadCurves";
import type { Weather } from "./scenario";

export type Rng = () => number;

/** mulberry32 — kichik, tez, takrorlanuvchi psevdotasodifiy generator. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted<T extends string>(rng: Rng, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

export function randomWeather(rng: Rng, season: "winter" | "summer"): Weather {
  return pickWeighted(rng, WEATHER_WEIGHTS[season]);
}

/** Soatga qarab yuklama koeffitsienti (chiziqli interpolyatsiya). hour: 0..24 */
export function dailyLoadFactor(hour: number, season: "winter" | "summer"): number {
  const curve = LOAD_CURVES[season].value;
  const h = ((hour % 24) + 24) % 24;
  const i = Math.floor(h);
  const f = h - i;
  return curve[i] * (1 - f) + curve[(i + 1) % 24] * f;
}
