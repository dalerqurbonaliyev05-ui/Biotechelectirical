// Bir klavishali kalit. Yoqilganda L (kirish) va L1 (chiqish) ulanadi.

export default {
  tur: 'kalit_1',
  belgi: 'SA',
  nomi: { uz: 'Bir klavishali kalit', ru: 'Одноклавишный выключатель', en: 'Single-gang switch' },

  klemmalar: () => [
    { id: 'L', yorliq: 'L', nomi: { uz: 'kirish (L)', ru: 'вход (L)', en: 'input (L)' }, xy: [-52, 34], dir2d: [0, 1], maks: 2 },
    { id: 'L1', yorliq: 'L1', nomi: { uz: 'chiqish (L1)', ru: 'выход (L1)', en: 'output (L1)' }, xy: [52, 34], dir2d: [0, 1], maks: 2 },
  ],

  boshlangich: () => ({ yoqilgan: false }),
  ichki: (h) => (h.yoqilgan ? [['L', 'L1']] : []),
  bosiladi: true,
  bosish: (h) => ({ ...h, yoqilgan: !h.yoqilgan }),

  svg({ el, holat }) {
    const on = holat.yoqilgan;
    // GOST 21.614: kalit — sharnirli kontakt, uchida qisqa ko‘ndalang chiziq.
    const pichoq = on
      ? '<line class="e-ln" x1="-20" y1="0" x2="20" y2="0"/><line class="e-ln" x1="20" y1="-7" x2="20" y2="7"/>'
      : '<line class="e-ln" x1="-20" y1="0" x2="14" y2="-20"/><line class="e-ln" x1="10" y1="-26" x2="18" y2="-14"/>';
    return `
      <rect class="e-hit" x="-44" y="-40" width="88" height="62" rx="8"/>
      <path class="e-ln" d="M-52 34 V0 H-20"/>
      <circle class="e-dot" cx="-20" cy="0" r="3"/>
      ${pichoq}
      <path class="e-ln" d="M24 0 H52 V34"/>
      <text class="e-lbl" x="0" y="-30" text-anchor="middle">${el.id}</text>
      <text class="e-state ${on ? 'on' : 'off'}" x="38" y="-12">${on ? 'I' : 'O'}</text>`;
  },

  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group();
    const oq = c.mat(0xf7f7f5, { roughness: 0.45 });
    const plita = c.quti(0.088, 0.088, 0.012, oq);
    plita.position.set(0, 0, 0.006);
    g.add(plita);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, 0.014);
    const klavisha = c.quti(0.056, 0.064, 0.012, c.mat(0xffffff, { roughness: 0.35 }));
    klavisha.position.set(0, 0, 0.006);
    pivot.add(klavisha);
    const belgi = c.quti(0.014, 0.003, 0.001, c.mat(0xd8312b));
    belgi.position.set(0, 0.022, 0.0125);
    pivot.add(belgi);
    g.add(pivot);
    // Ochiq klemmalar (mexanizm yon tomonida)
    const klemmalar = {};
    [['L', -0.058], ['L1', 0.058]].forEach(([id, x]) => {
      const lapka = c.quti(0.02, 0.02, 0.006, c.mat(0xc9a24a, { metalness: 0.7, roughness: 0.35 }));
      lapka.position.set(x, 0.02, 0.006);
      g.add(lapka);
      const v = c.vint();
      v.position.set(x, 0.02, 0.01);
      g.add(v);
      g.add(c.yorliq(id, { x, y: -0.005, z: 0.012, olcham: 0.016 }));
      klemmalar[id] = { pos: [x, 0.02, 0.015], dir: [0, 0.7, 0.7] };
    });
    g.add(c.yorliq(c.el.id, { x: 0, y: -0.062, z: 0.012, olcham: 0.022 }));
    return {
      obj: g,
      klemmalar,
      bosish: [klavisha, plita],
      yangila(h) {
        pivot.rotation.x = h.yoqilgan ? 0.14 : -0.14;
      },
    };
  },
};
