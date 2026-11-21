// Taqsimlash qutisi: ichida Wago turidagi klemma bloklari.
// Bitta blokning barcha portlari doimo bir nuqtaga ulangan (bir potensial).
// Quti "passiv" element: tekshiruvchi uning qaysi blok/port ishlatilganiga qaramaydi,
// faqat qaysi qurilma klemmalari bir potensialga tushganini solishtiradi.

const HARFLAR = 'ABCDEFGH';

function bloklar(param) {
  const res = [];
  for (let b = 0; b < param.bloklar; b++) {
    const h = HARFLAR[b];
    const portlar = [];
    for (let p = 1; p <= param.portlar; p++) portlar.push(`${h}${p}`);
    res.push(portlar);
  }
  return res;
}

const QADAM_2D = 50; // portlar orasidagi masofa (2D)
const QATOR_2D = 54; // bloklar orasidagi masofa (2D)

function olcham2d(param) {
  return { w: param.portlar * QADAM_2D + 90, h: param.bloklar * QATOR_2D + 50 };
}

export default {
  tur: 'taqsimlash_qutisi',
  belgi: 'X',
  nomi: { uz: 'Taqsimlash qutisi', ru: 'Распаячная коробка', en: 'Junction box' },
  standart: { bloklar: 4, portlar: 3 },
  passiv: true,
  bloklar,

  klemmalar(param) {
    const res = [];
    bloklar(param).forEach((portlar, bi) => {
      const y = (bi - (param.bloklar - 1) / 2) * QATOR_2D + 10;
      portlar.forEach((id, pi) => {
        const x = (pi - (param.portlar - 1) / 2) * QADAM_2D + 14;
        res.push({
          id,
          yorliq: id,
          nomi: { uz: `${id[0]} blok, ${pi + 1}-port`, ru: `блок ${id[0]}, порт ${pi + 1}`, en: `block ${id[0]}, port ${pi + 1}` },
          xy: [x, y],
          dir2d: null, // yo‘nalish simning ikkinchi uchiga qarab tanlanadi
          maks: 1, // Wago portiga faqat bitta sim
          r3d: 0.009,
        });
      });
    });
    return res;
  },

  boshlangich: () => ({}),
  ichki(_h, param) {
    const res = [];
    for (const portlar of bloklar(param)) for (let i = 1; i < portlar.length; i++) res.push([portlar[0], portlar[i]]);
    return res;
  },

  svg({ el, param }) {
    const { w, h } = olcham2d(param);
    let s = `<rect class="e-quti" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="14"/>
      <text class="e-lbl" x="${-w / 2 + 10}" y="${-h / 2 - 10}">${el.id}</text>`;
    bloklar(param).forEach((portlar, bi) => {
      const y = (bi - (param.bloklar - 1) / 2) * QATOR_2D + 10;
      const x0 = (0 - (param.portlar - 1) / 2) * QADAM_2D + 14;
      const x1 = (param.portlar - 1 - (param.portlar - 1) / 2) * QADAM_2D + 14;
      s += `<rect class="e-blok" x="${x0 - 22}" y="${y - 15}" width="${x1 - x0 + 44}" height="30" rx="7"/>
        <line class="e-shina" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>
        <text class="e-sub" x="${x0 - 34}" y="${y + 5}" text-anchor="end">${portlar[0][0]}</text>`;
    });
    return s;
  },

  model3d(c) {
    const { THREE, param } = c;
    const g = new THREE.Group();
    const kul = c.mat(0xc8ccd2, { roughness: 0.75 });
    const W = 0.26, H = 0.22, D = 0.075, T = 0.008;
    const orqa = c.quti(W, H, 0.006, kul);
    orqa.position.z = 0.003;
    g.add(orqa);
    [[0, H / 2 - T / 2, W, T], [0, -H / 2 + T / 2, W, T]].forEach(([x, y, w, h]) => {
      const m = c.quti(w, h, D, kul);
      m.position.set(x, y, D / 2);
      g.add(m);
    });
    [[-W / 2 + T / 2], [W / 2 - T / 2]].forEach(([x]) => {
      const m = c.quti(T, H, D, kul);
      m.position.set(x, 0, D / 2);
      g.add(m);
    });
    // Klemma bloklari: 2 ustun
    const qadam = 0.024;
    const klemmalar = {};
    const bl = bloklar(param);
    const qatorlar = Math.ceil(bl.length / 2);
    const tanaMat = new THREE.MeshStandardMaterial({ color: 0xe6e9ee, roughness: 0.35, transparent: true, opacity: 0.88 });
    const dastakMat = c.mat(0xff8a00, { roughness: 0.45 });
    const teshikMat = c.mat(0x22252b);
    bl.forEach((portlar, i) => {
      const cx = ((i % 2) - 0.5) * 0.112;
      const cy = ((qatorlar - 1) / 2 - Math.floor(i / 2)) * 0.075 - 0.005;
      const bw = portlar.length * qadam + 0.012;
      const tana = c.quti(bw, 0.024, 0.036, tanaMat);
      tana.position.set(cx, cy, 0.03);
      g.add(tana);
      g.add(c.yorliq(portlar[0][0], { x: cx - bw / 2 - 0.012, y: cy, z: 0.05, olcham: 0.018 }));
      portlar.forEach((id, pi) => {
        const x = cx + (pi - (portlar.length - 1) / 2) * qadam;
        const dastak = c.quti(0.014, 0.007, 0.024, dastakMat);
        dastak.position.set(x, cy + 0.0155, 0.032);
        dastak.rotation.x = -0.25;
        g.add(dastak);
        const teshik = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 12), teshikMat);
        teshik.rotation.x = Math.PI / 2;
        teshik.position.set(x, cy - 0.003, 0.0485);
        g.add(teshik);
        klemmalar[id] = { pos: [x, cy - 0.003, 0.05], dir: [0, 0, 1] };
      });
    });
    g.add(c.yorliq(c.el.id, { x: 0, y: H / 2 + 0.022, z: 0.04, olcham: 0.026 }));
    return { obj: g, klemmalar, bosish: [] };
  },
};
