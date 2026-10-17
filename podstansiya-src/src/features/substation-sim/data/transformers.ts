// Transformator modellari (pasport ma'lumotlari). Hammasi verify: true — katalog va pasport bo'yicha tekshirilsin.
// Markalar ensiklopediyasi (6-bosqich) shu faylni kengaytiradi.

import type { CoolingType, Norm } from "./norms";

export interface TransformerModel {
  key: string;
  /** Kirill yozuvidagi marka */
  markCyr: string;
  /** Lotin yozuvidagi marka */
  markLat: string;
  ratedMva: Norm;
  hvKv: Norm;
  mvKv?: Norm;
  lvKv: Norm;
  vectorGroup: Norm<string>;
  /** Qisqa tutashuv kuchlanishi, %: ikki o'ramli uchun {hvLv}, uch o'ramli uchun uchala juftlik */
  ukPct: Norm<Record<string, number>>;
  noLoadLossKw: Norm;
  loadLossKw: Norm;
  noLoadCurrentPct: Norm;
  cooling: Norm<CoolingType>;
  rpn: Norm<{ winding: "hv" | "mv"; steps: number; stepPct: number }>;
}

const SRC = "Ma'lumotnoma/katalogdagi tipik qiymat — aniq transformator pasporti bo'yicha tekshirilsin";
const v = <T,>(value: T, unit: string, note = SRC): Norm<T> => ({ value, unit, verify: true, note, kind: "norm" });

export const TRANSFORMER_MODELS: Record<string, TransformerModel> = {
  "TDTN-25000/110": {
    key: "TDTN-25000/110",
    markCyr: "ТДТН-25000/110",
    markLat: "TDTN-25000/110",
    ratedMva: v(25, "MVA"),
    hvKv: v(115, "kV"),
    mvKv: v(38.5, "kV"),
    lvKv: v(11, "kV"),
    vectorGroup: v("Yn/Yn/Δ-0-11", "—"),
    ukPct: v({ "hv-mv": 10.5, "hv-lv": 17.5, "mv-lv": 6.5 }, "%"),
    noLoadLossKw: v(28.5, "kVt"),
    loadLossKw: v(140, "kVt"),
    noLoadCurrentPct: v(0.7, "%"),
    cooling: v("D", "—"),
    rpn: v({ winding: "hv", steps: 9, stepPct: 1.78 }, "—", "110 kV o'ramda RPN ±9×1,78% (NORMS.rpn110*)"),
  },
};

export function getModel(key: string): TransformerModel {
  const m = TRANSFORMER_MODELS[key];
  if (!m) throw new Error(`Transformator modeli topilmadi: ${key}`);
  return m;
}
