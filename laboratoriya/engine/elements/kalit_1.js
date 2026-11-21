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

  // Devorga o‘rnatilgan kalit: yumaloq burchakli ramka, katta klavisha (ikki tomonga qiyshayadi),
  // ramka ortida mexanizm; uning yuqori qismidagi ikki vintli klemma (L, L1) o‘qituv maqsadida ochiq.
  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group();
    const oq = c.mat(0xf6f6f3, { roughness: 0.32 });
    // Podrozetnik soyasi va montaj plastinasi (metall, ramka ortidan biroz ko‘rinadi)
    const soya = new THREE.Mesh(new THREE.CircleGeometry(0.036, 32), c.mat(0xd9d6cf, { roughness: 0.9 }));
    soya.position.z = 0.0005;
    g.add(soya);
    const plastina = new THREE.Mesh(c.ekstr(c.shakl(0.071, 0.071, 0.004), 0.0015, 0.0003), c.mat(0xbfc4ca, { metalness: 0.8, roughness: 0.35 }));
    plastina.position.z = 0.001;
    g.add(plastina);
    // Mexanizm (oq plastik) — ramka ichida
    const mex = new THREE.Mesh(c.ekstr(c.shakl(0.054, 0.054, 0.004), 0.012, 0.001), c.mat(0xeeeeea, { roughness: 0.5 }));
    mex.position.z = 0.002;
    g.add(mex);
    // Ramka (ichida teshik)
    const rsh = c.shakl(0.086, 0.086, 0.012);
    rsh.holes.push(c.shakl(0.058, 0.058, 0.006));
    const ramka = new THREE.Mesh(c.ekstr(rsh, 0.0095, 0.0022, 8), oq);
    ramka.position.z = 0.002;
    g.add(ramka);
    // Klavisha: biroz bo‘rtiq (old yuzasi egri)
    const pivot = new THREE.Group();
    pivot.position.set(0, 0, 0.0135);
    const kl = new THREE.Mesh(c.ekstr(c.shakl(0.0545, 0.0545, 0.005), 0.007, 0.0018, 8), c.mat(0xffffff, { roughness: 0.28 }));
    kl.position.z = -0.0035;
    kl.scale.set(1, 1, 1);
    pivot.add(kl);
    const chiziq = c.quti(0.012, 0.0014, 0.0006, c.mat(0xd0d0cc, { roughness: 0.5 }));
    chiziq.position.set(0, -0.021, 0.0037);
    pivot.add(chiziq);
    g.add(pivot);
    // Mexanizm klemmalari (ramkadan yuqorida): metall plastinka + vint
    const klemmalar = {};
    const qora = c.mat(0x2a2d32, { roughness: 0.85 });
    const kor = new THREE.Mesh(c.ekstr(c.shakl(0.064, 0.016, 0.003), 0.012, 0.0008), c.mat(0xeeeeea, { roughness: 0.5 }));
    kor.position.set(0, 0.051, 0.0);
    g.add(kor);
    [['L', -0.017], ['L1', 0.017]].forEach(([id, x]) => {
      const lapka = c.quti(0.017, 0.012, 0.0012, c.mat(0xc9a24a, { metalness: 0.75, roughness: 0.32 }));
      lapka.position.set(x, 0.051, 0.0126);
      g.add(lapka);
      const v = c.vint(0.0042);
      v.position.set(x, 0.051, 0.0133);
      g.add(v);
      const kirish = c.quti(0.008, 0.0015, 0.006, qora);
      kirish.position.set(x, 0.0592, 0.006);
      g.add(kirish);
      g.add(c.yorliq(id, { x: x + (x < 0 ? -0.019 : 0.019), y: 0.051, z: 0.014, olcham: 0.011 }));
      klemmalar[id] = { pos: [x, 0.051, 0.016], dir: [0, 0.7, 0.7] };
    });
    g.add(c.yorliq(c.el.id, { x: 0, y: -0.058, z: 0.012, olcham: 0.018 }));
    return {
      obj: g,
      klemmalar,
      bosish: [kl, ramka, mex],
      yangila(h) {
        // Yoqilgan: klavishaning yuqori qismi bosilgan (pastki qismi oldinga chiqadi)
        pivot.rotation.x = h.yoqilgan ? 0.085 : -0.085;
      },
    };
  },
};
