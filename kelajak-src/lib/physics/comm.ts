// Aloqa va ma'lumotlar bazasi uchun soddalashtirilgan (o'quv) modellar.
// Radio: log-masofaviy yo'qotish modeli — haqiqiy natija antenna, balandlik va shovqinga bog'liq, shuning uchun "taxminiy".

const finite = (v: number, fallback = 0): number => (Number.isFinite(v) ? v : fallback);

/** Erkin fazoda 1 m masofadagi yo'qotish: FSPL(1 m) = 20·lg(f, MGs) − 27,55 dB. */
export function fsplAt1m(fMHz: number): number {
  if (!(fMHz > 0)) return 0;
  return 20 * Math.log10(fMHz) - 27.55;
}

/** Yo'l yo'qotishi: PL(d) = FSPL(1 m) + 10·n·lg(d) + to'siq yo'qotishi, dB (d — metr). */
export function pathLossDb(dMeters: number, fMHz: number, exponent: number, obstacleDb = 0): number {
  const d = Math.max(1, finite(dMeters, 1));
  return fsplAt1m(fMHz) + 10 * Math.max(1, finite(exponent, 2)) * Math.log10(d) + Math.max(0, finite(obstacleDb));
}

/** Aloqa zaxirasi: margin = Ptx − PL − sezgirlik (dBm). Musbat bo'lsa paket yetib boradi. */
export function linkMarginDb(txDbm: number, sensitivityDbm: number, pathLoss: number): number {
  return finite(txDbm - pathLoss - sensitivityDbm);
}

export type Quality = "alo" | "yaxshi" | "zaif" | "yoq";

/** Zaxira bo'yicha sifat: >20 dB a'lo, 10…20 yaxshi, 0…10 zaif, <0 aloqa yo'q. */
export function qualityFromMargin(margin: number): Quality {
  if (margin > 20) return "alo";
  if (margin > 10) return "yaxshi";
  if (margin >= 0) return "zaif";
  return "yoq";
}

/** Yiliga ma'lumotlar hajmi (bayt): har `intervalSec` soniyada bitta yozuv, `meters` ta hisoblagich. */
export function storageBytesPerYear(intervalSec: number, meters: number, bytesPerRow: number): number {
  if (!(intervalSec > 0)) return 0;
  const rows = (365 * 24 * 3600) / intervalSec;
  return finite(rows * Math.max(0, meters) * Math.max(0, bytesPerRow));
}

/** Baytni o'qiladigan ko'rinishga: 1 KB = 1024 B. */
export function formatBytes(b: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let v = Math.max(0, finite(b));
  let k = 0;
  while (v >= 1024 && k < units.length - 1) {
    v /= 1024;
    k++;
  }
  const s = v >= 100 || k === 0 ? Math.round(v).toString() : v.toFixed(1);
  return `${s.replace(".", ",")} ${units[k]}`;
}
