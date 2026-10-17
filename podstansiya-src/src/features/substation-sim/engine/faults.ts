// Nosozlik modellari. 6–35 kV (izolyatsiyalangan neytral) bir fazali yerga tutashuv va
// 110 kV (samarali yerlangan neytral) qisqa tutashuv + APV alohida modellanadi.

import { NORMS } from "../data/norms";
import type { Rng } from "./events";

export type Phase = "A" | "B" | "C";

/**
 * Bir fazali yerga tutashuvda fazalarning yerga nisbatan kuchlanishi, kV.
 * severity = 1 — metall tutashuv: shikastlangan faza ≈ 0, qolgan ikkitasi chiziqli kuchlanishgacha ko'tariladi.
 * 0 < severity < 1 — o'tish qarshiligi orqali (chiziqli interpolyatsiya — SODDALASHTIRILGAN model).
 */
export function earthFaultPhaseVoltages(unomKv: number, phase: Phase, severity: number): Record<Phase, number> {
  const s = Math.max(0, Math.min(1, severity));
  const uPh = unomKv / Math.sqrt(3);
  const out: Record<Phase, number> = { A: uPh, B: uPh, C: uPh };
  for (const p of ["A", "B", "C"] as Phase[]) {
    out[p] = p === phase ? uPh * (1 - s) : uPh + (unomKv - uPh) * s;
  }
  return out;
}

/** 6–35 kV tarmoqda yerga tutashuv bilan qolgan ishlash vaqti, sekund (≤ 0 — muddat tugagan). */
export function earthFaultTimeLeftSec(startedAtSec: number, nowSec: number): number {
  return NORMS.earthFaultMaxDurationMin.value * 60 - (nowSec - startedAtSec);
}

/** 6–35 kV: yerga tutashuv darhol o'chirmaydi; odamga xavf bo'lsa darhol uzish kerak. */
export function earthFaultRequiresImmediateTrip(hazardToPeople: boolean): boolean {
  return hazardToPeople;
}

export type ApvResult = "success" | "fail";

/** 110 kV liniyada QT: himoya darhol o'chiradi, keyin APV. Natija ehtimollik bilan (seed'li RNG). */
export function apvAttempt(rng: Rng, successProbability = NORMS.apvSuccessProbability.value): ApvResult {
  return rng() < successProbability ? "success" : "fail";
}

/**
 * APV muvaffaqiyatsiz bo'lgandan keyin dispetcher ruxsatisiz va liniya ko'rigisiz qayta ulash
 * ("ko'r-ko'rona" ulash) — qoidabuzarlik.
 */
export function blindReclosePenaltyApplies(apv: ApvResult, lineInspected: boolean, dispatcherPermission: boolean): boolean {
  return apv === "fail" && !(lineInspected && dispatcherPermission);
}
