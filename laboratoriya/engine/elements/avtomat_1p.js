// 1 qutbli avtomatik o‘chirgich (masalan 10 A, C xarakteristika).
// Yoqilganda 1 (kirish) va 2 (chiqish) klemmalari ulanadi. Qisqa tutashuvda o‘zi o‘chib ketadi (himoya: true).

export default {
  tur: 'avtomat_1p',
  belgi: 'QF',
  nomi: { uz: '1P avtomat', ru: 'Автомат 1P', en: '1P circuit breaker' },
  standart: { nominal: 10, xarakteristika: 'C' },

  klemmalar: () => [
    { id: 'in', yorliq: '1', nomi: { uz: 'kirish (1)', ru: 'вход (1)', en: 'line (1)' }, xy: [0, -64], dir2d: [0, -1], maks: 2 },
    { id: 'out', yorliq: '2', nomi: { uz: 'chiqish (2)', ru: 'выход (2)', en: 'load (2)' }, xy: [0, 64], dir2d: [0, 1], maks: 2 },
  ],

  boshlangich: () => ({ yoqilgan: false }),
  ichki: (h) => (h.yoqilgan ? [['in', 'out']] : []),
  himoya: true,
  bosiladi: true,
  bosish: (h) => ({ ...h, yoqilgan: !h.yoqilgan }),

  svg({ el, holat, param }) {
    const on = holat.yoqilgan;
    // GOST 2.755: kontakt + "×" (avtomat belgisi), yonida issiqlik/elektromagnit ajratgich.
    const pichoq = on
      ? '<line class="e-ln" x1="0" y1="24" x2="0" y2="-24"/>'
      : '<line class="e-ln" x1="0" y1="24" x2="-20" y2="-16"/>';
    return `
      <rect class="e-hit" x="-34" y="-50" width="78" height="100" rx="8"/>
      <line class="e-ln" x1="0" y1="-64" x2="0" y2="-24"/>
      <line class="e-ln" x1="-6" y1="-30" x2="6" y2="-18"/>
      <line class="e-ln" x1="6" y1="-30" x2="-6" y2="-18"/>
      ${pichoq}
      <line class="e-ln" x1="0" y1="24" x2="0" y2="64"/>
      <circle class="e-dot" cx="0" cy="24" r="3"/>
      <line class="e-ln e-thin" x1="-10" y1="0" x2="-26" y2="0" stroke-dasharray="4 3"/>
      <rect class="e-body" x="-40" y="-8" width="14" height="16"/>
      <text class="e-lbl" x="14" y="-34">${el.id}</text>
      <text class="e-sub" x="14" y="-16">${param.xarakteristika}${param.nominal}</text>
      <text class="e-state ${on ? 'on' : 'off'}" x="14" y="42">${on ? 'I' : 'O'}</text>`;
  },

  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group();
    const oq = c.mat(0xf3f3f0, { roughness: 0.55 });
    const tana = c.quti(0.032, 0.15, 0.085, oq);
    tana.position.set(0, 0, 0.0425);
    g.add(tana);
    const old = c.quti(0.032, 0.075, 0.02, oq);
    old.position.set(0, 0, 0.095);
    g.add(old);
    // Richag (dastak)
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, 0.105);
    const dastak = c.quti(0.014, 0.034, 0.018, c.mat(0x2b2f36, { roughness: 0.5 }));
    dastak.position.set(0, 0.012, 0.004);
    pivot.add(dastak);
    g.add(pivot);
    // Holat oynachasi (qizil — yoqilgan, yashil — o‘chgan)
    const oyna = c.quti(0.012, 0.008, 0.002, c.mat(0x2fa35a));
    oyna.position.set(0, -0.03, 0.106);
    g.add(oyna);
    g.add(c.yorliq(`C${c.param.nominal}`, { x: 0, y: 0.05, z: 0.09, olcham: 0.016, rang: '#1b1440', fon: null }));
    // Klemma vintlari (tepada va pastda)
    const klemmalar = {};
    [['in', 0.064], ['out', -0.064]].forEach(([id, y]) => {
      const v = c.vint();
      v.position.set(0, y, 0.07);
      g.add(v);
      klemmalar[id] = { pos: [0, y, 0.075], dir: [0, Math.sign(y) * 0.6, 0.8] };
    });
    g.add(c.yorliq('1', { x: 0.026, y: 0.064, z: 0.07, olcham: 0.016 }));
    g.add(c.yorliq('2', { x: 0.026, y: -0.064, z: 0.07, olcham: 0.016 }));
    g.add(c.yorliq(c.el.id, { x: 0, y: 0.1, z: 0.06, olcham: 0.024 }));
    return {
      obj: g,
      klemmalar,
      bosish: [dastak, old],
      yangila(h) {
        pivot.rotation.x = h.yoqilgan ? -0.55 : 0.55;
        dastak.position.y = h.yoqilgan ? 0.012 : -0.012;
        oyna.material = h.yoqilgan ? c.mat(0xd8312b) : c.mat(0x2fa35a);
      },
    };
  },
};
