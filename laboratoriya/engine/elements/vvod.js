// Tarmoq kirishi 220 V (TN-S): L, N va PE manba klemmalari.
// Manba: L doimo kuchlanish ostida (tarmoq), N — ishchi nol, PE — himoya o‘tkazgichi.

export default {
  tur: 'vvod',
  belgi: 'VVOD',
  nomi: { uz: 'Tarmoq kirishi 220 V', ru: 'Ввод сети 220 В', en: 'Mains input 220 V' },

  klemmalar: () => [
    { id: 'L', yorliq: 'L', nomi: { uz: 'faza (L)', ru: 'фаза (L)', en: 'phase (L)' }, xy: [0, -80], dir2d: [1, 0], maks: 2 },
    { id: 'N', yorliq: 'N', nomi: { uz: 'nol (N)', ru: 'ноль (N)', en: 'neutral (N)' }, xy: [0, 0], dir2d: [1, 0], maks: 2 },
    { id: 'PE', yorliq: 'PE', nomi: { uz: 'himoya (PE)', ru: 'защитный (PE)', en: 'protective earth (PE)' }, xy: [0, 80], dir2d: [1, 0], maks: 2 },
  ],

  boshlangich: () => ({}),
  ichki: () => [],
  manba: { L: 'L', N: 'N', PE: 'PE' },

  // 2D: manba shinasi (oq vertikal plastina, rangli klemma uyalari)
  svg: ({ el }) => `
    <rect class="d-body" x="-24" y="-122" width="48" height="244" rx="5"/>
    <text class="d-txt" x="0" y="-104" text-anchor="middle">~220V</text>
    <circle r="13" cy="-80" fill="#7b4a26"/><text class="d-txt" x="0" y="-56" text-anchor="middle">L</text>
    <circle r="13" cy="0" fill="#1f6fd6"/><text class="d-txt" x="0" y="24" text-anchor="middle">N</text>
    <circle r="13" cy="80" fill="url(#pe-chiziq)"/><text class="d-txt" x="0" y="104" text-anchor="middle">PE</text>
    <text class="d-lbl" x="0" y="146" text-anchor="middle">${el.id} · 220 V</text>`,

  // DIN-reykadagi uchta modulli vintli klemma bloki (L — kulrang, N — ko‘k, PE — sariq-yashil),
  // yuqoridan kiruvchi kabel: tashqi qobiq kesilgan, uchta rangli tomir yuqori vintlarga ulangan.
  // Talaba simlari pastki vintlarga ulanadi.
  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group();
    const xs = [-0.024, 0, 0.024];
    const korpus = [c.mat(0x8e949b, { roughness: 0.55 }), c.mat(0x2f6fd0, { roughness: 0.5 }), null];
    const tomir = [0x7b4a26, 0x1f6fd6, 'pe'];
    const qora = c.mat(0x1d2024, { roughness: 0.85 });
    const klemmalar = {};
    ['L', 'N', 'PE'].forEach((id, i) => {
      const x = xs[i];
      // Blok profili: pastda keng asos, o‘rtada baland "tog‘ cho‘qqisi" shakli
      const pr = new THREE.Shape();
      const P = [[0, -0.034], [0.03, -0.034], [0.036, -0.026], [0.036, -0.016], [0.047, -0.008], [0.047, 0.008], [0.036, 0.016], [0.036, 0.026], [0.03, 0.034], [0, 0.034]];
      pr.moveTo(P[0][0], P[0][1]);
      P.slice(1).forEach(([z, y]) => pr.lineTo(z, y));
      const bw = 0.0215;
      const geo = new THREE.ExtrudeGeometry(pr, { depth: bw - 0.001, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0004, bevelSegments: 1 });
      geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
      geo.translate(x + (bw - 0.001) / 2, 0, 0);
      let mat = korpus[i];
      if (!mat) {
        const tex = c.peTekstura().clone();
        tex.needsUpdate = true;
        tex.repeat.set(3, 1);
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
      }
      g.add(new THREE.Mesh(geo, mat));
      // Markirovka tamg‘asi (cho‘qqida)
      const tag = c.quti(0.016, 0.009, 0.0012, c.mat(0xffffff, { roughness: 0.5 }));
      tag.position.set(x, 0, 0.0476);
      g.add(tag);
      g.add(c.yorliq(id, { x, y: 0, z: 0.049, olcham: 0.008, fon: null }));
      // Yuqori (kirish) va pastki (talaba) vintlar quduqlarda
      for (const sg of [1, -1]) {
        const q = c.quti(0.014, 0.011, 0.002, qora);
        q.position.set(x, sg * 0.021, 0.0355);
        g.add(q);
        const v = c.vint(0.0042);
        v.position.set(x, sg * 0.0215, 0.0366);
        g.add(v);
      }
      klemmalar[id] = { pos: [x, -0.0215, 0.04], dir: [0, -0.7, 0.7] };
      // Kiruvchi tomir: kabel uchidan yuqori vintga
      const tm = tomir[i] === 'pe' ? c.peMat() : c.mat(tomir[i], { roughness: 0.45 });
      const egri = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.006 * (i - 1), 0.095, 0.022),
        new THREE.Vector3(x * 0.8, 0.07, 0.03),
        new THREE.Vector3(x, 0.045, 0.042),
        new THREE.Vector3(x, 0.03, 0.038),
        new THREE.Vector3(x, 0.022, 0.0355),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(egri, 24, 0.0024, 8, false), tm));
    });
    // Oxirgi qopqoq plastinka
    const plast = c.quti(0.002, 0.066, 0.034, c.mat(0x7c828a, { roughness: 0.6 }));
    plast.position.set(0.0365, 0, 0.017);
    g.add(plast);
    // Kiruvchi kabel (kulrang qobiq) — shiftgacha
    const uz = Math.max(0.1, c.xona.balandlik - c.el.pozitsiya3d[1]);
    const kab = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, uz, 16), c.mat(0x5c6066, { roughness: 0.7 }));
    kab.position.set(0, 0.095 + uz / 2, 0.022);
    g.add(kab);
    const uch = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0075, 0.006, 16), c.mat(0x3f4348, { roughness: 0.7 }));
    uch.position.set(0, 0.097, 0.022);
    g.add(uch);
    g.add(c.yorliq('VVOD 220 V', { x: -0.045, y: 0.105, z: 0.04, olcham: 0.016 }));
    return { obj: g, klemmalar, bosish: [] };
  },
};
