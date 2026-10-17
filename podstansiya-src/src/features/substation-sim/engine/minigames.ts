// Mini-o'yinlar mantig'i (UI'siz): gaz turini aniqlash, moy sinovi xulosasi, ko'rik natijasi, termometr, megger.

import { GAS_TYPES, type GasTypeId } from "../data/minigames";
import { NORMS, THERMAL, type CoolingType } from "../data/norms";

/** "29 kV", "0,07 mg KOH/g", "≈150 sm³" → son (topilmasa NaN). */
export function parseNum(s: string): number {
  const m = s.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

/** Gaz namunasi natijasidagi rang bo'yicha gaz turi. */
export function gasTypeOf(values: Record<string, string>): GasTypeId | null {
  const color = (values.Rangi ?? "").toLowerCase();
  return GAS_TYPES.find((g) => g.keywords.some((k) => color.includes(k)))?.id ?? null;
}

export interface OilCheck {
  key: "breakdown" | "moisture" | "acid";
  value: number;
  limit: number;
  ok: boolean;
}

/** Moy sinovi natijasini me'yorlar bilan solishtirish (NORMS.oil*). */
export function oilVerdict(values: Record<string, string>): { checks: OilCheck[]; fit: boolean } {
  const checks: OilCheck[] = [];
  const bd = parseNum(values["Probiv kuchlanishi"] ?? "");
  if (Number.isFinite(bd)) checks.push({ key: "breakdown", value: bd, limit: NORMS.oilBreakdownMinKv.value, ok: bd >= NORMS.oilBreakdownMinKv.value });
  const w = parseNum(values.Namlik ?? "");
  if (Number.isFinite(w)) checks.push({ key: "moisture", value: w, limit: NORMS.oilMoistureMaxPpm.value, ok: w <= NORMS.oilMoistureMaxPpm.value });
  const a = parseNum(values["Kislota soni"] ?? "");
  if (Number.isFinite(a)) checks.push({ key: "acid", value: a, limit: NORMS.oilAcidMax.value, ok: a <= NORMS.oilAcidMax.value });
  return { checks, fit: checks.every((c) => c.ok) };
}

/** Probiv sinovida kuchlanish ko'tarilish vaqti (s) — NORMS.oilBreakdownRampKvPerSec bo'yicha. */
export function rampSeconds(breakdownKv: number): number {
  return breakdownKv / NORMS.oilBreakdownRampKvPerSec.value;
}

/** Ko'rik natijasi: belgilangan nuqtalar va haqiqiy nosozliklar. */
export function checkInspection(marked: readonly string[], defects: readonly string[]) {
  const found = defects.filter((d) => marked.includes(d));
  const missed = defects.filter((d) => !marked.includes(d));
  const falseAlarms = marked.filter((m) => !defects.includes(m));
  return { found, missed, falseAlarms, ok: missed.length === 0 && falseAlarms.length === 0 };
}

export type ThermoState = "normal" | "alarm" | "over";

/** Moy harorati holati: signal sozlamasi va ruxsat etilgan eng katta qiymat (THERMAL). */
export function thermoState(tempC: number, cooling: CoolingType): ThermoState {
  const t = THERMAL[cooling];
  if (tempC > t.topOilMaxC.value) return "over";
  if (tempC >= t.topOilAlarmC.value) return "alarm";
  return "normal";
}

/** Megger: ko'rsatkich o'z vaqtida (15 s yoki 60 s) yozib olindimi. */
export function captureOk(tSec: number, targetSec: number): boolean {
  return Math.abs(tSec - targetSec) <= NORMS.meggerCaptureWindowSec.value;
}
