// Uy va yoritish elementlari: lampochka, o‘tish (ikki yo‘nalishli) kalit, rozetka, lyuminessent lampa, drossel,
// starter, karta kaliti (mehmonxona).
import { N3, K, yoz, nomi, yorliqlar } from './_umumiy.js';

// ---------- Lampochka (cho‘g‘lanma lampa): L, N ----------
export const lampochka = {
  tur: 'lampochka',
  belgi: 'HL',
  nomi: N3('Lampochka', 'Лампа накаливания', 'Light bulb'),
  standart: { quvvat: 60 },
  klemmalar: () => [
    K('L', 'L', N3('faza (L)', 'фаза (L)', 'phase (L)'), -30, 54, -1, 0),
    K('N', 'N', N3('nol (N)', 'ноль (N)', 'neutral (N)'), 30, 54, 1, 0),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklama: { faza: 'L', nol: 'N' },
  yuklamalar: (h, p) => [{ a: 'L', b: 'N', R: (230 * 230) / p.quvvat, nom: 'lampa' }],
  hisobla(ctx) {
    const U = ctx.kuchlanish('L', 'N');
    const yonadi = U >= 170 && U <= 270;
    return { natija: { yonadi, U, holatlar: [U > 300 ? 'kuydi' : yonadi ? 'yonadi' : 'ochgan'] } };
  },
  svg({ el, param, natija }) {
    const on = natija?.yonadi;
    return `${on ? '<circle cx="0" cy="-16" r="60" class="d-nur" filter="url(#nur)"/>' : ''}
      <path d="M-26 -14 A30 30 0 1 1 26 -14 C22 0 16 10 14 22 L-14 22 C-16 10 -22 0 -26 -14 Z" class="d-kolba ${on ? 'on' : ''}"/>
      <path d="M-8 18 L-6 -6 L0 4 L6 -6 L8 18" fill="none" stroke="${on ? '#ff9d00' : '#9aa0a8'}" stroke-width="1.6"/>
      <rect x="-15" y="22" width="30" height="24" rx="3" fill="#b9bcc2"/><path d="M-15 28 H15 M-15 34 H15 M-15 40 H15" stroke="#8a8f98"/>
      <line x1="-30" y1="54" x2="-10" y2="46" stroke="#d93a32" stroke-width="3"/><line x1="30" y1="54" x2="10" y2="46" stroke="#1f6fd6" stroke-width="3"/>
      ${yorliqlar(lampochka.klemmalar(), 'd-txt d-mini', -14)}${nomi(80, `${el.id} · ${param.quvvat} W`)}`;
  },
};

// ---------- O‘tish kaliti (ikki yo‘nalishli): L umumiy, L1 yoki L2 ----------
export const kalit_2y = {
  tur: 'kalit_2y',
  belgi: 'SA',
  nomi: N3('O‘tish kaliti', 'Проходной выключатель', 'Two-way switch'),
  klemmalar: () => [
    K('L', 'L', N3('umumiy (L)', 'общий (L)', 'common (L)'), 0, -64, 0, -1),
    K('L1', 'L1', N3('chiqish L1', 'выход L1', 'output L1'), -26, 66, 0, 1),
    K('L2', 'L2', N3('chiqish L2', 'выход L2', 'output L2'), 26, 66, 0, 1),
  ],
  boshlangich: () => ({ poz: 'L1' }),
  ichki(h, p, hammasi) {
    if (hammasi) return [['L', 'L1'], ['L', 'L2']];
    return h.poz === 'L2' ? [['L', 'L2']] : [['L', 'L1']];
  },
  bosiladi: true,
  bosish: (h) => ({ ...h, poz: h.poz === 'L2' ? 'L1' : 'L2' }),
  amal: (h, q) => (q === 'L1' || q === 'L2' ? { ...h, poz: q } : { ...h, poz: h.poz === 'L2' ? 'L1' : 'L2' }),
  hisobla: (ctx, h) => ({ natija: { holatlar: [`poz_${h.poz}`] } }),
  svg({ el, holat }) {
    const p2 = holat.poz === 'L2';
    return `<rect class="d-body" x="-48" y="-48" width="96" height="100" rx="10"/>
      <rect class="d-face" x="-32" y="-34" width="64" height="72" rx="6"/>
      <line x1="0" y1="-48" x2="0" y2="-14" stroke="#d93a32" stroke-width="3"/>
      <line x1="0" y1="-14" x2="${p2 ? 20 : -20}" y2="24" stroke="#2a5fb0" stroke-width="3"/>
      <line x1="-26" y1="24" x2="-26" y2="52" stroke="${p2 ? '#9aa0a8' : '#d93a32'}" stroke-width="3"/>
      <line x1="26" y1="24" x2="26" y2="52" stroke="${p2 ? '#d93a32' : '#9aa0a8'}" stroke-width="3"/>
      ${yorliqlar(kalit_2y.klemmalar(), 'd-txt d-mini', -14)}${nomi(98, `${el.id} · ${holat.poz}`)}`;
  },
};

// ---------- Rozetka: L, N, PE ----------
export const rozetka = {
  tur: 'rozetka',
  belgi: 'XS',
  nomi: N3('Rozetka', 'Розетка', 'Socket outlet'),
  klemmalar: () => [
    K('N', 'N', N3('nol (N)', 'ноль (N)', 'neutral (N)'), -28, -56, 0, -1),
    K('PE', 'PE', N3('himoya (PE)', 'защитный (PE)', 'earth (PE)'), 0, -56, 0, -1),
    K('L', 'L', N3('faza (L)', 'фаза (L)', 'phase (L)'), 28, -56, 0, -1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: 'L', b: 'N', R: 1e6, nom: 'u' }],
  hisobla(ctx) {
    const U = ctx.kuchlanish('L', 'N');
    return { natija: { U, holatlar: [U >= 190 ? 'kuchlanish_bor' : 'kuchlanish_yoq'] } };
  },
  svg({ el, natija }) {
    const on = natija?.holatlar?.[0] === 'kuchlanish_bor';
    return `<rect class="d-body" x="-46" y="-42" width="92" height="92" rx="10"/>
      <circle cx="0" cy="6" r="30" fill="#ecece8" stroke="#c9c9c4"/>
      <circle cx="-11" cy="6" r="4.5" fill="#2b2e34"/><circle cx="11" cy="6" r="4.5" fill="#2b2e34"/>
      <rect x="-3" y="-24" width="6" height="8" fill="#b9bcc2"/><rect x="-3" y="28" width="6" height="8" fill="#b9bcc2"/>
      <circle cx="30" cy="-28" r="4" fill="${on ? '#22c55e' : '#9aa0a8'}"/>
      ${yorliqlar(rozetka.klemmalar(), 'd-txt d-mini', -14)}${nomi(68, el.id)}`;
  },
};

// ---------- Lyuminessent lampa (trubka): A1–A2 (1-tola), B1–B2 (2-tola) ----------
export const lyum_lampa = {
  tur: 'lyum_lampa',
  belgi: 'EL',
  nomi: N3('Lyuminessent lampa', 'Люминесцентная лампа', 'Fluorescent tube'),
  klemmalar: () => [
    K('A1', 'A1', N3('1-tola A1', 'нить 1 A1', 'filament A1'), -160, -12, -1, 0),
    K('A2', 'A2', N3('1-tola A2', 'нить 1 A2', 'filament A2'), -160, 12, -1, 0),
    K('B1', 'B1', N3('2-tola B1', 'нить 2 B1', 'filament B1'), 160, -12, 1, 0),
    K('B2', 'B2', N3('2-tola B2', 'нить 2 B2', 'filament B2'), 160, 12, 1, 0),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: 'A1', b: 'A2', R: 10, nom: 'a' }, { a: 'B1', b: 'B2', R: 10, nom: 'b' }],
  hisobla(ctx) {
    const ia = ctx.tok('a'), ib = ctx.tok('b');
    const kuydi = ia > 3 || ib > 3;
    const yonadi = !kuydi && ia >= 0.15 && ib >= 0.15;
    return { natija: { yonadi, holatlar: [kuydi ? 'kuydi' : yonadi ? 'yonadi' : 'ochgan'] } };
  },
  svg({ el, natija }) {
    const on = natija?.yonadi;
    return `${on ? '<rect x="-150" y="-26" width="300" height="52" rx="26" class="d-nur" filter="url(#nur)"/>' : ''}
      <rect x="-146" y="-12" width="292" height="24" rx="12" fill="${on ? '#fff8d6' : '#e9ecef'}" stroke="#c9c9c4"/>
      <rect x="-156" y="-16" width="16" height="32" rx="3" fill="#b9bcc2"/><rect x="140" y="-16" width="16" height="32" rx="3" fill="#b9bcc2"/>
      ${yorliqlar(lyum_lampa.klemmalar(), 'd-txt d-mini d-oq', -16)}${nomi(36, `${el.id} · 36 W`)}`;
  },
};

// ---------- Drossel (ballast): 1–2 ----------
export const drossel = {
  tur: 'drossel',
  belgi: 'LL',
  nomi: N3('Drossel (ballast)', 'Дроссель (балласт)', 'Ballast choke'),
  klemmalar: () => [
    K('1', '1', N3('1', '1', '1'), -76, 0, -1, 0),
    K('2', '2', N3('2', '2', '2'), 76, 0, 1, 0),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: '1', b: '2', R: 150, nom: 'd' }],
  svg: ({ el }) => `<rect x="-60" y="-22" width="120" height="44" rx="4" fill="#e3e6ea" stroke="#9aa0a8"/>
    <rect x="-44" y="-14" width="88" height="28" rx="2" fill="#f4f4f2" stroke="#c9c9c4"/>${yoz(0, 4, 'BALLAST', 'd-txt d-mini')}
    ${nomi(42, `${el.id} · 36 W`)}`,
};

// ---------- Starter: 1–2 ----------
export const starter = {
  tur: 'starter',
  belgi: 'SF',
  nomi: N3('Starter', 'Стартер', 'Starter'),
  klemmalar: () => [
    K('1', '1', N3('1', '1', '1'), -16, 46, 0, 1),
    K('2', '2', N3('2', '2', '2'), 16, 46, 0, 1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: '1', b: '2', R: 20, nom: 's' }],
  svg: ({ el }) => `<rect class="d-body" x="-26" y="-40" width="52" height="76" rx="12"/>
    <circle cx="0" cy="-6" r="16" fill="#e5484d"/>${nomi(64, el.id)}`,
};

// ---------- Karta kaliti (mehmonxona): L → L1 karta qo‘yilganda; N — indikator uchun ----------
export const karta_kalit = {
  tur: 'karta_kalit',
  belgi: 'SA',
  nomi: N3('Karta kaliti', 'Карточный выключатель', 'Key-card switch'),
  klemmalar: () => [
    K('L', 'L', N3('kirish (L)', 'вход (L)', 'input (L)'), -32, 62, 0, 1),
    K('L1', 'L1', N3('chiqish (L1)', 'выход (L1)', 'output (L1)'), 0, 62, 0, 1),
    K('N', 'N', N3('nol (N)', 'ноль (N)', 'neutral (N)'), 32, 62, 0, 1),
  ],
  boshlangich: () => ({ karta: false }),
  ichki: (h, p, hammasi) => (h.karta || hammasi ? [['L', 'L1']] : []),
  yuklamalar: () => [{ a: 'L', b: 'N', R: 1e5, nom: 'led' }],
  tugmalar: { karta: 'almash' },
  bosiladi: true,
  bosish: (h) => ({ ...h, karta: !h.karta }),
  amal: (h, q) => ({ ...h, karta: q === 'qoy' ? true : q === 'ol' ? false : !h.karta }),
  hisobla: (ctx, h) => ({ natija: { holatlar: [h.karta ? 'karta_bor' : 'karta_yoq'] } }),
  svg({ el, holat }) {
    const k = holat.karta;
    return `<rect class="d-body" x="-56" y="-50" width="112" height="100" rx="8"/>
      <rect x="-34" y="-30" width="68" height="10" rx="2" fill="#2b2e34"/>
      <g data-amal="karta" class="d-btn"><rect x="-26" y="${k ? -44 : -78}" width="52" height="40" rx="4" fill="#9a5b2a"/>${yoz(0, k ? -20 : -54, 'CARD', 'd-txt d-mini d-oq')}</g>
      ${yorliqlar(karta_kalit.klemmalar(), 'd-txt d-mini', 14)}${nomi(86, `${el.id} · ${k ? 'ON' : 'OFF'}`)}`;
  },
};
