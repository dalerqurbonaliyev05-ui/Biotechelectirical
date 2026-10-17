// RPN (yuklama ostida kuchlanishni rostlash). RPN o'ramlar nisbatini o'zgartiradi — kuchlanishni
// rostlaydi, transformator QUVVATINI OSHIRMAYDI.
// Pog'ona belgisi: tap > 0 — YK o'ramida o'ramlar ko'p (past tomonda kuchlanish pasayadi).
// Amalda pog'ona raqamlash ishlab chiqaruvchiga qarab farq qiladi (tekshiruv ro'yxatida qayd etilgan).

import { NORMS } from "../data/norms";
import type { TransformerModel } from "../data/transformers";

export interface RpnInput {
  sourceKv: number;
  tap: number;
  model: TransformerModel;
  /** Yuklama koeffitsienti K = S / Snom */
  k: number;
}

/** Past kuchlanish (10 kV) shinasidagi kuchlanish, kV. */
export function lvVoltage({ sourceKv, tap, model, k }: RpnInput): number {
  const rpn = model.rpn.value;
  const hvTapKv = model.hvKv.value * (1 + (tap * rpn.stepPct) / 100);
  const noLoad = (sourceKv * model.lvKv.value) / hvTapKv;
  const drop = (k * NORMS.loadDropAtNominalPct.value) / 100;
  return noLoad * (1 - drop);
}

export type TapCheck = { ok: true } | { ok: false; code: "rpnBusy" | "rpnLimit" | "rpnBlockedHighCurrent" };

/**
 * dir = +1 — past tomonda kuchlanishni OSHIRISH (tap kamayadi), −1 — pasaytirish.
 */
export function checkTap(params: { tap: number; dir: 1 | -1; model: TransformerModel; k: number; now: number; busyUntil: number }): TapCheck {
  if (params.now < params.busyUntil) return { ok: false, code: "rpnBusy" };
  const next = params.tap - params.dir;
  if (Math.abs(next) > params.model.rpn.value.steps) return { ok: false, code: "rpnLimit" };
  if (params.k > NORMS.rpnBlockLoadFactor.value) return { ok: false, code: "rpnBlockedHighCurrent" };
  return { ok: true };
}

export function nextTap(tap: number, dir: 1 | -1): number {
  return tap - dir;
}
