// Motorlar: uch fazali (3 klemma, ichki yulduz), uch fazali 6 klemmali (yulduz/uchburchak),
// bir fazali kondensatorli reversiv motor, ventilyator.
// Chulg‘amlar — yuklamalar; ularning kuchlanish fazorlari bo‘yicha ishlash, aylanish yo‘nalishi va ulanish turi aniqlanadi.
import { N3, K, yoz, nomi, yorliqlar, kat, yonalishi, fazami } from './_umumiy.js';

function parrak(on, teskari, cx = -38, cy = 2) {
  const cls = on ? `d-aylan${teskari ? ' teskari' : ''}` : '';
  return `<g transform="translate(${cx} ${cy})"><g class="${cls}">
    <path d="M0 0 L-6 -22 Q0 -26 6 -22 Z" fill="#f5c400"/><path d="M0 0 L19 11 Q19 18 12 21 Z" fill="#d93a32"/><path d="M0 0 L-13 18 Q-19 14 -19 8 Z" fill="#22a35a"/>
  </g><circle r="6" fill="#2a4fb0"/></g>`;
}

function motorTana(on, yon, korinish) {
  if (korinish === 'konveyer') {
    return `<rect x="-90" y="-10" width="180" height="22" rx="11" fill="#2f6b3d" stroke="#1f4a29"/>
      <circle cx="-79" cy="1" r="9" fill="#9aa0a8"/><circle cx="79" cy="1" r="9" fill="#9aa0a8"/>
      <g class="${on ? `d-yur${yon === 'teskari' ? ' teskari' : ''}` : ''}"><rect x="-40" y="-30" width="20" height="20" fill="#c98a3c"/><rect x="10" y="-30" width="20" height="20" fill="#c98a3c"/></g>
      <line x1="-70" y1="12" x2="-70" y2="40" stroke="#9aa0a8" stroke-width="4"/><line x1="70" y1="12" x2="70" y2="40" stroke="#9aa0a8" stroke-width="4"/>
      <rect x="-24" y="14" width="48" height="24" rx="4" fill="#5bb5d6"/>`;
  }
  return `<rect x="-36" y="-24" width="84" height="52" rx="14" fill="#5bb5d6" stroke="#2f86a8"/>
    <rect x="-8" y="-38" width="30" height="20" rx="3" fill="#3f9fc4" stroke="#2f86a8"/>
    <rect x="48" y="-6" width="18" height="14" rx="3" fill="#8fd0e6"/>
    ${parrak(on, yon === 'teskari')}`;
}

// ---------- Uch fazali motor: U, V, W (ichki yulduz), PE ----------
export const motor_3f = {
  tur: 'motor_3f',
  belgi: 'M',
  nomi: N3('Uch fazali motor', 'Трёхфазный двигатель', 'Three-phase motor'),
  standart: { quvvat: 2.2, korinish: 'motor' },
  klemmalar: (p) => {
    const y = p.korinish === 'konveyer' ? -56 : -62;
    return [
      K('U', 'U', N3('U chulg‘ami', 'обмотка U', 'winding U'), -30, y, 0, -1),
      K('V', 'V', N3('V chulg‘ami', 'обмотка V', 'winding V'), 0, y, 0, -1),
      K('W', 'W', N3('W chulg‘ami', 'обмотка W', 'winding W'), 30, y, 0, -1),
      K('PE', 'PE', N3('korpus (PE)', 'корпус (PE)', 'frame (PE)'), p.korinish === 'konveyer' ? 104 : 84, 0, 1, 0),
    ];
  },
  ichkiTugunlar: () => ['S'],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [
    { a: 'U', b: 'S', R: 40, nom: 'u' }, { a: 'V', b: 'S', R: 40, nom: 'v' }, { a: 'W', b: 'S', R: 40, nom: 'w' },
  ],
  hisobla(ctx) {
    const u = ctx.fazor('U', 'S'), v = ctx.fazor('V', 'S'), w = ctx.fazor('W', 'S');
    const k = [kat(u), kat(v), kat(w)];
    const ishlaydi = k.every((x) => x >= 170);
    const qisman = !ishlaydi && k.some((x) => x >= 60);
    const yon = ishlaydi ? yonalishi(u, v) : null;
    return { natija: { ishlaydi, yonalish: yon, holatlar: ishlaydi ? ['ishlaydi', yon] : qisman ? ['toxtagan', 'faza_yetishmaydi'] : ['toxtagan'] } };
  },
  svg({ el, param, natija }) {
    const on = natija?.ishlaydi;
    const kl = motor_3f.klemmalar(param);
    const sim = kl.slice(0, 3).map((k, i) => `<line x1="${k.xy[0]}" y1="${k.xy[1]}" x2="${4 + i * 4}" y2="-30" stroke="${['#e0b400', '#1f9a4a', '#d93a32'][i]}" stroke-width="4"/>`).join('');
    const pe = kl[3];
    return `${motorTana(on, natija?.yonalish, param.korinish)}${sim}
      <line x1="${pe.xy[0]}" y1="0" x2="${param.korinish === 'konveyer' ? 90 : 60}" y2="0" stroke="#e2c300" stroke-width="4"/>
      ${yorliqlar(kl, 'd-txt d-mini d-oq', -14)}
      ${nomi(param.korinish === 'konveyer' ? 62 : 52, `${el.id} · ${on ? (natija.yonalish === 'teskari' ? '↺' : '↻') : 'STOP'}`)}`;
  },
};

// ---------- 6 klemmali motor: U1, V1, W1, U2, V2, W2, PE (yulduz / uchburchak) ----------
export const motor_6 = {
  tur: 'motor_6',
  belgi: 'M',
  nomi: N3('Motor (6 klemma, Y/Δ)', 'Двигатель (6 выводов, Y/Δ)', 'Motor (6 leads, Y/Δ)'),
  standart: { quvvat: 7.5 },
  klemmalar: () => [
    K('U1', 'U1', N3('U1', 'U1', 'U1'), -36, -66, 0, -1),
    K('V1', 'V1', N3('V1', 'V1', 'V1'), 0, -66, 0, -1),
    K('W1', 'W1', N3('W1', 'W1', 'W1'), 36, -66, 0, -1),
    K('U2', 'U2', N3('U2', 'U2', 'U2'), -36, 66, 0, 1),
    K('V2', 'V2', N3('V2', 'V2', 'V2'), 0, 66, 0, 1),
    K('W2', 'W2', N3('W2', 'W2', 'W2'), 36, 66, 0, 1),
    K('PE', 'PE', N3('korpus (PE)', 'корпус (PE)', 'frame (PE)'), 88, 0, 1, 0),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [
    { a: 'U1', b: 'U2', R: 70, nom: 'u' }, { a: 'V1', b: 'V2', R: 70, nom: 'v' }, { a: 'W1', b: 'W2', R: 70, nom: 'w' },
  ],
  hisobla(ctx) {
    const u = ctx.fazor('U1', 'U2'), v = ctx.fazor('V1', 'V2'), w = ctx.fazor('W1', 'W2');
    const k = [kat(u), kat(v), kat(w)];
    const ishlaydi = k.every((x) => x >= 170);
    const qisman = !ishlaydi && k.some((x) => x >= 60);
    if (!ishlaydi) return { natija: { ishlaydi: false, holatlar: qisman ? ['toxtagan', 'faza_yetishmaydi'] : ['toxtagan'] } };
    const ortacha = (k[0] + k[1] + k[2]) / 3;
    const ulanish = ortacha >= 330 ? 'uchburchak' : 'yulduz';
    const yon = yonalishi(u, v);
    return { natija: { ishlaydi, yonalish: yon, ulanish, holatlar: ['ishlaydi', yon, ulanish] } };
  },
  svg({ el, natija }) {
    const on = natija?.ishlaydi;
    const kl = motor_6.klemmalar();
    const rang = ['#e0b400', '#1f9a4a', '#d93a32'];
    const sim = kl.slice(0, 6).map((k, i) => `<line x1="${k.xy[0]}" y1="${k.xy[1]}" x2="${4 + (i % 3) * 4}" y2="${i < 3 ? -30 : 26}" stroke="${rang[i % 3]}" stroke-width="4"/>`).join('');
    return `${motorTana(on, natija?.yonalish)}${sim}
      <line x1="88" y1="0" x2="60" y2="0" stroke="#e2c300" stroke-width="4"/>
      ${yorliqlar(kl, 'd-txt d-mini d-oq', -14)}
      ${nomi(96, `${el.id} · ${on ? `${natija.ulanish === 'uchburchak' ? 'Δ' : 'Y'} ${natija.yonalish === 'teskari' ? '↺' : '↻'}` : 'STOP'}`)}`;
  },
};

// ---------- Bir fazali kondensatorli reversiv motor: N (umumiy), L1 (bir yo‘nalish), L2 (teskari), PE ----------
export const motor_1f = {
  tur: 'motor_1f',
  belgi: 'M',
  nomi: N3('Bir fazali motor (kondensatorli)', 'Однофазный двигатель (конденсаторный)', 'Single-phase capacitor motor'),
  klemmalar: () => [
    K('N', 'N', N3('umumiy (N)', 'общий (N)', 'common (N)'), -30, -62, 0, -1),
    K('L1', 'L1', N3('L1 — ochish', 'L1 — открыть', 'L1 — open'), 0, -62, 0, -1),
    K('L2', 'L2', N3('L2 — yopish', 'L2 — закрыть', 'L2 — close'), 30, -62, 0, -1),
    K('PE', 'PE', N3('korpus (PE)', 'корпус (PE)', 'frame (PE)'), 84, 0, 1, 0),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: () => [{ a: 'N', b: 'L1', R: 120, nom: 'a' }, { a: 'N', b: 'L2', R: 120, nom: 'b' }],
  hisobla(ctx) {
    const f1 = fazami(ctx.fazasi('L1')), f2 = fazami(ctx.fazasi('L2'));
    const u1 = ctx.kuchlanish('N', 'L1'), u2 = ctx.kuchlanish('N', 'L2');
    if (f1 && f2) return { natija: { ishlaydi: false, holatlar: ['toxtagan', 'xato_ikkala'] } };
    if (f1 && u1 >= 170) return { natija: { ishlaydi: true, yonalish: 'oldinga', holatlar: ['ishlaydi', 'oldinga'] } };
    if (f2 && u2 >= 170) return { natija: { ishlaydi: true, yonalish: 'teskari', holatlar: ['ishlaydi', 'teskari'] } };
    return { natija: { ishlaydi: false, holatlar: ['toxtagan'] } };
  },
  svg({ el, natija }) {
    const on = natija?.ishlaydi;
    const kl = motor_1f.klemmalar();
    const rang = ['#1f6fd6', '#d93a32', '#1f9a4a'];
    const sim = kl.slice(0, 3).map((k, i) => `<line x1="${k.xy[0]}" y1="${k.xy[1]}" x2="${4 + i * 4}" y2="-30" stroke="${rang[i]}" stroke-width="4"/>`).join('');
    return `${motorTana(on, natija?.yonalish)}${sim}<rect x="-58" y="-46" width="14" height="22" rx="3" fill="#2a5fb0"/>${yoz(-51, -31, 'C', 'd-txt d-mini d-oq')}
      <line x1="84" y1="0" x2="60" y2="0" stroke="#e2c300" stroke-width="4"/>
      ${yorliqlar(kl, 'd-txt d-mini d-oq', -14)}${nomi(52, `${el.id} · ${on ? (natija.yonalish === 'teskari' ? '↺' : '↻') : 'STOP'}`)}`;
  },
};

// ---------- Ventilyator (bir fazali yuklama): L, N, PE ----------
export const ventilyator = {
  tur: 'ventilyator',
  belgi: 'M',
  nomi: N3('Ventilyator', 'Вентилятор', 'Fan'),
  standart: { quvvat: 60 },
  klemmalar: () => [
    K('L', 'L', N3('faza (L)', 'фаза (L)', 'phase (L)'), -24, -60, 0, -1),
    K('N', 'N', N3('nol (N)', 'ноль (N)', 'neutral (N)'), 0, -60, 0, -1),
    K('PE', 'PE', N3('korpus (PE)', 'корпус (PE)', 'frame (PE)'), 24, -60, 0, -1),
  ],
  boshlangich: () => ({}),
  ichki: () => [],
  yuklamalar: (h, p) => [{ a: 'L', b: 'N', R: (230 * 230) / p.quvvat, nom: 'm' }],
  hisobla(ctx) {
    const on = ctx.kuchlanish('L', 'N') >= 170;
    return { natija: { ishlaydi: on, holatlar: [on ? 'ishlaydi' : 'toxtagan'] } };
  },
  svg({ el, natija }) {
    const on = natija?.ishlaydi;
    return `<rect class="d-body" x="-44" y="-44" width="88" height="88" rx="10"/>
      <circle cx="0" cy="4" r="34" fill="#e3e6ea"/>${parrak(on, false, 0, 4)}
      ${yorliqlar(ventilyator.klemmalar())}${nomi(64, `${el.id} · ${on ? 'ON' : 'OFF'}`)}`;
  },
};
