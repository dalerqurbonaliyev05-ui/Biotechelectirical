// Transformatorlarni parallel ulash shartlari (5.7): ulanish guruhi, transformatsiya koeffitsienti,
// uk% va quvvatlar nisbati. Shart buzilsa tenglashtiruvchi (aylanma) tok va noto'g'ri yuklama
// taqsimoti baholanadi. Fazirovka — alohida qadam (stsenariyda).

import { NORMS } from "../data/norms";
import type { TransformerModel } from "../data/transformers";

export interface ParallelUnit {
  model: TransformerModel;
  /** RPN pog'onasi (YK o'ramida) */
  tap: number;
}

export type ParallelIssueCode = "vectorGroup" | "ratio" | "uk" | "powerRatio";

export interface ParallelCheck {
  ok: boolean;
  issues: ParallelIssueCode[];
  /** Transformatsiya koeffitsientlari farqi, % */
  ratioDiffPct: number;
  /** Tenglashtiruvchi (aylanma) tok, nominal tokka nisbatan % (taxminiy: ΔU% / (uk1 + uk2) · 100) */
  circulatingCurrentPct: number;
  /** Yuklama taqsimoti ulushlari (uk ga teskari proporsional, quvvatga proporsional) */
  loadShare: [number, number];
}

function ratio(u: ParallelUnit): number {
  const r = u.model.rpn.value;
  return (u.model.hvKv.value * (1 + (u.tap * r.stepPct) / 100)) / u.model.lvKv.value;
}

function ukHvLv(m: TransformerModel): number {
  const uk = m.ukPct.value;
  return uk["hv-lv"] ?? Object.values(uk)[0];
}

export function checkParallel(a: ParallelUnit, b: ParallelUnit): ParallelCheck {
  const issues: ParallelIssueCode[] = [];
  if (a.model.vectorGroup.value !== b.model.vectorGroup.value) issues.push("vectorGroup");

  const ra = ratio(a);
  const rb = ratio(b);
  const ratioDiffPct = (Math.abs(ra - rb) / ((ra + rb) / 2)) * 100;
  if (ratioDiffPct > NORMS.parallelRatioDiffPct.value) issues.push("ratio");

  const uka = ukHvLv(a.model);
  const ukb = ukHvLv(b.model);
  if ((Math.abs(uka - ukb) / ((uka + ukb) / 2)) * 100 > NORMS.parallelUkDiffPct.value) issues.push("uk");

  const sa = a.model.ratedMva.value;
  const sb = b.model.ratedMva.value;
  if (Math.max(sa, sb) / Math.min(sa, sb) > NORMS.parallelMaxPowerRatio.value) issues.push("powerRatio");

  // Ulanish guruhi har xil bo'lsa — aylanma tok qisqa tutashuv darajasida (amalda ulash mumkin emas)
  const circulatingCurrentPct = issues.includes("vectorGroup") ? Infinity : (ratioDiffPct / (uka + ukb)) * 100;
  const wa = sa / uka;
  const wb = sb / ukb;
  return { ok: issues.length === 0, issues, ratioDiffPct, circulatingCurrentPct, loadShare: [wa / (wa + wb), wb / (wa + wb)] };
}
