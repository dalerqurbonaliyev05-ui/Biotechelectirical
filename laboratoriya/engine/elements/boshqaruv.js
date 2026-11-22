// Boshqaruv elementlari: tugma (lahzali / qulflanadigan / avariya), selektor (aylanma kalit), signal lampasi.
import { N3, K, yoz, nomi, yorliqlar, lahzaliAmal } from './_umumiy.js';

const RANG = { yashil: '#22a35a', qizil: '#d93a32', sariq: '#e0b400', kok: '#2a6fd6', qora: '#2b2e34', oq: '#f4f4f2', moviy: '#22c1d6' };

const tugmaKl = () => [
  K('11', '11', N3('NC 11', 'НЗ 11', 'NC 11'), -34, 30, -1, 0),
  K('12', '12', N3('NC 12', 'НЗ 12', 'NC 12'), 34, 30, 1, 0),
  K('23', '23', N3('NO 23', 'НО 23', 'NO 23'), -34, 58, -1, 0),
  K('24', '24', N3('NO 24', 'НО 24', 'NO 24'), 34, 58, 1, 0),
];

// ---------- Tugma: 11–12 NC, 23–24 NO ----------
export const tugma = {
  tur: 'tugma',
  belgi: 'SB',
  nomi: N3('Tugma', 'Кнопка', 'Push button'),
  standart: { rang: 'yashil', tur: 'lahzali' },
  klemmalar: tugmaKl,
  boshlangich: () => ({ bosilgan: false }),
  ichki(h, p, hammasi) {
    const r = [];
    if (!h.bosilgan || hammasi) r.push(['11', '12']);
    if (h.bosilgan || hammasi) r.push(['23', '24']);
    return r;
  },
  tugmaRejimi: (amal, p) => (p.tur === 'lahzali' ? 'lahzali' : 'almash'),
  amal(h, q, tugma, p) {
    if (p?.tur && p.tur !== 'lahzali') {
      if (q === 'bosib_tur' || q === 'almash') return { ...h, bosilgan: !h.bosilgan };
      return h;
    }
    return lahzaliAmal(h, q);
  },
  hisobla: (ctx, h) => ({ natija: { holatlar: [h.bosilgan ? 'bosilgan' : 'qoyilgan_tugma'] } }),
  svg({ el, holat, param }) {
    const b = holat.bosilgan, c = RANG[param.rang] || RANG.yashil;
    const avariya = param.tur === 'avariya';
    const bosh = avariya
      ? `<path d="M-30 ${b ? -12 : -18} Q0 ${b ? -50 : -60} 30 ${b ? -12 : -18} Z" fill="${c}"/><rect x="-22" y="-14" width="44" height="10" fill="#f5c400"/>`
      : `<ellipse cx="0" cy="${b ? -14 : -20}" rx="26" ry="${b ? 10 : 14}" fill="${c}"/><rect x="-26" y="${b ? -14 : -20}" width="52" height="${b ? 6 : 12}" fill="${c}"/>`;
    return `<rect x="-44" y="-8" width="88" height="80" rx="5" fill="#2b2e34"/>
      <rect x="-24" y="-12" width="48" height="10" rx="2" fill="#9aa0a8"/>
      <g data-amal="bos" class="d-btn">${bosh}<rect x="-30" y="-64" width="60" height="58" fill="transparent"/></g>
      <line x1="-22" y1="30" x2="22" y2="30" stroke="${b ? '#555' : '#22c1d6'}" stroke-width="3"/>
      <line x1="-22" y1="58" x2="22" y2="58" stroke="${b ? '#22c1d6' : '#555'}" stroke-width="3"/>
      ${yorliqlar(tugmaKl(), 'd-txt d-mini d-oq', 12)}
      ${nomi(92, `${el.id}${param.tur === 'qulflanadigan' ? ' · LATCH' : avariya ? ' · E-STOP' : ''}`)}`;
  },
};

// ---------- Selektor (aylanma kalit): I holatda 13–14, II holatda 23–24 yopiq ----------
export const tanlagich = {
  tur: 'tanlagich',
  belgi: 'SA',
  nomi: N3('Selektor (aylanma kalit)', 'Переключатель (селектор)', 'Selector switch'),
  standart: { pozitsiyalar: ['I', '0', 'II'] },
  klemmalar: () => [
    K('13', '13', N3('I holat kontakti 13', 'контакт пол. I 13', 'pos. I contact 13'), -34, 30, -1, 0),
    K('14', '14', N3('I holat kontakti 14', 'контакт пол. I 14', 'pos. I contact 14'), 34, 30, 1, 0),
    K('23', '23', N3('II holat kontakti 23', 'контакт пол. II 23', 'pos. II contact 23'), -34, 58, -1, 0),
    K('24', '24', N3('II holat kontakti 24', 'контакт пол. II 24', 'pos. II contact 24'), 34, 58, 1, 0),
  ],
  boshlangich: (p) => ({ poz: p.pozitsiyalar.includes('0') ? '0' : p.pozitsiyalar[0] }),
  ichki(h, p, hammasi) {
    const r = [];
    if (h.poz === 'I' || hammasi) r.push(['13', '14']);
    if (h.poz === 'II' || hammasi) r.push(['23', '24']);
    return r;
  },
  bosiladi: true,
  bosish(h, p) {
    const l = p?.pozitsiyalar || ['I', '0', 'II'];
    return { ...h, poz: l[(l.indexOf(h.poz) + 1) % l.length] };
  },
  amal(h, q, tugma, p) {
    const l = p?.pozitsiyalar || ['I', '0', 'II'];
    if (l.includes(q)) return { ...h, poz: q };
    return { ...h, poz: l[(l.indexOf(h.poz) + 1) % l.length] };
  },
  hisobla: (ctx, h) => ({ natija: { holatlar: [`poz_${h.poz}`] } }),
  svg({ el, holat, param }) {
    const l = param.pozitsiyalar;
    const burchak = { I: -40, 0: 0, II: 40 }[holat.poz] ?? 0;
    const belgilar = l.map((p) => {
      const a = (({ I: -40, 0: 0, II: 40 }[p] ?? 0) - 90) * Math.PI / 180;
      return yoz((30 * Math.cos(a)).toFixed(1), (-24 + 30 * Math.sin(a) + 3).toFixed(1), p, 'd-txt d-mini d-oq');
    }).join('');
    return `<rect x="-44" y="-8" width="88" height="80" rx="5" fill="#2b2e34"/>
      <circle cx="0" cy="-24" r="20" fill="#d7dbe0"/>
      <rect x="-5" y="-44" width="10" height="40" rx="3" fill="#1b1b1f" transform="rotate(${burchak} 0 -24)"/>
      ${belgilar}
      <line x1="-22" y1="30" x2="22" y2="30" stroke="${holat.poz === 'I' ? '#22c1d6' : '#555'}" stroke-width="3"/>
      <line x1="-22" y1="58" x2="22" y2="58" stroke="${holat.poz === 'II' ? '#22c1d6' : '#555'}" stroke-width="3"/>
      ${yorliqlar(tanlagich.klemmalar(), 'd-txt d-mini d-oq', 12)}${nomi(92, `${el.id} · ${holat.poz}`)}`;
  },
};

// ---------- Signal lampasi: X1–X2 ----------
export const signal_lampa = {
  tur: 'signal_lampa',
  belgi: 'HL',
  nomi: N3('Signal lampasi', 'Сигнальная лампа', 'Pilot light'),
  standart: { rang: 'yashil' },
  klemmalar: () => [
    K('X1', 'X1', N3('X1', 'X1', 'X1'), -18, 46, 0, 1),
    K('X2', 'X2', N3('X2', 'X2', 'X2'), 18, 46, 0, 1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: 'X1', b: 'X2', R: 100000, nom: 'lampa' }],
  hisobla(ctx) {
    const U = ctx.kuchlanish('X1', 'X2');
    const on = U >= 170;
    return { natija: { yonadi: on, holatlar: [U > 300 ? 'kuydi' : on ? 'yonadi' : 'ochgan'] } };
  },
  svg({ el, param, natija }) {
    const c = RANG[param.rang] || RANG.yashil, on = natija?.yonadi;
    return `${on ? `<circle cx="0" cy="-14" r="40" fill="${c}" opacity=".45" filter="url(#nur)"/>` : ''}
      <rect x="-26" y="2" width="52" height="34" rx="4" fill="#2b2e34"/>
      <circle cx="0" cy="-14" r="24" fill="#3a3d44"/><circle cx="0" cy="-14" r="18" fill="${c}" opacity="${on ? 1 : 0.35}"/>
      ${yorliqlar(signal_lampa.klemmalar(), 'd-txt d-mini d-oq', 13)}${nomi(68, el.id)}`;
  },
};
