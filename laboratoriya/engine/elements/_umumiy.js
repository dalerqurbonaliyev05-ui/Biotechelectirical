// Elementlar uchun umumiy yordamchilar: klemma ta’rifi, SVG yozuvlar, holat amallari, fazor hisoblari.

export const N3 = (uz, ru, en) => ({ uz, ru, en: en ?? ru ?? uz });

/** Klemma: id, yorliq (korpusdagi belgi), nomi, 2D joyi va simning chiqish yo‘nalishi. */
export const K = (id, yorliq, nomi, x, y, dx, dy, maks = 2) => ({ id, yorliq, nomi, xy: [x, y], dir2d: [dx, dy], maks });

export const yoz = (x, y, s, cls = 'd-txt', a = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${a}">${s}</text>`;
export const nomi = (y, s) => yoz(0, y, s, 'd-lbl');

/** Klemma turi (yorlig‘i bo‘yicha): NO/NC kontakt, umumiy, g‘altak, faza, nol, PE. Rang shunga qarab beriladi. */
export function klemmaTuri(yorliq) {
  const y = String(yorliq).toUpperCase();
  if (/^NO\d*$/.test(y)) return 'no';
  if (/^NC\d*$/.test(y)) return 'nc';
  if (/^COM\d*$/.test(y)) return 'com';
  if (/^A[12]$/.test(y)) return 'galtak';
  if (/^(L1|T1|U|U1|U2|R)$/.test(y)) return 'f1';
  if (/^(L2|T2|V|V1|V2|S)$/.test(y)) return 'f2';
  if (/^(L3|T3|W|W1|W2|T)$/.test(y)) return 'f3';
  if (/^L/.test(y)) return 'faza';
  if (/^N/.test(y)) return 'nol';
  if (y === 'PE' || y === 'E') return 'pe';
  // IEC raqamlash: ikkinchi raqam 1–2 yoki 5–6 — NC, 3–4 yoki 7–8 — NO
  if (/^\d\d$/.test(y)) return '1256'.includes(y[1]) ? 'nc' : 'no';
  return 'boshqa';
}
export const KLEMMA_RANG = {
  no: '#16a34a', nc: '#dc2626', com: '#475569', galtak: '#7c3aed', f1: '#a16207', f2: '#15803d', f3: '#c81e1e',
  faza: '#b45309', nol: '#1d4ed8', pe: '#65a30d', boshqa: '#334155',
};

/** Klemmalar yorliqlari (rasmdagidek): oq "plashka" ustida klemma turiga mos rangli nom.
 *  Yuqori/pastki klemmalar — nom korpus ichida (masofa > 0) yoki klemma yonida (masofa < 0, klemma korpusdan tashqarida);
 *  yon klemmalar — nom tashqarida, sim ustida. */
export function yorliqlar(kl, _cls, masofa = 16) {
  return kl.map((k) => {
    const [x, y] = k.xy, [dx, dy] = k.dir2d;
    const rang = KLEMMA_RANG[klemmaTuri(k.yorliq)];
    const s = String(k.yorliq);
    const w = s.length * 6.4 + 6;
    let cx, cy;
    if (dy === 0 && dx !== 0) { cx = x + dx * (9 + w / 2); cy = y - 10; }
    else { cx = x; cy = y - dy * Math.max(14, Math.abs(masofa)); }
    return `<g class="d-klg"><rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - 6.5).toFixed(1)}" width="${w.toFixed(1)}" height="13" rx="2" fill="#fff" stroke="${rang}" stroke-width=".9"/>`
      + `<text class="d-kl" x="${cx.toFixed(1)}" y="${(cy + 3.6).toFixed(1)}" text-anchor="middle" fill="${rang}">${s}</text></g>`;
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
