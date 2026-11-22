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

  // 2D: ochiq taqsimlash qutisi, ichida Wago klemma bloklari (to‘q sariq richaglar)
  svg({ el, param }) {
    const { w, h } = olcham2d(param);
    let s = `<rect class="d-quti" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="14"/>
      <text class="d-lbl" x="${-w / 2}" y="${-h / 2 - 12}">${el.id} · JB</text>`;
    bloklar(param).forEach((portlar, bi) => {
      const y = (bi - (param.bloklar - 1) / 2) * QATOR_2D + 10;
      const x0 = (0 - (param.portlar - 1) / 2) * QADAM_2D + 14;
      const x1 = (param.portlar - 1 - (param.portlar - 1) / 2) * QADAM_2D + 14;
      s += `<rect class="d-wago" x="${x0 - 22}" y="${y - 16}" width="${x1 - x0 + 44}" height="32" rx="5"/>`;
      portlar.forEach((_, pi) => {
        const x = x0 + pi * QADAM_2D;
        s += `<rect x="${x - 9}" y="${y - 22}" width="18" height="7" rx="2" fill="#ff7a00"/>`;
      });
      s += `<text class="d-lbl" x="${x0 - 32}" y="${y + 4}" text-anchor="end">${portlar[0][0]}</text>`;
    });
    return s;
  },

  // Real taqsimlash qutisi (qopqog‘i olingan): yumaloq burchakli kulrang korpus, devorlarida kabel kirish
  // membranalari, burchaklarida qopqoq vintlari uchun ustunchalar. Ichida Wago 221 turidagi klemmalar:
  // shaffof korpus (ichida mis shina ko‘rinadi), har port ustida to‘q sariq richag.
  model3d(c) {
    const { THREE, param } = c;
    const g = new THREE.Group();
    const kul = c.mat(0xc9ccd0, { roughness: 0.62 });
    const kulTuq = c.mat(0xa9adb3, { roughness: 0.7 });
    const W = 0.26, H = 0.22, D = 0.075, T = 0.007;
    const orqa = new THREE.Mesh(c.ekstr(c.shakl(W - 0.004, H - 0.004, 0.02), 0.005, 0.001), kul);
    g.add(orqa);
    const devor = c.shakl(W, H, 0.024);
    devor.holes.push(c.shakl(W - 2 * T, H - 2 * T, 0.018));
    g.add(new THREE.Mesh(c.ekstr(devor, D, 0.0018, 8), kul));
    // Old qirradagi germetik paz
    const paz = c.shakl(W - 0.003, H - 0.003, 0.023);
    paz.holes.push(c.shakl(W - 2 * T + 0.003, H - 2 * T + 0.003, 0.019));
    const pm = new THREE.Mesh(c.ekstr(paz, 0.0012, 0), c.mat(0x8f949a, { roughness: 0.8 }));
    pm.position.z = D - 0.0004;
    g.add(pm);
    // Kabel kirish membranalari (har devorda), ichida konsentrik halqa
    const membr = c.mat(0x9da2a8, { roughness: 0.85 });
    const kirishlar = [[0, H / 2, 0], [0, -H / 2, 0], [-W / 2, 0, Math.PI / 2], [W / 2, 0, Math.PI / 2], [-W / 4, H / 2, 0], [W / 4, -H / 2, 0]];
    for (const [x, y, rz] of kirishlar) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.004, 28), membr);
      m.rotation.z = rz;
      m.position.set(x + (rz ? Math.sign(x) * 0.0015 : 0), y + (rz ? 0 : Math.sign(y) * 0.0015), D * 0.5);
      g.add(m);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0012, 6, 24), kulTuq);
      h.rotation.x = rz ? 0 : Math.PI / 2;
      h.rotation.y = rz ? Math.PI / 2 : 0;
      h.position.set(x + (rz ? Math.sign(x) * 0.0037 : 0), y + (rz ? 0 : Math.sign(y) * 0.0037), D * 0.5);
      g.add(h);
    }
    // Qopqoq vintlari uchun ustunchalar
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const u = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, D - 0.006, 16), kul);
      u.rotation.x = Math.PI / 2;
      u.position.set(sx * (W / 2 - T - 0.007), sy * (H / 2 - T - 0.007), D / 2);
      g.add(u);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.002, 12), c.mat(0x3a3d42));
      t.rotation.x = Math.PI / 2;
      t.position.set(sx * (W / 2 - T - 0.007), sy * (H / 2 - T - 0.007), D - 0.002);
      g.add(t);
    }
    // Wago 221 klemmalari: 2 ustun
    const qadam = 0.024;
    const klemmalar = {};
    const bl = bloklar(param);
    const qatorlar = Math.ceil(bl.length / 2);
    const tanaMat = new THREE.MeshPhysicalMaterial({ color: 0xe9eef2, roughness: 0.18, transparent: true, opacity: 0.55, depthWrite: false });
    const asosMat = c.mat(0xd6dade, { roughness: 0.5 });
    const dastakMat = c.mat(0xff7a00, { roughness: 0.42 });
    const misMat = c.mat(0xd08a4a, { metalness: 0.85, roughness: 0.3 });
    const teshikMat = c.mat(0x22252b, { roughness: 0.9 });
    bl.forEach((portlar, i) => {
      const cx = ((i % 2) - 0.5) * 0.112;
      const cy = ((qatorlar - 1) / 2 - Math.floor(i / 2)) * 0.075 - 0.005;
      const bw = portlar.length * qadam + 0.008;
      // Orqa (kulrang) qism va shaffof old qism
      const asos = new THREE.Mesh(c.ekstr(c.shakl(bw, 0.022, 0.003), 0.012, 0.0008), asosMat);
      asos.position.set(cx, cy, 0.012);
      g.add(asos);
      const tana = new THREE.Mesh(c.ekstr(c.shakl(bw, 0.022, 0.003), 0.025, 0.001), tanaMat);
      tana.position.set(cx, cy, 0.024);
      tana.renderOrder = 2;
      g.add(tana);
      // Ichki mis shina (barcha portlarni birlashtiradi)
      const shina = c.quti(bw - 0.01, 0.006, 0.0015, misMat);
      shina.position.set(cx, cy - 0.002, 0.034);
      g.add(shina);
      g.add(c.yorliq(portlar[0][0], { x: cx - bw / 2 - 0.012, y: cy, z: 0.05, olcham: 0.018 }));
      portlar.forEach((id, pi) => {
        const x = cx + (pi - (portlar.length - 1) / 2) * qadam;
        // Richag: profil shakli, ustki qismida
        const rsh = new THREE.Shape();
        rsh.moveTo(0, 0); rsh.lineTo(0.03, 0); rsh.lineTo(0.033, 0.003); rsh.lineTo(0.031, 0.007); rsh.lineTo(0.006, 0.006); rsh.lineTo(0, 0.004); rsh.lineTo(0, 0);
        const rg = new THREE.ExtrudeGeometry(rsh, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 1 });
        // shakl x → dunyo z (oldinga), shakl y → dunyo y, cho‘zilish → dunyo x
        rg.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
        rg.translate(x + 0.007, cy + 0.011, 0.016);
        g.add(new THREE.Mesh(rg, dastakMat));
        // Sim kirish teshigi (kvadrat) va test teshigi
        const teshik = c.quti(0.0075, 0.0075, 0.0015, teshikMat);
        teshik.position.set(x, cy - 0.003, 0.0497);
        g.add(teshik);
        const test = c.quti(0.003, 0.002, 0.0015, teshikMat);
        test.position.set(x, cy + 0.0065, 0.0497);
        g.add(test);
        klemmalar[id] = { pos: [x, cy - 0.003, 0.051], dir: [0, 0, 1] };
      });
    });
    g.add(c.yorliq(c.el.id, { x: 0, y: H / 2 + 0.022, z: 0.04, olcham: 0.026 }));
    return { obj: g, klemmalar, bosish: [] };
  },
};
