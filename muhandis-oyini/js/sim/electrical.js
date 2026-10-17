// Sof elektr hisob-kitoblar (DOM ga tegmaydi). Barcha qiymatlar o'quv maqsadida soddalashtirilgan.
import { clamp } from '../util.js';

export const SQRT3 = Math.sqrt(3);

/** Nominal tok: I = P / (√3 · U · cosφ · η)   [P kW, U V → I A] */
export function nominalCurrent(P_kW, U, cosphi, eta) {
  return (P_kW * 1000) / (SQRT3 * U * cosphi * eta);
}

/** S (kVA) dan chiziqli tok (A) */
export function currentFromS(S_kVA, U) {
  return (S_kVA * 1000) / (SQRT3 * U);
}

export const tanOf = (cos) => Math.sqrt(1 - cos * cos) / cos;

/** Kondensator quvvati: Qc = P (tgφ1 − tgφ2) */
export function capacitorQc(P_kW, cos1, cos2) {
  return P_kW * (tanOf(cos1) - tanOf(cos2));
}

export function cosFromPQ(P, Q) {
  const S = Math.hypot(P, Q);
  return S > 1e-9 ? P / S : 1;
}

/**
 * Asinxron dvigatelning qisman yuklamadagi kirish quvvati.
 * L — mexanik yuklama koeffitsiyenti (1 = nominal).
 * P_in = P_nom·L/η_op,  Q = Q0 + (Qn − Q0)·L²  → L=1 da aniq I = I_nom.
 */
export function motorPQ(np, L, motorCfg = {}) {
  const q0Frac = motorCfg.q0Frac ?? 0.26;
  const drop = motorCfg.lowLoadEtaDrop ?? 0.2;
  const etaOp = np.eta * (L >= 0.4 ? 1 : 1 - (drop * (0.4 - L)) / 0.4);
  const Pin = (np.P * Math.max(L, 0)) / etaOp;
  const Sn = np.P / (np.eta * np.cosphi);
  const Qn = Sn * Math.sqrt(1 - np.cosphi * np.cosphi);
  const Q0 = q0Frac * Sn;
  const Q = Q0 + (Qn - Q0) * L * L;
  return { P: Pin, Q, S: Math.hypot(Pin, Q) };
}

/** Kabel ruxsat etilgan toki (A), mis, namunaviy jadval */
const AMPACITY = [[1.5, 19], [2.5, 25], [4, 32], [6, 40], [10, 55], [16, 70], [25, 90], [35, 110], [50, 135], [70, 170], [95, 205], [120, 235], [150, 265], [185, 300], [240, 360], [300, 420], [400, 500], [500, 580]];
export function cableAmpacity(section) {
  if (!section) return Infinity;
  for (const [s, a] of AMPACITY) if (section <= s) return a;
  return AMPACITY[AMPACITY.length - 1][1];
}

/** Kabel qarshiligi (Ω): R = ρ/S · L/1000 (ρ — Ω·mm²/km) */
export function cableR(section, length_m, rho = 22.5) {
  if (!section) return 0;
  return (rho / section) * (length_m / 1000);
}

/** Kabeldagi chiziqli kuchlanish pasayishi (% U_nom): ΔU = √3·I·(R·cosφ + X·sinφ) */
export function cableDropPct(I, section, length_m, cosphi, U, cfg = {}) {
  if (!section || !I) return 0;
  const R = cableR(section, length_m, cfg.rhoCuOhmMm2PerKm ?? 22.5);
  const X = (cfg.xPerKm ?? 0.08) * (length_m / 1000);
  const sin = Math.sqrt(1 - cosphi * cosphi);
  const dU = SQRT3 * I * (R * cosphi + X * sin);
  return (dU / U) * 100;
}

/** Kontaktdagi kuchlanish pasayishi (V, chiziqli): √3·I·R */
export function contactDropV(I, R_ohm) {
  return SQRT3 * I * R_ohm;
}

/** Fazalar toki nosimmetrikligi: max|I_k − I_o'rt| / I_o'rt · 100 (%) */
export function unbalancePct(arr) {
  const avg = (arr[0] + arr[1] + arr[2]) / 3;
  if (avg < 1e-9) return 0;
  return (Math.max(...arr.map((x) => Math.abs(x - avg))) / avg) * 100;
}

/** Kuchlanish og'ishi (%) nominalga nisbatan */
export function voltageDevPct(U, Unom) {
  return ((U - Unom) / Unom) * 100;
}

export function tmLoadK(S_kVA, Sn_kVA) {
  return S_kVA / Sn_kVA;
}

/** Transformator ikkilamchi shinasi kuchlanishi (V): U = Unom·(U0 − drop·K) */
export function busVoltage(K, plantCfg) {
  return plantCfg.uNom * (plantCfg.busNoLoad - plantCfg.trDropPerK * K);
}

/** Standart kondensator pog'onalari bo'yicha cosφ */
export function cosAfterCompensation(P, Q, Qc) {
  const Qn = Q - Qc;
  return cosFromPQ(P, Qn);
}

export { clamp };
