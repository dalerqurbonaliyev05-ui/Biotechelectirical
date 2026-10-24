// Simsiz energiya uzatish (induktiv, seriya-seriya kompensatsiya) uchun hisob-kitoblar.
// Sof funksiyalar; birliklar: H, F, Om, Hz, V, A, W, m. Noto'g'ri kirishda xato bermaydi.

const finite = (v: number, fallback = 0): number => (Number.isFinite(v) ? v : fallback);
const TAU = 2 * Math.PI;

/** Rezonans chastotasi: f₀ = 1 / (2π√(LC)). */
export function resonantFreq(L: number, C: number): number {
  if (!(L > 0) || !(C > 0)) return 0;
  return 1 / (TAU * Math.sqrt(L * C));
}

/** Berilgan f₀ uchun kerakli sig'im: C = 1 / ((2πf)² · L). */
export function resonantCap(L: number, f: number): number {
  if (!(L > 0) || !(f > 0)) return 0;
  return 1 / ((TAU * f) ** 2 * L);
}

/** O'zaro induktivlik: M = k·√(L₁L₂). */
export function mutualInductance(k: number, L1: number, L2: number): number {
  return Math.max(0, finite(k)) * Math.sqrt(Math.max(0, L1) * Math.max(0, L2));
}

/** Sifat koeffitsiyenti: Q = ωL / R. */
export function qualityFactor(f: number, L: number, R: number): number {
  if (!(R > 0)) return 0;
  return finite((TAU * f * L) / R);
}

/**
 * Bog'lanish koeffitsiyenti — o'quv modeli: ikki koaksial g'altak uchun k(d) = k₀ · (1 + (d/r)²)^(−3/2).
 * Uzoqda k ∝ (r/d)³ — "yaqin maydon" ning tez so'nishi. r — g'altak radiusi, k₀ — tutash holatdagi k.
 */
export function couplingK(d: number, r: number, k0 = 0.7): number {
  if (!(r > 0)) return 0;
  const x = Math.max(0, finite(d)) / r;
  return Math.max(0, Math.min(1, k0)) * (1 + x * x) ** -1.5;
}

/** Maksimal FIK (optimal yuklamada): x = k²Q₁Q₂, η_max = x / (1 + √(1 + x))². */
export function etaMax(k: number, Q1: number, Q2: number): number {
  const x = Math.max(0, finite(k) ** 2 * Math.max(0, Q1) * Math.max(0, Q2));
  return x / (1 + Math.sqrt(1 + x)) ** 2;
}

/**
 * Yassi spiral g'altak induktivligi (Wheeler, ferritsiz, taxminiy):
 * L[µH] = r²N² / (8r + 11w), r — o'rtacha radius, w — o'ram eni (dyuymda).
 * Kirish: N o'ram, tashqi diametr va o'ramlar qadami — mm.
 */
export function spiralInductance(N: number, outerMm: number, pitchMm: number): { L: number; innerMm: number; ok: boolean; wireM: number } {
  const n = Math.max(0, Math.round(finite(N)));
  const dOut = Math.max(0, finite(outerMm));
  const dIn = dOut - 2 * n * Math.max(0, finite(pitchMm));
  const ok = n > 0 && dIn > 0;
  const inner = Math.max(0, dIn);
  const rIn = (dOut + inner) / 4 / 25.4; // o'rtacha radius, dyuym
  const w = (dOut - inner) / 2 / 25.4;
  const denom = 8 * rIn + 11 * w;
  const L = denom > 0 ? ((rIn * rIn * n * n) / denom) * 1e-6 : 0;
  const wireM = (Math.PI * ((dOut + inner) / 2) * n) / 1000;
  return { L, innerMm: dIn, ok, wireM };
}

/* ---------------- Kompleks sonlar (SS zanjir uchun) ---------------- */

interface Cx {
  re: number;
  im: number;
}
const cx = (re: number, im = 0): Cx => ({ re, im });
const add = (a: Cx, b: Cx): Cx => cx(a.re + b.re, a.im + b.im);
const mul = (a: Cx, b: Cx): Cx => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const div = (a: Cx, b: Cx): Cx => {
  const d = b.re * b.re + b.im * b.im || 1e-30;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const abs2 = (a: Cx): number => a.re * a.re + a.im * a.im;

export interface SSParams {
  /** Manba kuchlanishi (asosiy garmonika, rms), V */
  Vs: number;
  f: number;
  L1: number;
  C1: number;
  R1: number;
  L2: number;
  C2: number;
  R2: number;
  RL: number;
  k: number;
}

export interface SSResult {
  /** Yuklamadagi quvvat, W */
  PL: number;
  /** Manbadan olinayotgan aktiv quvvat, W */
  Pin: number;
  eta: number;
  I1: number;
  I2: number;
  /** Yuklamadagi kuchlanish (rms), V */
  VL: number;
}

/**
 * Seriya-seriya (SS) kompensatsiyali induktiv uzatish: fazor tahlili.
 * Z₁ = R₁ + j(ωL₁ − 1/ωC₁), Z₂ = R₂ + R_L + j(ωL₂ − 1/ωC₂),
 * I₁ = V / (Z₁ + (ωM)²/Z₂), I₂ = jωM·I₁ / Z₂, P_L = |I₂|²·R_L.
 * C ≤ 0 bo'lsa — kompensatsiya yo'q (kondensator qisqa tutashtirilgan deb olinadi).
 */
export function ssLink(p: SSParams): SSResult {
  const w = TAU * Math.max(1, finite(p.f, 1));
  const xc = (C: number) => (C > 0 ? 1 / (w * C) : 0);
  const Z1 = cx(Math.max(1e-6, p.R1), w * p.L1 - xc(p.C1));
  const Z2 = cx(Math.max(1e-6, p.R2 + p.RL), w * p.L2 - xc(p.C2));
  const M = mutualInductance(p.k, p.L1, p.L2);
  const wM = w * M;
  const Zr = div(cx(wM * wM), Z2); // qaytarilgan (reflected) impedans
  const I1 = div(cx(Math.max(0, p.Vs)), add(Z1, Zr));
  const I2 = div(mul(cx(0, wM), I1), Z2);
  const PL = abs2(I2) * Math.max(0, p.RL);
  const Pin = Math.max(0, p.Vs) * I1.re; // V haqiqiy deb olingan: P = V·Re(I₁)
  return {
    PL: finite(PL),
    Pin: finite(Pin),
    eta: Pin > 0 ? Math.min(1, PL / Pin) : 0,
    I1: Math.sqrt(abs2(I1)),
    I2: Math.sqrt(abs2(I2)),
    VL: Math.sqrt(abs2(I2)) * Math.max(0, p.RL),
  };
}

/** To'g'ri burchakli to'lqin (±V) asosiy garmonikasi amplitudasi: 4V/π. Yarim ko'prikda V = U_dc/2. */
export function squareFundamental(vAmp: number, dutyHalf = 0.5): number {
  // dutyHalf — har yarim davrda kalit yoqilgan ulush (0…0,5); 0,5 — to'liq to'g'ri burchak.
  const d = Math.max(0, Math.min(0.5, finite(dutyHalf)));
  return ((4 * Math.max(0, vAmp)) / Math.PI) * Math.sin(Math.PI * d);
}

/** Ko'prikli to'g'rilagich: U_dc ≈ U_m − 2·U_f; pulsatsiya ΔU ≈ I / (2f·C). */
export function bridgeRectifier(vPeak: number, vf: number, iLoad: number, f: number, C: number): { vdc: number; ripple: number } {
  const vdcPeak = Math.max(0, finite(vPeak) - 2 * Math.max(0, vf));
  const ripple = C > 0 && f > 0 ? Math.max(0, iLoad) / (2 * f * C) : vdcPeak;
  const r = Math.min(vdcPeak, ripple);
  return { vdc: Math.max(0, vdcPeak - r / 2), ripple: r };
}
