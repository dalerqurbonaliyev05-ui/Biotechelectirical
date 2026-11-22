// Avtomatika va o‘lchash: suzgichli sath datchigi, voltmetr, ampermetr, vaqt kaliti (taymer), solenoid klapan,
// klemma qatori, chastota o‘zgartirgich, radio pult.
import { N3, K, yoz, nomi, yorliqlar, lahzaliAmal } from './_umumiy.js';

// ---------- Suzgich (sath datchigi): COM, NO (suv yuqori), NC (suv past) ----------
export const suzgich = {
  tur: 'suzgich',
  belgi: 'SL',
  nomi: N3('Suzgichli sath datchigi', 'Поплавковый датчик уровня', 'Float level switch'),
  klemmalar: () => [
    K('COM', 'COM', N3('umumiy (COM)', 'общий (COM)', 'common (COM)'), -40, -86, 0, -1),
    K('NO', 'NO', N3('NO — suv yuqori', 'НО — уровень высокий', 'NO — level high'), 0, -86, 0, -1),
    K('NC', 'NC', N3('NC — suv past', 'НЗ — уровень низкий', 'NC — level low'), 40, -86, 0, -1),
  ],
  boshlangich: () => ({ suv: 'past' }),
  ichki(h, p, hammasi) {
    const r = [];
    if (h.suv === 'yuqori' || hammasi) r.push(['COM', 'NO']);
    if (h.suv !== 'yuqori' || hammasi) r.push(['COM', 'NC']);
    return r;
  },
  tugmalar: { suv: 'almash' },
  amal: (h, q) => ({ ...h, suv: q === 'yuqori' || q === 'past' ? q : h.suv === 'yuqori' ? 'past' : 'yuqori' }),
  hisobla: (ctx, h) => ({ natija: { holatlar: [h.suv === 'yuqori' ? 'suv_yuqori' : 'suv_past'] } }),
  svg({ el, holat }) {
    const y = holat.suv === 'yuqori';
    const sath = y ? -36 : 24;
    return `<g data-amal="suv" class="d-btn">
      <path d="M-70 -60 V64 H70 V-60" fill="#f4f4f2" stroke="#c9c9c4" stroke-width="3"/>
      <rect x="-66" y="${sath}" width="132" height="${62 - sath}" fill="#2a8fd6"/>
      <path d="M-20 -60 V-44 Q-20 ${sath - 8} 16 ${sath - 12}" fill="none" stroke="#1b1b1f" stroke-width="2.5"/>
      <rect x="12" y="${sath - 26}" width="28" height="18" rx="9" fill="#1f6fd6" stroke="#0b3e86"/>
      ${yoz(0, 52, y ? '▼' : '▲', 'd-txt d-oq')}</g>
      <rect x="-30" y="-74" width="20" height="16" rx="2" fill="#c0612c"/>
      ${yorliqlar(suzgich.klemmalar(), 'd-txt d-mini', -14)}${nomi(84, `${el.id} · ${y ? 'HIGH' : 'LOW'}`)}`;
  },
};

// ---------- Voltmetr: 1–2 ----------
export const voltmetr = {
  tur: 'voltmetr',
  belgi: 'PV',
  nomi: N3('Voltmetr', 'Вольтметр', 'Voltmeter'),
  klemmalar: () => [
    K('1', '1', N3('1', '1', '1'), -24, 62, 0, 1),
    K('2', '2', N3('2', '2', '2'), 24, 62, 0, 1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: '1', b: '2', R: 1e6, nom: 'v' }],
  hisobla(ctx) {
    const U = ctx.kuchlanish('1', '2');
    return { natija: { U, holatlar: [U >= 50 ? 'kuchlanish_bor' : 'kuchlanish_yoq'] } };
  },
  svg({ el, natija }) {
    const U = natija?.U || 0;
    const a = (-150 + Math.min(1, U / 450) * 120) * Math.PI / 180;
    return `<rect class="d-body" x="-56" y="-56" width="112" height="104" rx="4"/>
      <path d="M-40 -6 A44 44 0 0 1 40 -6" fill="none" stroke="#1b1b1f" stroke-width="1.5"/>
      ${yoz(-38, -32, 'V', 'd-txt d-katta')}
      <line x1="0" y1="24" x2="${(52 * Math.cos(a)).toFixed(1)}" y2="${(24 + 52 * Math.sin(a)).toFixed(1)}" stroke="#d93a32" stroke-width="2"/>
      ${yoz(0, 40, `${Math.round(U)} V`, 'd-txt')}${nomi(84, el.id)}`;
  },
};

// ---------- Ampermetr: 1–2 (ketma-ket ulanadi) ----------
export const ampermetr = {
  tur: 'ampermetr',
  belgi: 'PA',
  nomi: N3('Ampermetr', 'Амперметр', 'Ammeter'),
  klemmalar: () => [
    K('1', '1', N3('1', '1', '1'), -24, 62, 0, 1),
    K('2', '2', N3('2', '2', '2'), 24, 62, 0, 1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  kichikR: () => [{ a: '1', b: '2', R: 0.01, nom: 'I' }],
  hisobla(ctx) {
    const I = ctx.tok('I');
    return { natija: { I, holatlar: [I >= 0.05 ? 'tok_bor' : 'tok_yoq'] } };
  },
  svg({ el, natija }) {
    const I = natija?.I || 0;
    const a = (-150 + Math.min(1, I / 10) * 120) * Math.PI / 180;
    return `<rect class="d-body" x="-56" y="-56" width="112" height="104" rx="4"/>
      <path d="M-40 -6 A44 44 0 0 1 40 -6" fill="none" stroke="#1b1b1f" stroke-width="1.5"/>
      ${yoz(-38, -32, 'A', 'd-txt d-katta')}
      <line x1="0" y1="24" x2="${(52 * Math.cos(a)).toFixed(1)}" y2="${(24 + 52 * Math.sin(a)).toFixed(1)}" stroke="#d93a32" stroke-width="2"/>
      ${yoz(0, 40, `${I.toFixed(1)} A`, 'd-txt')}${nomi(84, el.id)}`;
  },
};

// ---------- Vaqt kaliti (raqamli taymer): ta’minot L–N, kontakt 1–2 (jadval bo‘yicha) ----------
export const vaqt_kaliti = {
  tur: 'vaqt_kaliti',
  belgi: 'KT',
  nomi: N3('Vaqt kaliti (raqamli taymer)', 'Таймер (реле времени суточное)', 'Digital time switch'),
  klemmalar: () => [
    K('L', 'L', N3('ta’minot L', 'питание L', 'supply L'), -36, 64, 0, 1),
    K('N', 'N', N3('ta’minot N', 'питание N', 'supply N'), -12, 64, 0, 1),
    K('1', '1', N3('kontakt 1', 'контакт 1', 'contact 1'), 12, 64, 0, 1),
    K('2', '2', N3('kontakt 2', 'контакт 2', 'contact 2'), 36, 64, 0, 1),
  ],
  boshlangich: () => ({ jadval: false, tortilgan: false }),
  ichki: (h, p, hammasi) => (h.tortilgan || hammasi ? [['1', '2']] : []),
  yuklamalar: () => [{ a: 'L', b: 'N', R: 50000, nom: 'p' }],
  tugmalar: { jadval: 'almash' },
  amal(h, q) {
    if (q === 'yoq') return { ...h, jadval: true };
    if (q === 'och') return { ...h, jadval: false };
    return { ...h, jadval: !h.jadval };
  },
  hisobla(ctx, h) {
    const quvvat = ctx.kuchlanish('L', 'N') >= 170;
    const t = quvvat && h.jadval;
    return { holat: { ...h, tortilgan: t }, natija: { quvvat, holatlar: [t ? 'tortilgan' : 'qoyilgan', h.jadval ? 'jadval_on' : 'jadval_off'] } };
  },
  svg({ el, holat, natija }) {
    const q = natija?.quvvat;
    return `<rect class="d-body" x="-50" y="-60" width="100" height="112" rx="4"/>
      <rect x="-38" y="-48" width="76" height="28" rx="2" fill="${q ? '#b8d4b0' : '#7d8a7a'}"/>
      ${yoz(0, -29, q ? (holat.jadval ? 'ON  08:00' : 'OFF 22:00') : '--:--', 'd-txt')}
      <g data-amal="jadval" class="d-btn"><circle cx="0" cy="8" r="14" fill="#d93a32"/>${yoz(0, 12, holat.jadval ? 'ON' : 'OFF', 'd-txt d-mini d-oq')}</g>
      ${yorliqlar(vaqt_kaliti.klemmalar())}${nomi(84, el.id)}`;
  },
};

// ---------- Solenoid klapan: L, N, PE ----------
export const solenoid = {
  tur: 'solenoid',
  belgi: 'YV',
  nomi: N3('Solenoid klapan', 'Электромагнитный клапан', 'Solenoid valve'),
  klemmalar: () => [
    K('L', 'L', N3('faza (L)', 'фаза (L)', 'phase (L)'), -26, -60, 0, -1),
    K('N', 'N', N3('nol (N)', 'ноль (N)', 'neutral (N)'), 0, -60, 0, -1),
    K('PE', 'PE', N3('korpus (PE)', 'корпус (PE)', 'frame (PE)'), 26, -60, 0, -1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: 'L', b: 'N', R: 6600, nom: 'g' }],
  hisobla(ctx) {
    const on = ctx.kuchlanish('L', 'N') >= 170;
    return { natija: { ochiq: on, holatlar: [on ? 'ochiq' : 'yopiq'] } };
  },
  svg({ el, natija }) {
    const on = natija?.ochiq;
    return `<rect x="-22" y="-44" width="44" height="40" rx="4" fill="#2b2e34"/>${yoz(0, -20, on ? 'ON' : 'OFF', 'd-txt d-mini d-oq')}
      <rect x="-54" y="0" width="108" height="30" rx="6" fill="#c9a24a" stroke="#8c6d27"/>
      <rect x="-64" y="4" width="14" height="22" fill="#b38f3e"/><rect x="50" y="4" width="14" height="22" fill="#b38f3e"/>
      ${on ? '<path d="M66 15 h18" stroke="#2a8fd6" stroke-width="6" stroke-linecap="round" class="d-oqim"/>' : ''}
      ${yorliqlar(solenoid.klemmalar(), 'd-txt d-mini', -14)}${nomi(52, `${el.id} · ${on ? 'OPEN' : 'CLOSED'}`)}`;
  },
};

// ---------- Klemma qatori: har bir ustundagi yuqori va pastki klemma ulangan ----------
export const klemma_qator = {
  tur: 'klemma_qator',
  belgi: 'XT',
  nomi: N3('Klemma qatori', 'Клеммная колодка', 'Terminal strip'),
  standart: { n: 6 },
  passiv: true,
  klemmalar(p) {
    const r = [];
    for (let i = 1; i <= p.n; i++) {
      const x = (i - (p.n + 1) / 2) * 26;
      r.push(K(`a${i}`, String(i), N3(`${i}-klemma (yuqori)`, `клемма ${i} (верх)`, `terminal ${i} (top)`), x, -30, 0, -1));
      r.push(K(`b${i}`, String(i), N3(`${i}-klemma (pastki)`, `клемма ${i} (низ)`, `terminal ${i} (bottom)`), x, 30, 0, 1));
    }
    return r;
  },
  boshlangich: () => ({}),
  ichki(h, p) {
    const r = [];
    for (let i = 1; i <= p.n; i++) r.push([`a${i}`, `b${i}`]);
    return r;
  },
  svg({ el, param }) {
    const w = param.n * 26 + 20;
    let s = `<rect x="${-w / 2}" y="-44" width="${w}" height="88" rx="4" fill="#2b2e34"/>`;
    for (let i = 1; i <= param.n; i++) {
      const x = (i - (param.n + 1) / 2) * 26;
      s += `<rect x="${x - 11}" y="-40" width="22" height="80" rx="2" fill="#3a3e46"/>${yoz(x, 4, i, 'd-txt d-mini d-oq')}`;
    }
    return s + nomi(64, el.id);
  },
};

// ---------- Chastota o‘zgartirgich: R, S, T, PE (kirish), U, V, W (chiqish), DI1 (oldinga), DI2 (orqaga), COM ----------
export const chastota_ozgartirgich = {
  tur: 'chastota_ozgartirgich',
  belgi: 'UZ',
  nomi: N3('Chastota o‘zgartirgich', 'Частотный преобразователь', 'Variable frequency drive'),
  klemmalar: () => [
    K('R', 'R', N3('kirish R (L1)', 'вход R (L1)', 'input R (L1)'), -60, -100, 0, -1),
    K('S', 'S', N3('kirish S (L2)', 'вход S (L2)', 'input S (L2)'), -32, -100, 0, -1),
    K('T', 'T', N3('kirish T (L3)', 'вход T (L3)', 'input T (L3)'), -4, -100, 0, -1),
    K('PE', 'PE', N3('himoya (PE)', 'защитный (PE)', 'earth (PE)'), 24, -100, 0, -1),
    K('U', 'U', N3('chiqish U', 'выход U', 'output U'), -60, 100, 0, 1),
    K('V', 'V', N3('chiqish V', 'выход V', 'output V'), -32, 100, 0, 1),
    K('W', 'W', N3('chiqish W', 'выход W', 'output W'), -4, 100, 0, 1),
    K('DI1', 'DI1', N3('DI1 — oldinga', 'DI1 — вперёд', 'DI1 — forward'), 88, 20, 1, 0),
    K('DI2', 'DI2', N3('DI2 — orqaga', 'DI2 — назад', 'DI2 — reverse'), 88, 44, 1, 0),
    K('COM', 'COM', N3('COM (umumiy)', 'COM (общий)', 'COM'), 88, 68, 1, 0),
  ],
  boshlangich: () => ({ ishlaydi: false, yonalish: null }),
  ichki: () => [],
  dinamikManba: true,
  manba: (h) => (h.ishlaydi ? { U: 'A', V: h.yonalish === 'teskari' ? 'C' : 'B', W: h.yonalish === 'teskari' ? 'B' : 'C' } : {}),
  yuklamalar: () => [{ a: 'R', b: 'S', R: 10000, nom: 'rs' }, { a: 'S', b: 'T', R: 10000, nom: 'st' }],
  hisobla(ctx) {
    const kirish = ctx.kuchlanish('R', 'S') >= 300 && ctx.kuchlanish('S', 'T') >= 300 && ctx.kuchlanish('T', 'R') >= 300;
    const f = ctx.bir('DI1', 'COM'), r = ctx.bir('DI2', 'COM');
    const yon = f && !r ? 'oldinga' : r && !f ? 'teskari' : null;
    const ishlaydi = kirish && !!yon;
    return {
      holat: { ishlaydi, yonalish: ishlaydi ? yon : null },
      natija: { kirish, holatlar: [ishlaydi ? 'ishlaydi' : 'toxtagan', ...(ishlaydi ? [yon] : []), ...(kirish ? [] : ['kuchlanish_yoq'])] },
    };
  },
  svg({ el, holat, natija }) {
    const on = holat.ishlaydi, k = natija?.kirish;
    return `<rect x="-78" y="-116" width="156" height="232" rx="6" fill="#2b2e34" stroke="#4a4e57"/>
      <rect x="-60" y="-70" width="100" height="36" rx="3" fill="${k ? '#f4f4f2' : '#6b7079'}"/>
      ${yoz(-10, -46, k ? (on ? '50.00' : '0.00') : '', 'd-txt d-katta')}
      ${yoz(-10, -16, on ? (holat.yonalish === 'teskari' ? 'REV' : 'FWD') : 'STOP', 'd-txt d-mini d-oq')}
      <circle cx="-40" cy="10" r="8" fill="#22c55e"/><circle cx="-10" cy="10" r="8" fill="#9aa0a8"/><circle cx="20" cy="10" r="8" fill="#d93a32"/>
      ${yorliqlar(chastota_ozgartirgich.klemmalar(), 'd-txt d-mini d-oq')}${nomi(136, `${el.id} · VFD`)}`;
  },
};

// ---------- Radio pult (qabul qilgich + qo‘l pulti): ta’minot L–N, chiqish COM–K1 (▲), COM–K2 (▼) ----------
export const radio_pult = {
  tur: 'radio_pult',
  belgi: 'A',
  nomi: N3('Radio pult', 'Радиопульт', 'Radio remote'),
  klemmalar: () => [
    K('L', 'L', N3('ta’minot L', 'питание L', 'supply L'), -84, 96, 0, 1),
    K('N', 'N', N3('ta’minot N', 'питание N', 'supply N'), -60, 96, 0, 1),
    K('COM', 'COM', N3('umumiy (COM)', 'общий (COM)', 'common (COM)'), -36, 96, 0, 1),
    K('K1', 'K1', N3('K1 — ▲ (oldinga)', 'K1 — ▲ (вперёд)', 'K1 — ▲ (forward)'), -12, 96, 0, 1),
    K('K2', 'K2', N3('K2 — ▼ (orqaga)', 'K2 — ▼ (назад)', 'K2 — ▼ (reverse)'), 12, 96, 0, 1),
  ],
  boshlangich: () => ({ quvvat: false, k1: false, k2: false }),
  ichki(h, p, hammasi) {
    const r = [];
    if ((h.quvvat && h.k1) || hammasi) r.push(['COM', 'K1']);
    if ((h.quvvat && h.k2) || hammasi) r.push(['COM', 'K2']);
    return r;
  },
  yuklamalar: () => [{ a: 'L', b: 'N', R: 20000, nom: 'p' }],
  tugmalar: { k1: 'lahzali', k2: 'lahzali' },
  amal: (h, q, tugma) => lahzaliAmal(h, q, tugma === 'k2' ? 'k2' : 'k1'),
  hisobla(ctx, h) {
    const quvvat = ctx.kuchlanish('L', 'N') >= 170;
    return { holat: { ...h, quvvat }, natija: { holatlar: [quvvat ? 'kuchlanish_bor' : 'kuchlanish_yoq'] } };
  },
  svg({ el, holat }) {
    const btn = (id, y, t) => `<g data-amal="${id}" class="d-btn"><rect x="62" y="${y}" width="44" height="30" rx="5" fill="${holat[id] ? '#ffb020' : '#2b2e34'}"/>${yoz(84, y + 20, t, 'd-txt d-oq')}</g>`;
    return `<rect x="-100" y="-80" width="104" height="160" rx="10" fill="#f07c22" stroke="#b35610"/>
      <rect x="-82" y="-60" width="68" height="70" rx="4" fill="#f4f4f2"/>${yoz(-48, -20, 'RX', 'd-txt d-katta')}
      <circle cx="-48" cy="40" r="6" fill="${holat.quvvat ? '#22c55e' : '#5b1a17'}"/>
      <rect x="52" y="-84" width="64" height="168" rx="12" fill="#f07c22" stroke="#b35610"/>
      <rect x="80" y="-112" width="8" height="30" rx="3" fill="#1b1b1f"/>
      ${btn('k1', -50, '▲')}${btn('k2', -12, '▼')}
      ${yorliqlar(radio_pult.klemmalar(), 'd-txt d-mini', 13)}${nomi(116, `${el.id} · RX + TX`)}`;
  },
};
