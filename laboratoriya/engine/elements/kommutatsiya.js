// Kommutatsiya qurilmalari: kontaktor, modulli kontaktor, oraliq rele, vaqt relesi (taymer), issiqlik relesi.
// G‘altak — yuklama (A1–A2); kuchlanish yetarli bo‘lsa "tortilgan" holatga o‘tadi va kontaktlar almashadi.
import { N3, K, yoz, nomi, yorliqlar } from './_umumiy.js';

const galtakHisob = (ctx, h, p, qoshimcha = {}) => {
  const U = ctx.kuchlanish('A1', 'A2');
  const Un = p.galtak || 230;
  // Nominaldan ancha yuqori kuchlanish (masalan 230 V g‘altak 400 V ga ulansa) — g‘altak kuyadi va boshqa tortilmaydi.
  const kuydi = h.kuydi || U > Un * 1.35;
  const t = !kuydi && U >= Un * 0.75;
  return { holat: { ...h, tortilgan: t, ...(kuydi ? { kuydi: true } : {}) }, natija: { U, holatlar: [t ? 'tortilgan' : 'qoyilgan', ...(kuydi ? ['kuydi'] : [])], ...qoshimcha } };
};

// ---------- Kontaktor: L1–T1, L2–T2, L3–T3 (kuch), 13–14 va 33–34 (NO), 21–22 va 41–42 (NC), g‘altak A1–A2 ----------
export const kontaktor = {
  tur: 'kontaktor',
  belgi: 'KM',
  nomi: N3('Kontaktor', 'Контактор', 'Contactor'),
  standart: { galtak: 230, nominal: 25 },
  klemmalar: () => [
    K('A1', 'A1', N3('g‘altak A1', 'катушка A1', 'coil A1'), -64, -86, 0, -1),
    K('L1', 'L1', N3('kuch kirish L1', 'силовой вход L1', 'main L1'), -30, -86, 0, -1),
    K('L2', 'L2', N3('kuch kirish L2', 'силовой вход L2', 'main L2'), 0, -86, 0, -1),
    K('L3', 'L3', N3('kuch kirish L3', 'силовой вход L3', 'main L3'), 30, -86, 0, -1),
    K('A2', 'A2', N3('g‘altak A2', 'катушка A2', 'coil A2'), 64, -86, 0, -1),
    K('T1', 'T1', N3('kuch chiqish T1', 'силовой выход T1', 'main T1'), -30, 86, 0, 1),
    K('T2', 'T2', N3('kuch chiqish T2', 'силовой выход T2', 'main T2'), 0, 86, 0, 1),
    K('T3', 'T3', N3('kuch chiqish T3', 'силовой выход T3', 'main T3'), 30, 86, 0, 1),
    // Yordamchi kontaktlar qatorlarda (rasmdagidek): har bir qator — bitta kontakt, chap va o‘ng uchi
    K('13', 'NO', N3('1-NO kontakt, chap uchi (13)', 'НО контакт 1, левый (13)', 'NO contact 1, left (13)'), -88, -40, -1, 0),
    K('14', 'NO', N3('1-NO kontakt, o‘ng uchi (14)', 'НО контакт 1, правый (14)', 'NO contact 1, right (14)'), 88, -40, 1, 0),
    K('21', 'NC', N3('1-NC kontakt, chap uchi (21)', 'НЗ контакт 1, левый (21)', 'NC contact 1, left (21)'), -88, -14, -1, 0),
    K('22', 'NC', N3('1-NC kontakt, o‘ng uchi (22)', 'НЗ контакт 1, правый (22)', 'NC contact 1, right (22)'), 88, -14, 1, 0),
    K('41', 'NC', N3('2-NC kontakt, chap uchi (41)', 'НЗ контакт 2, левый (41)', 'NC contact 2, left (41)'), -88, 14, -1, 0),
    K('42', 'NC', N3('2-NC kontakt, o‘ng uchi (42)', 'НЗ контакт 2, правый (42)', 'NC contact 2, right (42)'), 88, 14, 1, 0),
    K('33', 'NO', N3('2-NO kontakt, chap uchi (33)', 'НО контакт 2, левый (33)', 'NO contact 2, left (33)'), -88, 40, -1, 0),
    K('34', 'NO', N3('2-NO kontakt, o‘ng uchi (34)', 'НО контакт 2, правый (34)', 'NO contact 2, right (34)'), 88, 40, 1, 0),
  ],
  boshlangich: () => ({ tortilgan: false }),
  ichki(h, p, hammasi) {
    const r = [];
    if (h.tortilgan || hammasi) r.push(['L1', 'T1'], ['L2', 'T2'], ['L3', 'T3'], ['13', '14'], ['33', '34']);
    if (!h.tortilgan || hammasi) r.push(['21', '22'], ['41', '42']);
    return r;
  },
  yuklamalar: () => [{ a: 'A1', b: 'A2', R: 4400, nom: 'galtak' }],
  hisobla: galtakHisob,
  svg({ el, holat }) {
    const t = holat.tortilgan;
    return `<rect x="-78" y="-100" width="156" height="200" rx="8" fill="#2b2e34" stroke="#4a4e57"/>
      <rect x="-70" y="-74" width="140" height="18" rx="3" fill="#1d1f24"/><rect x="-70" y="56" width="140" height="18" rx="3" fill="#1d1f24"/>
      <rect x="-40" y="-36" width="80" height="62" rx="5" fill="#3a3e46"/>
      <rect x="-14" y="${t ? -8 : -26}" width="28" height="18" rx="3" fill="${t ? '#22c55e' : '#6b7079'}"/>
      ${yoz(0, 40, t ? 'ON' : 'OFF', 'd-txt d-mini d-oq')}
      ${yorliqlar(kontaktor.klemmalar(), 'd-txt d-mini d-oq')}${nomi(120, `${el.id} · ${t ? 'ON' : 'OFF'}`)}`;
  },
};

// ---------- Modulli kontaktor (2 NO): 1–2, 3–4, g‘altak A1–A2 ----------
export const modulli_kontaktor = {
  tur: 'modulli_kontaktor',
  belgi: 'KM',
  nomi: N3('Modulli kontaktor', 'Модульный контактор', 'Modular contactor'),
  standart: { galtak: 230 },
  klemmalar: () => [
    K('A1', 'A1', N3('g‘altak A1', 'катушка A1', 'coil A1'), -30, -66, 0, -1),
    K('1', 'L1', N3('kirish L1 (1)', 'вход L1 (1)', 'input L1 (1)'), -10, -66, 0, -1),
    K('3', 'L2', N3('kirish L2 (3)', 'вход L2 (3)', 'input L2 (3)'), 10, -66, 0, -1),
    K('A2', 'A2', N3('g‘altak A2', 'катушка A2', 'coil A2'), 30, -66, 0, -1),
    K('2', 'T1', N3('chiqish T1 (2)', 'выход T1 (2)', 'output T1 (2)'), -10, 66, 0, 1),
    K('4', 'T2', N3('chiqish T2 (4)', 'выход T2 (4)', 'output T2 (4)'), 10, 66, 0, 1),
  ],
  boshlangich: () => ({ tortilgan: false }),
  ichki: (h, p, hammasi) => (h.tortilgan || hammasi ? [['1', '2'], ['3', '4']] : []),
  yuklamalar: () => [{ a: 'A1', b: 'A2', R: 5300, nom: 'galtak' }],
  hisobla: galtakHisob,
  svg({ el, holat }) {
    const t = holat.tortilgan;
    return `<rect class="d-body" x="-40" y="-80" width="80" height="160" rx="4"/>
      <rect class="d-face" x="-30" y="-36" width="60" height="64" rx="3"/>
      <circle cx="0" cy="-6" r="13" fill="#d93a32"/>${yoz(0, -2, 'KM', 'd-txt d-mini d-oq')}
      <rect x="-22" y="16" width="10" height="6" fill="${t ? '#22c55e' : '#9aa0a8'}"/>
      ${yorliqlar(modulli_kontaktor.klemmalar())}${nomi(100, `${el.id} · ${t ? 'ON' : 'OFF'}`)}`;
  },
};

// ---------- Oraliq rele: 2 ta almashtirib ulovchi kontakt (11/12/14, 21/22/24), g‘altak A1–A2 ----------
export const rele = {
  tur: 'rele',
  belgi: 'KL',
  nomi: N3('Oraliq rele', 'Промежуточное реле', 'Control relay'),
  standart: { galtak: 230 },
  klemmalar: () => [
    K('12', 'NC1', N3('1-guruh NC (12)', 'группа 1 НЗ (12)', 'group 1 NC (12)'), -51, -72, 0, -1),
    K('14', 'NO1', N3('1-guruh NO (14)', 'группа 1 НО (14)', 'group 1 NO (14)'), -17, -72, 0, -1),
    K('22', 'NC2', N3('2-guruh NC (22)', 'группа 2 НЗ (22)', 'group 2 NC (22)'), 17, -72, 0, -1),
    K('24', 'NO2', N3('2-guruh NO (24)', 'группа 2 НО (24)', 'group 2 NO (24)'), 51, -72, 0, -1),
    K('11', 'COM1', N3('1-guruh umumiy COM (11)', 'группа 1 общий COM (11)', 'group 1 common COM (11)'), -51, 72, 0, 1),
    K('21', 'COM2', N3('2-guruh umumiy COM (21)', 'группа 2 общий COM (21)', 'group 2 common COM (21)'), -17, 72, 0, 1),
    K('A1', 'A1', N3('g‘altak A1', 'катушка A1', 'coil A1'), 17, 72, 0, 1),
    K('A2', 'A2', N3('g‘altak A2', 'катушка A2', 'coil A2'), 51, 72, 0, 1),
  ],
  boshlangich: () => ({ tortilgan: false }),
  ichki(h, p, hammasi) {
    const r = [];
    if (h.tortilgan || hammasi) r.push(['11', '14'], ['21', '24']);
    if (!h.tortilgan || hammasi) r.push(['11', '12'], ['21', '22']);
    return r;
  },
  yuklamalar: () => [{ a: 'A1', b: 'A2', R: 6000, nom: 'galtak' }],
  hisobla: galtakHisob,
  svg({ el, holat }) {
    const t = holat.tortilgan;
    return `<rect x="-70" y="-84" width="140" height="168" rx="6" fill="#2b2e34" stroke="#4a4e57"/>
      <rect x="-38" y="-50" width="76" height="86" rx="6" fill="#dfe9f2" opacity=".85"/>
      <rect x="-24" y="-36" width="48" height="30" rx="3" fill="#c9a24a"/>
      <circle cx="0" cy="16" r="7" fill="${t ? '#22c55e' : '#d93a32'}"/>
      ${yorliqlar(rele.klemmalar(), 'd-txt d-mini d-oq')}${nomi(104, `${el.id} · ${t ? 'ON' : 'OFF'}`)}`;
  },
};

// ---------- Vaqt relesi (kechikib ulanish, TON): 15 umumiy, 16 NC, 18 NO, g‘altak A1–A2 ----------
export const vaqt_relesi = {
  tur: 'vaqt_relesi',
  belgi: 'KT',
  nomi: N3('Vaqt relesi (TON)', 'Реле времени (TON)', 'On-delay timer'),
  standart: { kechikish: 5, galtak: 230 },
  klemmalar: () => [
    K('15', 'COM', N3('umumiy COM (15)', 'общий COM (15)', 'common COM (15)'), -32, -78, 0, -1),
    K('16', 'NC', N3('NC 16 (kechikib ochiladi)', 'НЗ 16 (размык. с задержкой)', 'NC 16 (delayed open)'), 0, -78, 0, -1),
    K('18', 'NO', N3('NO 18 (kechikib yopiladi)', 'НО 18 (замык. с задержкой)', 'NO 18 (delayed close)'), 32, -78, 0, -1),
    K('A1', 'A1', N3('g‘altak A1', 'катушка A1', 'coil A1'), -20, 78, 0, 1),
    K('A2', 'A2', N3('g‘altak A2', 'катушка A2', 'coil A2'), 20, 78, 0, 1),
  ],
  boshlangich: () => ({ tortilgan: false, boshlandi: null }),
  ichki(h, p, hammasi) {
    const r = [];
    if (h.tortilgan || hammasi) r.push(['15', '18']);
    if (!h.tortilgan || hammasi) r.push(['15', '16']);
    return r;
  },
  yuklamalar: () => [{ a: 'A1', b: 'A2', R: 8000, nom: 'galtak' }],
  hisobla(ctx, h, p) {
    const U = ctx.kuchlanish('A1', 'A2');
    if (U < (p.galtak || 230) * 0.75) return { holat: { tortilgan: false, boshlandi: null }, natija: { holatlar: ['qoyilgan'], qoldi: p.kechikish, ulush: 0 } };
    const b = h.boshlandi ?? ctx.vaqt;
    const otdi = ctx.vaqt - b;
    const t = otdi >= p.kechikish - 1e-6;
    return {
      holat: { tortilgan: t, boshlandi: b },
      natija: { holatlar: [t ? 'tortilgan' : 'hisoblamoqda'], kutmoqda: !t, qoldi: Math.max(0, p.kechikish - otdi), ulush: Math.min(1, otdi / p.kechikish) },
    };
  },
  svg({ el, holat, param, natija }) {
    const u = natija?.ulush || 0;
    const a = -Math.PI / 2 + u * 2 * Math.PI;
    const x = (26 * Math.cos(a)).toFixed(1), y = (-6 + 26 * Math.sin(a)).toFixed(1);
    const yoy = u > 0 && u < 1 ? `<path d="M0 -32 A26 26 0 ${u > 0.5 ? 1 : 0} 1 ${x} ${y}" fill="none" stroke="#ff7a3d" stroke-width="5"/>` : '';
    return `<rect class="d-body" x="-50" y="-92" width="100" height="184" rx="6"/>
      <circle cx="0" cy="-6" r="34" fill="#1d1f24"/><circle cx="0" cy="-6" r="26" fill="#f4f4f2"/>${yoy}
      <line x1="0" y1="-6" x2="${x}" y2="${y}" stroke="#d93a32" stroke-width="2.5"/>
      ${yoz(0, 44, `${param.kechikish} s`, 'd-txt')}
      <circle cx="34" cy="-60" r="4" fill="${holat.tortilgan ? '#22c55e' : natija?.kutmoqda ? '#f5a524' : '#9aa0a8'}"/>
      ${yorliqlar(vaqt_relesi.klemmalar())}${nomi(112, `${el.id} · ${param.kechikish} s`)}`;
  },
};

// ---------- Issiqlik relesi (ortiqcha yukdan himoya): L–T kuch, 95–96 NC, 97–98 NO, TEST/RESET ----------
export const issiqlik_relesi = {
  tur: 'issiqlik_relesi',
  belgi: 'KK',
  nomi: N3('Issiqlik relesi', 'Тепловое реле', 'Thermal overload relay'),
  klemmalar: () => [
    K('L1', 'L1', N3('kirish L1 (1)', 'вход L1 (1)', 'in L1 (1)'), -32, -60, 0, -1),
    K('L2', 'L2', N3('kirish L2 (3)', 'вход L2 (3)', 'in L2 (3)'), 0, -60, 0, -1),
    K('L3', 'L3', N3('kirish L3 (5)', 'вход L3 (5)', 'in L3 (5)'), 32, -60, 0, -1),
    K('T1', 'T1', N3('chiqish T1 (2)', 'выход T1 (2)', 'out T1 (2)'), -32, 60, 0, 1),
    K('T2', 'T2', N3('chiqish T2 (4)', 'выход T2 (4)', 'out T2 (4)'), 0, 60, 0, 1),
    K('T3', 'T3', N3('chiqish T3 (6)', 'выход T3 (6)', 'out T3 (6)'), 32, 60, 0, 1),
    // Yordamchi kontaktlar qatorlarda: NC (95–96) va NO (97–98), chap va o‘ng uchi
    K('95', 'NC', N3('NC kontakt, chap uchi (95)', 'НЗ контакт, левый (95)', 'NC contact, left (95)'), -76, 0, -1, 0),
    K('96', 'NC', N3('NC kontakt, o‘ng uchi (96)', 'НЗ контакт, правый (96)', 'NC contact, right (96)'), 76, 0, 1, 0),
    K('97', 'NO', N3('NO kontakt, chap uchi (97)', 'НО контакт, левый (97)', 'NO contact, left (97)'), -76, 30, -1, 0),
    K('98', 'NO', N3('NO kontakt, o‘ng uchi (98)', 'НО контакт, правый (98)', 'NO contact, right (98)'), 76, 30, 1, 0),
  ],
  boshlangich: () => ({ ishladi: false }),
  ichki(h, p, hammasi) {
    const r = [['L1', 'T1'], ['L2', 'T2'], ['L3', 'T3']];
    if (!h.ishladi || hammasi) r.push(['95', '96']);
    if (h.ishladi || hammasi) r.push(['97', '98']);
    return r;
  },
  doimiy: () => [['L1', 'T1'], ['L2', 'T2'], ['L3', 'T3'], ['95', '96']],
  tugmalar: { test: 'almash', reset: 'almash' },
  amal(h, q, tugma) {
    if (tugma === 'test' || q === 'test') return { ...h, ishladi: true };
    if (tugma === 'reset' || q === 'reset') return { ...h, ishladi: false };
    return { ...h, ishladi: !h.ishladi };
  },
  hisobla: (ctx, h) => ({ natija: { holatlar: [h.ishladi ? 'ishladi' : 'normal'] } }),
  svg({ el, holat }) {
    const i = holat.ishladi;
    return `<rect x="-64" y="-74" width="128" height="148" rx="6" fill="#2b2e34" stroke="#4a4e57"/>
      <rect x="-56" y="-34" width="104" height="66" rx="4" fill="#e9edf1"/>
      <circle cx="-30" cy="-2" r="16" fill="#2a5fb0"/><line x1="-30" y1="-2" x2="-20" y2="-12" stroke="#fff" stroke-width="3"/>
      <g data-amal="test" class="d-btn"><rect x="0" y="-22" width="42" height="18" rx="3" fill="#d93a32"/>${yoz(21, -9, 'TEST', 'd-txt d-mini d-oq')}</g>
      <g data-amal="reset" class="d-btn"><rect x="0" y="2" width="42" height="18" rx="3" fill="#2a5fb0"/>${yoz(21, 15, 'RESET', 'd-txt d-mini d-oq')}</g>
      <rect x="-50" y="18" width="40" height="8" fill="${i ? '#d93a32' : '#22c55e'}"/>
      ${yorliqlar(issiqlik_relesi.klemmalar(), 'd-txt d-mini d-oq')}${nomi(96, `${el.id} · ${i ? 'TRIP' : 'OK'}`)}`;
  },
};
