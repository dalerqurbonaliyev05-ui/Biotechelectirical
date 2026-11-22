// Elementlar uchun umumiy yordamchilar: klemma ta’rifi, SVG yozuvlar, holat amallari, fazor hisoblari.

export const N3 = (uz, ru, en) => ({ uz, ru, en: en ?? ru ?? uz });

/** Klemma: id, yorliq (korpusdagi belgi), nomi, 2D joyi va simning chiqish yo‘nalishi. */
export const K = (id, yorliq, nomi, x, y, dx, dy, maks = 2) => ({ id, yorliq, nomi, xy: [x, y], dir2d: [dx, dy], maks });

export const yoz = (x, y, s, cls = 'd-txt', a = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${a}">${s}</text>`;
export const nomi = (y, s) => yoz(0, y, s, 'd-lbl');

/** Klemmalar yonidagi yorliqlar (klemmadan korpus ichkarisiga qarab). */
export function yorliqlar(kl, cls = 'd-txt d-mini', masofa = 15) {
  return kl.map((k) => {
    const [x, y] = k.xy, [dx, dy] = k.dir2d;
    const lx = x - dx * masofa, ly = y - dy * masofa + (dy === 0 ? 3.5 : dy > 0 ? 0 : 7);
    return yoz(lx.toFixed(1), ly.toFixed(1), k.yorliq, cls);
  }).join('');
}

/** Yoqish/o‘chirish amali (avtomat, kalit va h.k.). */
export function yoqAmal(h, q) {
  if (q === 'yoq') return { ...h, yoqilgan: true };
  if (q === 'och') return { ...h, yoqilgan: false };
  return { ...h, yoqilgan: !h.yoqilgan };
}

export const kat = (v) => Math.hypot(v[0], v[1]);
const burchak = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

/** Ikki chulg‘am kuchlanishi fazorlari bo‘yicha aylanish yo‘nalishi (A→B→C — oldinga). */
export function yonalishi(a, b) {
  let d = burchak(b) - burchak(a);
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d < 0 ? 'oldinga' : 'teskari';
}

/** Momentli (bosib turiladigan) tugma amallari. */
export function lahzaliAmal(h, q, kalit = 'bosilgan') {
  if (q === 'bosib_tur') return { ...h, [kalit]: true };
  if (q === 'qoyib_yubor') return { ...h, [kalit]: false };
  if (q === 'almash') return { ...h, [kalit]: !h[kalit] };
  return h;
}

export const FAZA = ['A', 'B', 'C'];
export const fazami = (f) => FAZA.includes(f || '');
