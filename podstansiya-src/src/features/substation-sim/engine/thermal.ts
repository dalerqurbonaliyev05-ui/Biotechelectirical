// Transformator issiqlik modeli (IEC 60076-7 eksponensial tenglamalari asosida, soddalashtirilgan):
//   Δθo_cheksiz = Δθor · ((1 + R·K²) / (1 + R))^x
//   θo(t+dt)    = θo_cheksiz + (θo(t) − θo_cheksiz) · e^(−dt/τo)
//   θh          = θo + Hgr · K^y          (o'ram vaqt doimiysi e'tiborsiz)
//   V           = 2^((θh − 98) / 6)       (nisbiy eskirish tezligi)
// Barcha koeffitsientlar data/norms.ts da (verify: true).

import { NORMS, THERMAL, type CoolingType, type ThermalParams } from "../data/norms";

export interface EffectiveCooling {
  params: ThermalParams;
  /** Issiqlik jihatidan ekvivalent quvvat ulushi (ventilyatorlar o'chiq bo'lsa < 1) */
  ratingFactor: number;
}

/**
 * D sovutish: ventilyatorlar radiatorlarni puflaydi va moyni radiator orqali BILVOSITA sovutadi.
 * Ular o'chiq bo'lsa transformator tabiiy (M) sovutish rejimida ishlaydi va ruxsat etilgan quvvat kamayadi.
 */
export function effectiveCooling(cooling: CoolingType, fansOn: boolean): EffectiveCooling {
  if (cooling === "D" && !fansOn) {
    return { params: THERMAL.M, ratingFactor: NORMS.fanOffRatingFactor.value };
  }
  return { params: THERMAL[cooling], ratingFactor: 1 };
}

export function ultimateTopOilRise(k: number, p: ThermalParams): number {
  const R = p.R.value;
  return p.topOilRiseK.value * Math.pow((1 + R * k * k) / (1 + R), p.x.value);
}

/** Moy haroratini dt sekund oldinga hisoblaydi (1-tartibli inersion bo'g'in). */
export function stepTopOil(currentC: number, ambientC: number, k: number, p: ThermalParams, dtSec: number): number {
  const target = ambientC + ultimateTopOilRise(k, p);
  const tau = p.tauOilMin.value * 60;
  return target + (currentC - target) * Math.exp(-dtSec / tau);
}

export function steadyTopOil(ambientC: number, k: number, p: ThermalParams): number {
  return ambientC + ultimateTopOilRise(k, p);
}

export function hotSpot(topOilC: number, k: number, p: ThermalParams): number {
  return topOilC + p.hotSpotGradientK.value * Math.pow(k, p.y.value);
}

export function agingRate(hotSpotC: number): number {
  return Math.pow(2, (hotSpotC - NORMS.agingRefHotSpotC.value) / NORMS.agingDoublingK.value);
}

export function fansShouldRun(topOilC: number, k: number): boolean {
  return topOilC >= NORMS.fanAutoOnOilC.value || k >= NORMS.fanAutoOnLoadFactor.value;
}

export type ThermalStatus = "normal" | "alarm" | "overLimit";

export function thermalStatus(topOilC: number, cooling: CoolingType): ThermalStatus {
  const p = THERMAL[cooling];
  if (topOilC > p.topOilMaxC.value) return "overLimit";
  if (topOilC >= p.topOilAlarmC.value) return "alarm";
  return "normal";
}
