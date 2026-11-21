// Tarmoq kirishi 220 V (TN-S): L, N va PE manba klemmalari.
// Manba: L doimo kuchlanish ostida (tarmoq), N — ishchi nol, PE — himoya o‘tkazgichi.

export default {
  tur: 'vvod',
  belgi: 'VVOD',
  nomi: { uz: 'Tarmoq kirishi 220 V', ru: 'Ввод сети 220 В', en: 'Mains input 220 V' },

  klemmalar: () => [
    { id: 'L', yorliq: 'L', nomi: { uz: 'faza (L)', ru: 'фаза (L)', en: 'phase (L)' }, xy: [44, -80], dir2d: [1, 0], maks: 2 },
    { id: 'N', yorliq: 'N', nomi: { uz: 'nol (N)', ru: 'ноль (N)', en: 'neutral (N)' }, xy: [44, 0], dir2d: [1, 0], maks: 2 },
    { id: 'PE', yorliq: 'PE', nomi: { uz: 'himoya (PE)', ru: 'защитный (PE)', en: 'protective earth (PE)' }, xy: [44, 80], dir2d: [1, 0], maks: 2 },
  ],

  boshlangich: () => ({}),
  ichki: () => [],
  manba: { L: 'L', N: 'N', PE: 'PE' },

  svg: () => `
    <rect class="e-body" x="-34" y="-104" width="40" height="208" rx="8"/>
    <text class="e-sub" x="-14" y="0" text-anchor="middle" transform="rotate(-90 -14 0)">~ 220 V · 50 Hz</text>
    <line class="e-ln" x1="6" y1="-80" x2="44" y2="-80"/>
    <line class="e-ln" x1="6" y1="0" x2="44" y2="0"/>
    <line class="e-ln e-pe" x1="6" y1="80" x2="44" y2="80"/>
    <text class="e-lbl" x="-14" y="-114" text-anchor="middle">VVOD</text>`,

  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group();
    // DIN-reykaga o‘rnatilgan 3 qutbli klemma bloki
    const kor = c.quti(0.078, 0.05, 0.045, c.mat(0x8f969e, { roughness: 0.7 }));
    kor.position.set(0, 0, 0.0225);
    g.add(kor);
    const ranglar = [0x7b4a26, 0x1f6fd6, 'pe'];
    const xs = [-0.024, 0, 0.024];
    const klemmalar = {};
    ['L', 'N', 'PE'].forEach((id, i) => {
      const band = c.quti(0.02, 0.012, 0.004, ranglar[i] === 'pe' ? c.peMat() : c.mat(ranglar[i]));
      band.position.set(xs[i], 0.014, 0.046);
      g.add(band);
      const v = c.vint();
      v.position.set(xs[i], -0.008, 0.046);
      g.add(v);
      g.add(c.yorliq(id, { x: xs[i], y: -0.04, z: 0.05, olcham: 0.022 }));
      klemmalar[id] = { pos: [xs[i], -0.008, 0.05], dir: [0, -0.7, 0.7] };
    });
    // Tepadan kirib keluvchi kabel (shiftgacha)
    const uz = Math.max(0.1, c.xona.balandlik - c.el.pozitsiya3d[1]);
    const kab = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, uz, 12), c.mat(0x3a3d42, { roughness: 0.8 }));
    kab.position.set(0, uz / 2 + 0.025, 0.02);
    g.add(kab);
    g.add(c.yorliq('VVOD 220 V', { x: 0, y: 0.06, z: 0.05, olcham: 0.026 }));
    return { obj: g, klemmalar, bosish: [] };
  },
};
