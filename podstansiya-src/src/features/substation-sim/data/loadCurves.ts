// Kunlik yuklama grafiklari (nisbiy, maksimumga nisbatan) va ob-havo ehtimollari.
// Bular o'quv NAMUNASI (model), me'yor emas: real tarmoq grafiklari bilan almashtirilishi mumkin.

import type { Norm } from "./norms";
import type { Weather } from "../engine/scenario";

const curve = (values: number[], note: string): Norm<number[]> => ({ value: values, unit: "× Pmax", verify: true, note, kind: "model" });

export const LOAD_CURVES: Record<"winter" | "summer", Norm<number[]>> = {
  // 0..23 soat. Qishda ertalabki va kechki cho'qqi, yozda tushdan keyingi (konditsioner) cho'qqi.
  winter: curve(
    [0.55, 0.52, 0.5, 0.5, 0.52, 0.6, 0.75, 0.88, 0.92, 0.9, 0.86, 0.84, 0.82, 0.8, 0.8, 0.82, 0.88, 0.97, 1.0, 0.98, 0.92, 0.82, 0.7, 0.6],
    "Qishki sutkalik grafik — tipik shakl (namuna)",
  ),
  summer: curve(
    [0.6, 0.56, 0.53, 0.52, 0.53, 0.58, 0.66, 0.74, 0.8, 0.86, 0.92, 0.97, 1.0, 1.0, 0.99, 0.97, 0.94, 0.9, 0.88, 0.9, 0.88, 0.8, 0.72, 0.65],
    "Yozgi sutkalik grafik — tipik shakl (namuna)",
  ),
};

export const WEATHER_WEIGHTS: Record<"winter" | "summer", Record<Weather, number>> = {
  winter: { clear: 4, rain: 2, snow: 3, ice: 1, wind: 2, storm: 0, heat: 0, fog: 2 },
  summer: { clear: 6, rain: 1, snow: 0, ice: 0, wind: 2, storm: 1, heat: 3, fog: 0 },
};
