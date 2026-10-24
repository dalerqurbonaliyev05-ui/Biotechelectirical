// Vodorod tizimi: elektroliz, saqlash, PEM yoqilg'i elementi va avtomobil yuritmasi uchun o'quv modellari.
// Sof funksiyalar; birliklar: A, s, V, W, kg, m³, bar, K, m/s. Natijalar taxminiy.

const finite = (v: number, fallback = 0): number => (Number.isFinite(v) ? v : fallback);

/** Faradey doimiysi, Kl/mol */
export const FARADAY = 96485.33;
/** H₂ molyar massasi, g/mol */
export const M_H2 = 2.016;
/** Normal sharoitda (0 °C, 1 atm) gazning molyar hajmi, L/mol */
export const VM = 22.414;
/** Vodorodning quyi va yuqori yonish issiqligi, kVt·soat/kg */
export const LHV = 33.33;
export const HHV = 39.41;
/** H₂ uchun solishtirma gaz doimiysi, J/(kg·K) va Abel–Noble kovolyumi, m³/kg */
const R_H2 = 4124.2;
const B_H2 = 7.69e-3;

export interface ElectrolysisResult {
  /** H₂ miqdori, mol */
  mol: number;
  /** H₂ massasi, g */
  grams: number;
  /** H₂ hajmi (normal sharoit), L */
  litres: number;
  /** O₂ hajmi, L — vodoroddan 2 baravar kam */
  o2Litres: number;
  /** Sarflangan elektr energiya, kVt·soat */
  kWh: number;
  /** FIK (HHV bo'yicha) */
  eta: number;
}

/** Elektroliz: n(H₂) = I·t / (2F), energiya E = U·I·t, FIK = HHV·m / E. */
export function electrolysis(current: number, seconds: number, cellVoltage: number, cells = 1): ElectrolysisResult {
  const I = Math.max(0, finite(current));
  const t = Math.max(0, finite(seconds));
  const N = Math.max(1, Math.round(finite(cells, 1)));
  const mol = (I * t * N) / (2 * FARADAY);
  const grams = mol * M_H2;
  const kWh = (Math.max(0, finite(cellVoltage)) * N * I * t) / 3.6e6;
  const eta = kWh > 0 ? Math.min(1, ((grams / 1000) * HHV) / kWh) : 0;
  return { mol, grams, litres: mol * VM, o2Litres: (mol / 2) * VM, kWh, eta };
}

/** Quyosh paneli quvvati: P = G · A · η, W. */
export function solarPower(irradiance: number, area: number, eta: number): number {
  return Math.max(0, finite(irradiance)) * Math.max(0, finite(area)) * Math.max(0, Math.min(1, finite(eta)));
}

/** Siqilgan H₂ zichligi (Abel–Noble tenglamasi): ρ = p / (R·T + b·p), kg/m³. */
export function h2Density(pBar: number, tempK: number): number {
  const p = Math.max(0, finite(pBar)) * 1e5;
  const T = Math.max(1, finite(tempK, 288));
  return p / (R_H2 * T + B_H2 * p);
}

/** Balon (litr) ichidagi H₂ massasi, kg. */
export function tankMass(volumeL: number, pBar: number, tempK: number): number {
  return h2Density(pBar, tempK) * Math.max(0, finite(volumeL)) / 1000;
}

/** Yurish masofasi, km: m / (sarf kg/100 km) · 100. */
export function rangeKm(massKg: number, kgPer100: number): number {
  if (!(kgPer100 > 0)) return 0;
  return (Math.max(0, finite(massKg)) / kgPer100) * 100;
}

/* ---------------- PEM yoqilg'i elementi ---------------- */

export const CELL = { E0: 1.02, A: 0.025, i0: 1e-4, r: 0.15, c: 0.08, iL: 1.6 } as const;
/** Termoneytral kuchlanish (LHV bo'yicha), V — FIK = U / 1,25 */
export const U_TN = 1.25;

/**
 * Qutblanish egri chizig'i (i — A/cm²): U = E₀ − A·ln(i/i₀) − r·i + c·ln(1 − i/i_L).
 * Aktivatsiya, omik va konsentratsiya yo'qotishlari. Natija ≥ 0.
 */
export function cellVoltage(i: number): number {
  const x = Math.max(0, finite(i));
  if (x >= CELL.iL) return 0;
  const act = CELL.A * Math.log(Math.max(x, CELL.i0) / CELL.i0);
  const ohm = CELL.r * x;
  const conc = -CELL.c * Math.log(1 - x / CELL.iL);
  return Math.max(0, CELL.E0 - act - ohm - conc);
}

export interface StackResult {
  /** Tok zichligi, A/cm² */
  i: number;
  cellV: number;
  stackV: number;
  /** Elektr quvvat, W */
  power: number;
  /** Issiqlik, W */
  heat: number;
  /** FIK (LHV) */
  eta: number;
  /** H₂ sarfi, g/s */
  h2gps: number;
}

/** N ta ketma-ket element, faol yuza areaCm2, tok I (A). */
export function stack(N: number, areaCm2: number, current: number): StackResult {
  const n = Math.max(1, Math.round(finite(N, 1)));
  const A = Math.max(1, finite(areaCm2, 1));
  const I = Math.max(0, finite(current));
  const i = I / A;
  const cellV = cellVoltage(i);
  const stackV = n * cellV;
  const power = stackV * I;
  const h2gps = ((n * I) / (2 * FARADAY)) * M_H2;
  return { i, cellV, stackV, power, heat: Math.max(0, n * I * (U_TN - cellV)), eta: cellV / U_TN, h2gps };
}

/** Maksimal quvvat nuqtasi (tok zichligi bo'yicha qidiruv). */
export function maxPowerPoint(N: number, areaCm2: number): StackResult {
  let best = stack(N, areaCm2, 0);
  for (let k = 1; k <= 400; k++) {
    const r = stack(N, areaCm2, ((CELL.iL * 0.999 * k) / 400) * Math.max(1, areaCm2));
    if (r.power > best.power) best = r;
  }
  return best;
}

/* ---------------- Avtomobil ---------------- */

export interface Vehicle {
  mass: number; // kg
  cdA: number; // m²
  crr: number;
  etaDrive: number; // inverter + motor + reduktor
  etaFc: number; // yoqilg'i elementi tizimi (LHV)
}

export const MIRAI_LIKE: Vehicle = { mass: 1900, cdA: 0.7, crr: 0.01, etaDrive: 0.9, etaFc: 0.5 };

/** Tekis yo'lda harakat qarshiligi, N: F = ½ρC_dA·v² + C_rr·m·g. */
export function roadForce(v: number, car: Vehicle): number {
  const s = Math.max(0, finite(v));
  return 0.5 * 1.2 * car.cdA * s * s + car.crr * car.mass * 9.81;
}

/** Berilgan g'ildirak quvvatida (W) barqaror tezlik, m/s — bisection. */
export function steadySpeed(wheelPower: number, car: Vehicle): number {
  const P = Math.max(0, finite(wheelPower));
  if (P === 0) return 0;
  let lo = 0;
  let hi = 100;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (roadForce(mid, car) * mid > P) hi = mid;
    else lo = mid;
  }
  return lo;
}

/** H₂ sarfi, kg/100 km, berilgan tezlikda (m/s). */
export function h2Per100km(v: number, car: Vehicle): number {
  const s = Math.max(0, finite(v));
  if (s < 0.5) return 0;
  const pWheel = roadForce(s, car) * s;
  const pH2 = pWheel / car.etaDrive / car.etaFc; // W (LHV)
  const kgPerHour = pH2 / 1000 / LHV;
  return (kgPerHour / (s * 3.6)) * 100;
}
