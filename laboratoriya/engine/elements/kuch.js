// Kuch qurilmalari: uch fazali manba, avtomatlar (MCB/MCCB/saqlagich), rubilnik, difavtomat, hisoblagich.
import { N3, K, yoz, nomi, yorliqlar, yoqAmal, kat } from './_umumiy.js';

// ---------- Uch fazali tarmoq kirishi: L1, L2, L3, N, PE ----------
export const manba_3f = {
  tur: 'manba_3f',
  belgi: 'X',
  nomi: N3('Tarmoq kirishi 380/220 V', 'Ввод сети 380/220 В', 'Mains input 400/230 V'),
  klemmalar: () => [
    K('L1', 'L1', N3('faza L1 (A)', 'фаза L1 (A)', 'phase L1'), -100, 0, 0, 1, 4),
    K('L2', 'L2', N3('faza L2 (B)', 'фаза L2 (B)', 'phase L2'), -50, 0, 0, 1, 4),
    K('L3', 'L3', N3('faza L3 (C)', 'фаза L3 (C)', 'phase L3'), 0, 0, 0, 1, 4),
    K('N', 'N', N3('nol (N)', 'ноль (N)', 'neutral (N)'), 50, 0, 0, 1, 4),
    K('PE', 'PE', N3('himoya (PE)', 'защитный (PE)', 'protective earth (PE)'), 100, 0, 0, 1, 4),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  manba: () => ({ L1: 'A', L2: 'B', L3: 'C', N: 'N', PE: 'PE' }),
  svg: ({ el }) => `
    <rect class="d-body" x="-124" y="-34" width="248" height="58" rx="5"/>
    <circle r="13" cx="-100" fill="#e0b400"/><circle r="13" cx="-50" fill="#1f9a4a"/><circle r="13" cx="0" fill="#d93a32"/>
    <circle r="13" cx="50" fill="#1f6fd6"/><circle r="13" cx="100" fill="url(#pe-chiziq)"/>
    ${yoz(-100, -18, 'L1')}${yoz(-50, -18, 'L2')}${yoz(0, -18, 'L3')}${yoz(50, -18, 'N')}${yoz(100, -18, 'PE')}
    ${nomi(44, `${el.id} · 380/220 V`)}`,
};

// ---------- Avtomat (1–4 qutb), MCCB, saqlagich ----------
const QADAM = 34;
function qutbKlemmalari(p) {
  const res = [];
  for (let i = 0; i < p.qutb; i++) {
    const x = (i - (p.qutb - 1) / 2) * QADAM;
    const y = p.yorliqlar?.[i];
    // Rasmdagidek nomlar: 3 fazali — kirish L1 L2 L3 (N), chiqish T1 T2 T3 (N); bir fazali — L / N
    const kir = y || (p.qutb >= 3 ? (i < 3 ? `L${i + 1}` : 'N') : (i === 0 ? 'L' : 'N'));
    const chiq = y || (p.qutb >= 3 ? (i < 3 ? `T${i + 1}` : 'N') : kir);
    res.push(K(String(2 * i + 1), kir, N3(`kirish ${kir} (${2 * i + 1})`, `вход ${kir} (${2 * i + 1})`, `line ${kir} (${2 * i + 1})`), x, -64, 0, -1));
    res.push(K(String(2 * i + 2), chiq, N3(`chiqish ${chiq} (${2 * i + 2})`, `выход ${chiq} (${2 * i + 2})`, `load ${chiq} (${2 * i + 2})`), x, 64, 0, 1));
  }
  return res;
}
function qutbUlanish(p) {
  const r = [];
  for (let i = 0; i < p.qutb; i++) r.push([String(2 * i + 1), String(2 * i + 2)]);
  return r;
}

function avtomatSvg({ el, holat, param }) {
  const n = param.qutb, w = n * QADAM + 6, on = holat.yoqilgan;
  const kl = qutbKlemmalari(param);
  if (param.korinish === 'mccb') {
    return `<rect class="d-body" x="${-w / 2 - 6}" y="-82" width="${w + 12}" height="164" rx="6"/>
      <rect class="d-face" x="-20" y="-34" width="40" height="64" rx="4"/>
      <rect class="d-slot" x="-8" y="-28" width="16" height="52" rx="3"/>
      <rect x="-7" y="${on ? -26 : 4}" width="14" height="18" rx="2" fill="#d93a32"/>
      ${yoz(0, 46, `${param.nominal}A`, 'd-txt d-mini')}${yorliqlar(kl)}
      ${nomi(104, `${el.id} · MCCB · ${on ? 'ON' : 'OFF'}`)}`;
  }
  if (param.korinish === 'saqlagich' || param.korinish === 'rubilnik') {
    let s = `<rect class="d-body" x="${-w / 2}" y="-80" width="${w}" height="160" rx="4"/>`;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * QADAM;
      s += param.korinish === 'saqlagich'
        ? `<rect x="${x - 9}" y="-30" width="18" height="60" rx="3" fill="${on ? '#f4f4f2' : '#d0d0cc'}" stroke="#9aa0a8"/><rect x="${x - 5}" y="-20" width="10" height="40" rx="2" fill="${on ? '#e0b400' : '#9aa0a8'}"/>`
        : `<rect class="d-slot" x="${x - 6}" y="-30" width="12" height="60" rx="2"/>`;
    }
    if (param.korinish === 'rubilnik') s += `<rect x="${-w / 2 + 4}" y="${on ? -34 : 18}" width="${w - 8}" height="12" rx="3" fill="#d93a32"/>`;
    return s + yorliqlar(kl) + nomi(100, `${el.id} · ${on ? 'ON' : 'OFF'}`);
  }
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * QADAM;
    s += `<rect class="d-body" x="${x - QADAM / 2 + 1}" y="-78" width="${QADAM - 2}" height="156" rx="3"/>`;
  }
  s += `<rect class="d-slot" x="${-w / 2 + 6}" y="-22" width="${w - 12}" height="34" rx="3"/>
    <rect x="${-w / 2 + 8}" y="${on ? -20 : -4}" width="${w - 16}" height="14" rx="2" fill="#e0b400" stroke="#9c7d00"/>
    <rect x="-6" y="16" width="12" height="4" fill="${on ? '#e5484d' : '#22a35a'}"/>
    ${yoz(0, 35, `${param.xarakteristika}${param.nominal}`, 'd-txt d-katta')}${yorliqlar(kl)}`;
  return s + nomi(100, `${el.id} · ${on ? 'ON' : 'OFF'}`);
}

export const avtomat = {
  tur: 'avtomat',
  belgi: 'QF',
  nomi: N3('Avtomatik o‘chirgich', 'Автоматический выключатель', 'Circuit breaker'),
  standart: { qutb: 3, nominal: 16, xarakteristika: 'C', korinish: 'mcb' },
  klemmalar: qutbKlemmalari,
  boshlangich: () => ({ yoqilgan: false }),
  ichki: (h, p, hammasi) => (h.yoqilgan || hammasi ? qutbUlanish(p) : []),
  himoya: true,
  bosiladi: true,
  bosish: (h) => ({ ...h, yoqilgan: !h.yoqilgan }),
  amal: (h, q) => yoqAmal(h, q),
  hisobla: (ctx, h) => ({ natija: { holatlar: [h.yoqilgan ? 'yoqilgan' : 'ochgan'] } }),
  svg: avtomatSvg,
};

export const rubilnik = {
  ...avtomat,
  tur: 'rubilnik',
  belgi: 'QS',
  nomi: N3('Rubilnik (ajratgich)', 'Рубильник (разъединитель)', 'Disconnector'),
  standart: { qutb: 3, nominal: 63, korinish: 'rubilnik' },
  himoya: false,
};

// ---------- Difavtomat (RCBO, 2 qutb): qisqa tutashuv va sizish tokidan himoya ----------
export const difavtomat = {
  tur: 'difavtomat',
  belgi: 'QF',
  nomi: N3('Difavtomat (RCBO)', 'Дифавтомат (АВДТ)', 'RCBO'),
  standart: { nominal: 16, xarakteristika: 'C', dI: 30 },
  klemmalar: () => [
    K('1', 'L', N3('kirish L', 'вход L', 'line L'), -17, -64, 0, -1),
    K('N1', 'N', N3('kirish N', 'вход N', 'line N'), 17, -64, 0, -1),
    K('2', 'L', N3('chiqish L', 'выход L', 'load L'), -17, 64, 0, 1),
    K('N2', 'N', N3('chiqish N', 'выход N', 'load N'), 17, 64, 0, 1),
  ],
  boshlangich: () => ({ yoqilgan: false }),
  ichki: () => [],
  kichikR: (h) => (h.yoqilgan ? [{ a: '1', b: '2', R: 0.01, nom: 'L' }, { a: 'N1', b: 'N2', R: 0.01, nom: 'N' }] : []),
  himoya: true,
  bosiladi: true,
  tugmalar: { test: 'almash' },
  bosish: (h) => ({ ...h, yoqilgan: !h.yoqilgan }),
  amal: (h, q, tugma) => (tugma === 'test' ? { ...h, yoqilgan: false } : yoqAmal(h, q)),
  hisobla(ctx, h, p) {
    if (!h.yoqilgan) return { natija: { holatlar: ['ochgan'] } };
    const a = ctx.tokF('L'), b = ctx.tokF('N');
    const farq = kat([a[0] + b[0], a[1] + b[1]]);
    if (farq > p.dI / 1000) return { holat: { ...h, yoqilgan: false }, natija: { holatlar: ['ochgan', 'sizish'] } };
    return { natija: { holatlar: ['yoqilgan'] } };
  },
  svg({ el, holat, param }) {
    const on = holat.yoqilgan;
    return `<rect class="d-body" x="-34" y="-78" width="68" height="156" rx="4"/>
      <rect class="d-slot" x="-28" y="-26" width="56" height="34" rx="3"/>
      <rect x="-26" y="${on ? -24 : -8}" width="52" height="14" rx="2" fill="#e0b400" stroke="#9c7d00"/>
      <circle cx="18" cy="26" r="7" fill="#e0b400" stroke="#9c7d00" data-amal="test"/>${yoz(18, 29, 'T', 'd-txt d-mini')}
      ${yoz(-8, 30, `${param.xarakteristika}${param.nominal}`, 'd-txt d-mini')}${yoz(-8, 44, `${param.dI}mA`, 'd-txt d-mini')}
      ${yorliqlar(difavtomat.klemmalar())}${nomi(100, `${el.id} · RCBO · ${on ? 'ON' : 'OFF'}`)}`;
  },
};

// ---------- Bir fazali elektr hisoblagich: 1 (L kirish), 3 (L chiqish), 4 (N kirish), 6 (N chiqish) ----------
export const hisoblagich_1f = {
  tur: 'hisoblagich_1f',
  belgi: 'PI',
  nomi: N3('Elektr hisoblagich', 'Электросчётчик', 'Energy meter'),
  klemmalar: () => [
    K('1', 'L in', N3('L kirish (1)', 'L вход (1)', 'L in (1)'), -48, 60, 0, 1),
    K('3', 'L out', N3('L chiqish (3)', 'L выход (3)', 'L out (3)'), -16, 60, 0, 1),
    K('4', 'N in', N3('N kirish (4)', 'N вход (4)', 'N in (4)'), 16, 60, 0, 1),
    K('6', 'N out', N3('N chiqish (6)', 'N выход (6)', 'N out (6)'), 48, 60, 0, 1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  kichikR: () => [{ a: '1', b: '3', R: 0.01, nom: 'L' }, { a: '4', b: '6', R: 0.01, nom: 'N' }],
  yuklamalar: () => [{ a: '1', b: '4', R: 26450, nom: 'u' }],
  hisobla(ctx) {
    const I = ctx.tok('L'), U = ctx.kuchlanish('1', '4');
    const P = Math.round(U * I);
    return { natija: { P, U, I, holatlar: [I > 0.05 ? 'ishlaydi' : 'toxtagan'] } };
  },
  svg({ el, natija }) {
    const P = natija?.P || 0;
    return `<rect x="-68" y="-74" width="136" height="148" rx="8" fill="#1c1d21" stroke="#3c3f46"/>
      <rect x="-54" y="-60" width="108" height="64" rx="3" fill="#e8edf1"/>
      <rect x="-48" y="-52" width="96" height="18" fill="#1f4fa8"/>
      ${yoz(0, -39, String(Math.min(99999, P)).padStart(5, '0') + ' W', 'd-txt d-oq')}
      <line x1="-40" y1="-14" x2="40" y2="-14" stroke="#1b1b1f" stroke-width="2"/>
      <circle cx="0" cy="16" r="4" fill="${P > 0 ? '#ff3b30' : '#5b1a17'}"/>
      <rect x="-64" y="44" width="128" height="30" rx="3" fill="#111214"/>
      ${yorliqlar(hisoblagich_1f.klemmalar(), 'd-txt d-mini d-oq')}${nomi(94, `${el.id} · kWh`)}`;
  },
};
