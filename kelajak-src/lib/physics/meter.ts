// Aqlli hisoblagich uchun hisob-kitoblar. Sof funksiyalar (React va DOM'siz), shuning uchun
// `node --test` bilan to'g'ridan-to'g'ri tekshiriladi. Birliklar: V, A, Om, W, VAr, VA, s, Hz.
// Har bir funksiya noto'g'ri kirishda (NaN, manfiy, nolga bo'lish) xato bermaydi — xavfsiz qiymat qaytaradi.

const finite = (v: number, fallback = 0): number => (Number.isFinite(v) ? v : fallback);

/** Tok transformatori (CT) ikkilamchi toki: I₂ = I₁ · I₂nom / I₁nom (masalan 100:5 → I₁/20). */
export function ctSecondary(i1: number, primaryRated: number, secondaryRated: number): number {
  if (!(primaryRated > 0) || !(secondaryRated > 0)) return 0;
  return finite((i1 * secondaryRated) / primaryRated);
}

/** Yuklama (burden) rezistoridagi kuchlanish: U = I₂ · R. */
export function burdenVoltage(i2: number, rBurden: number): number {
  return finite(i2 * Math.max(0, rBurden));
}

/** Kuchlanish bo'lgich: Uchiqish = Ukirish · R₂ / (R₁ + R₂). */
export function dividerOut(uIn: number, r1: number, r2: number): number {
  const sum = r1 + r2;
  if (!(sum > 0) || r1 < 0 || r2 < 0) return 0;
  return finite((uIn * r2) / sum);
}

/** Sinusoidal kattalikning amplituda qiymati: Um = √2 · Urms. */
export const peakFromRms = (rms: number): number => finite(rms * Math.SQRT2);

/** ADC ning eng kichik qadami (LSB): Vref / 2ᴺ. */
export function adcLsb(vref: number, bits: number): number {
  const n = Math.round(bits);
  if (!(vref > 0) || !(n >= 1) || n > 24) return 0;
  return vref / 2 ** n;
}

/** Kuchlanishni N bitli ADC kodiga aylantiradi (0 … 2ᴺ−1, chegaradan chiqsa kesiladi). */
export function adcCode(v: number, vref: number, bits: number): number {
  const lsb = adcLsb(vref, bits);
  if (lsb === 0) return 0;
  const max = 2 ** Math.round(bits) - 1;
  return Math.min(max, Math.max(0, Math.round(finite(v) / lsb)));
}

/** ADC kodidan qaytarilgan kuchlanish (kvantlangan qiymat). */
export function quantize(v: number, vref: number, bits: number): number {
  return adcCode(v, vref, bits) * adcLsb(vref, bits);
}

/** Ideal ADC ning signal/kvantlash shovqini nisbati: SQNR ≈ 6,02·N + 1,76 dB. */
export const sqnrDb = (bits: number): number => 6.02 * bits + 1.76;

/**
 * Namuna olish chastotasi fs bo'lganda f chastotali signal qaysi chastotada "ko'rinadi" (aliasing).
 * fs ≥ 2f bo'lsa natija f ga teng (Nayqvist-Kotelnikov sharti bajarilgan).
 */
export function aliasFrequency(f: number, fs: number): number {
  if (!(fs > 0) || !(f >= 0)) return 0;
  return Math.abs(f - fs * Math.round(f / fs));
}

export interface PowerResult {
  urms: number;
  irms: number;
  /** Aktiv quvvat, W */
  p: number;
  /** To'liq quvvat, VA */
  s: number;
  /** Reaktiv quvvat, VAr (ishora: + induktiv, − sig'imli; yuklama turidan beriladi) */
  q: number;
  /** Quvvat koeffitsiyenti cosφ = P/S */
  pf: number;
}

/**
 * ESP32 dagi kabi namunalar bo'yicha hisob: Urms = √(Σu²/N), Irms = √(Σi²/N), P = Σ(u·i)/N,
 * S = Urms·Irms, Q = √(S² − P²), cosφ = P/S. `qSign` — Q ishorasi (+1 induktiv, −1 sig'imli).
 */
export function powerFromSamples(u: ArrayLike<number>, i: ArrayLike<number>, qSign = 1): PowerResult {
  const n = Math.min(u.length, i.length);
  if (n === 0) return { urms: 0, irms: 0, p: 0, s: 0, q: 0, pf: 0 };
  let su = 0;
  let si = 0;
  let sp = 0;
  for (let k = 0; k < n; k++) {
    const uk = finite(u[k]);
    const ik = finite(i[k]);
    su += uk * uk;
    si += ik * ik;
    sp += uk * ik;
  }
  const urms = Math.sqrt(su / n);
  const irms = Math.sqrt(si / n);
  const p = sp / n;
  const s = urms * irms;
  const q = Math.sqrt(Math.max(0, s * s - p * p)) * (qSign < 0 ? -1 : 1);
  const pf = s > 0 ? Math.max(-1, Math.min(1, p / s)) : 0;
  return { urms, irms, p, s, q, pf };
}

/**
 * Bir davr uchun u(t) va i(t) namunalari. φ > 0 — tok kuchlanishdan orqada (induktiv), φ < 0 — oldinda (sig'imli).
 * `harmonic3` — tokdagi 3-garmonika ulushi (0…1), nochiziqli yuklamani ko'rsatish uchun.
 */
export function sineSamples(urms: number, irms: number, phiDeg: number, n = 200, harmonic3 = 0): { u: Float64Array; i: Float64Array } {
  const count = Math.max(4, Math.round(n));
  const u = new Float64Array(count);
  const i = new Float64Array(count);
  const um = peakFromRms(urms);
  const h = Math.max(0, Math.min(1, finite(harmonic3)));
  // 3-garmonika qo'shilganda ham Irms o'zgarmasin: asosiy va garmonika amplitudalarini normallashtiramiz.
  const scale = 1 / Math.sqrt(1 + h * h);
  const im = peakFromRms(irms) * scale;
  const phi = (finite(phiDeg) * Math.PI) / 180;
  for (let k = 0; k < count; k++) {
    const wt = (2 * Math.PI * k) / count;
    u[k] = um * Math.sin(wt);
    i[k] = im * (Math.sin(wt - phi) + h * Math.sin(3 * (wt - phi)));
  }
  return { u, i };
}

/** Energiya: W = P · t. Natija kVt·soat (P — W, t — s). */
export function energyKWh(pW: number, seconds: number): number {
  return finite((pW * seconds) / 3_600_000);
}

/** Soat tungi zonaga tushadimi (masalan 23 → 7, yarim tundan o'tadigan oraliq ham to'g'ri ishlaydi). */
export function isNightHour(hour: number, nightStart: number, nightEnd: number): boolean {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (nightStart === nightEnd) return false;
  return nightStart < nightEnd ? h >= nightStart && h < nightEnd : h >= nightStart || h < nightEnd;
}

export interface TariffResult {
  dayKWh: number;
  nightKWh: number;
  totalKWh: number;
  cost: number;
}

/**
 * Bir sutkalik 24 soatlik sarf (kVt·soat) bo'yicha narx. `twoZone` = false bo'lsa hammasi `dayRate` bilan.
 * Tarif so'm/kVt·soat da beriladi.
 */
export function tariffCost(hourlyKWh: ArrayLike<number>, dayRate: number, nightRate: number, twoZone: boolean, nightStart = 23, nightEnd = 7): TariffResult {
  let day = 0;
  let night = 0;
  for (let h = 0; h < hourlyKWh.length; h++) {
    const e = Math.max(0, finite(hourlyKWh[h]));
    if (twoZone && isNightHour(h, nightStart, nightEnd)) night += e;
    else day += e;
  }
  const dr = Math.max(0, finite(dayRate));
  const nr = Math.max(0, finite(nightRate));
  return { dayKWh: day, nightKWh: night, totalKWh: day + night, cost: day * dr + night * (twoZone ? nr : dr) };
}

export interface Appliance {
  id: string;
  name: string;
  /** Nominal quvvat, W */
  power: number;
  count: number;
  /** Sutkada ishlash soatlari (0…24) */
  hours: number;
  /** Ishlash oynasi boshlanadigan soat (0…23) */
  start: number;
  /** Ishlash davridagi o'rtacha yuklanish (0…1), masalan muzlatgich kompressori ~0,4 */
  duty: number;
}

/** Asboblar ro'yxatidan 24 soatlik o'rtacha quvvat profili (W) — har soatga tushgan ulush hisobga olinadi. */
export function loadProfile(apps: readonly Appliance[]): number[] {
  const prof = new Array<number>(24).fill(0);
  for (const a of apps) {
    const hours = Math.max(0, Math.min(24, finite(a.hours)));
    const p = Math.max(0, finite(a.power)) * Math.max(0, Math.round(finite(a.count))) * Math.max(0, Math.min(1, finite(a.duty, 1)));
    if (hours === 0 || p === 0) continue;
    let left = hours;
    let h = ((Math.floor(finite(a.start)) % 24) + 24) % 24;
    while (left > 0) {
      const part = Math.min(1, left);
      prof[h] += p * part;
      left -= part;
      h = (h + 1) % 24;
    }
  }
  return prof;
}
