// Transformator modellari (pasport ma'lumotlari). Hammasi verify: true — katalog va pasport bo'yicha tekshirilsin.
// Markalar ensiklopediyasi (/ensiklopediya) va viktorina shu ma'lumotdan foydalanadi.

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
  /** Rostlash turi: RPN — yuklama ostida, PBV — kuchlanishsiz (o'chirib) pog'ona almashtirish */
  regulation?: Norm<"RPN" | "PBV">;
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
    regulation: v("RPN", "—"),
  },
};


// Qo'shimcha modellar (S09 marka tanlash, S18 va markalar ensiklopediyasi uchun). Barcha qiymatlar tipik — verify.
const two = (o: {
  key: string;
  cyr: string;
  mva: number;
  hv: number;
  lv: number;
  group: string;
  uk: number;
  p0: number;
  pk: number;
  i0: number;
  cooling: CoolingType;
  rpn: { steps: number; stepPct: number };
  regulation: "RPN" | "PBV";
}): TransformerModel => ({
  key: o.key,
  markCyr: o.cyr,
  markLat: o.key,
  ratedMva: v(o.mva, "MVA"),
  hvKv: v(o.hv, "kV"),
  lvKv: v(o.lv, "kV"),
  vectorGroup: v(o.group, "—"),
  ukPct: v({ "hv-lv": o.uk }, "%"),
  noLoadLossKw: v(o.p0, "kVt"),
  loadLossKw: v(o.pk, "kVt"),
  noLoadCurrentPct: v(o.i0, "%"),
  cooling: v(o.cooling, "—"),
  rpn: v({ winding: "hv", steps: o.rpn.steps, stepPct: o.rpn.stepPct }, "—"),
  regulation: v(o.regulation, "—"),
});

for (const m of [
  two({ key: "TMN-6300/35", cyr: "ТМН-6300/35", mva: 6.3, hv: 35, lv: 11, group: "Y/Δ-11", uk: 7.5, p0: 8, pk: 46.5, i0: 0.8, cooling: "M", rpn: { steps: 6, stepPct: 1.5 }, regulation: "RPN" }),
  two({ key: "TMN-4000/35", cyr: "ТМН-4000/35", mva: 4, hv: 35, lv: 11, group: "Y/Δ-11", uk: 7.5, p0: 5.6, pk: 33.5, i0: 0.9, cooling: "M", rpn: { steps: 6, stepPct: 1.5 }, regulation: "RPN" }),
  two({ key: "TMN-2500/35", cyr: "ТМН-2500/35", mva: 2.5, hv: 35, lv: 11, group: "Y/Δ-11", uk: 6.5, p0: 4.1, pk: 23.5, i0: 1.0, cooling: "M", rpn: { steps: 6, stepPct: 1.5 }, regulation: "RPN" }),
  two({ key: "TDN-10000/110", cyr: "ТДН-10000/110", mva: 10, hv: 115, lv: 11, group: "Yn/Δ-11", uk: 10.5, p0: 14, pk: 58, i0: 0.9, cooling: "D", rpn: { steps: 9, stepPct: 1.78 }, regulation: "RPN" }),
  two({ key: "TDN-16000/110", cyr: "ТДН-16000/110", mva: 16, hv: 115, lv: 11, group: "Yn/Δ-11", uk: 10.5, p0: 18, pk: 85, i0: 0.7, cooling: "D", rpn: { steps: 9, stepPct: 1.78 }, regulation: "RPN" }),
  two({ key: "TRDN-25000/110", cyr: "ТРДН-25000/110", mva: 25, hv: 115, lv: 10.5, group: "Yn/Δ-Δ-11-11", uk: 10.5, p0: 25, pk: 120, i0: 0.65, cooling: "D", rpn: { steps: 9, stepPct: 1.78 }, regulation: "RPN" }),
  two({ key: "TM-1600/10", cyr: "ТМ-1600/10", mva: 1.6, hv: 10, lv: 0.4, group: "Δ/Yn-11", uk: 6, p0: 2.65, pk: 16.5, i0: 1.3, cooling: "M", rpn: { steps: 2, stepPct: 2.5 }, regulation: "PBV" }),
  two({ key: "TMG-1000/10", cyr: "ТМГ-1000/10", mva: 1, hv: 10, lv: 0.4, group: "Δ/Yn-11", uk: 5.5, p0: 1.6, pk: 10.8, i0: 1.2, cooling: "M", rpn: { steps: 2, stepPct: 2.5 }, regulation: "PBV" }),
  two({ key: "TMG-630/10", cyr: "ТМГ-630/10", mva: 0.63, hv: 10, lv: 0.4, group: "Δ/Yn-11", uk: 5.5, p0: 1.05, pk: 7.6, i0: 1.4, cooling: "M", rpn: { steps: 2, stepPct: 2.5 }, regulation: "PBV" }),
]) {
  TRANSFORMER_MODELS[m.key] = m;
}

export function getModel(key: string): TransformerModel {
  const m = TRANSFORMER_MODELS[key];
  if (!m) throw new Error(`Transformator modeli topilmadi: ${key}`);
  return m;
}
