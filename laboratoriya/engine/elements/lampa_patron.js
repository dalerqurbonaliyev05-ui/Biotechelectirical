// Patronli lampa (shiftga o‘rnatiladi).
// markaz — patronning markaziy kontakti (faza shu yerga ulanadi),
// rezba — patron rezbasi (nol shu yerga ulanadi), PE — metall korpus (himoya o‘tkazgichi).

export default {
  tur: 'lampa_patron',
  belgi: 'HL',
  nomi: { uz: 'Patronli lampa', ru: 'Лампа с патроном', en: 'Lamp with socket' },
  standart: { quvvat: 60 },

  klemmalar: () => [
    { id: 'markaz', yorliq: 'L', nomi: { uz: 'markaziy kontakt', ru: 'центральный контакт', en: 'centre contact' }, xy: [-84, -40], dir2d: [-1, 0], maks: 2 },
    { id: 'rezba', yorliq: 'N', nomi: { uz: 'rezba kontakti', ru: 'резьбовой контакт', en: 'screw-shell contact' }, xy: [-84, 40], dir2d: [-1, 0], maks: 2 },
    { id: 'PE', yorliq: 'PE', nomi: { uz: 'korpus (PE)', ru: 'корпус (PE)', en: 'housing (PE)' }, xy: [-84, 92], dir2d: [-1, 0], maks: 2 },
  ],

  boshlangich: () => ({}),
  ichki: () => [],
  yuklama: { faza: 'markaz', nol: 'rezba', korpus: 'PE' },

  svg({ el, yonadi, param }) {
    const nur = yonadi
      ? [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return `<line class="e-nur" x1="${(38 * Math.cos(r)).toFixed(1)}" y1="${(38 * Math.sin(r)).toFixed(1)}" x2="${(52 * Math.cos(r)).toFixed(1)}" y2="${(52 * Math.sin(r)).toFixed(1)}"/>`;
        }).join('')
      : '';
    return `
      <rect class="e-korpus" x="-46" y="-64" width="92" height="128" rx="6"/>
      <path class="e-ln" d="M-84 -40 H0 V-26"/>
      <path class="e-ln" d="M-84 40 H0 V26"/>
      <path class="e-ln e-pe" d="M-84 92 H0 V64"/>
      ${nur}
      <circle class="e-lampa ${yonadi ? 'on' : ''}" cx="0" cy="0" r="26"/>
      <line class="e-ln" x1="-18.4" y1="-18.4" x2="18.4" y2="18.4"/>
      <line class="e-ln" x1="18.4" y1="-18.4" x2="-18.4" y2="18.4"/>
      <text class="e-lbl" x="56" y="-44">${el.id}</text>
      <text class="e-sub" x="56" y="-26">${param.quvvat} W</text>`;
  },

  // Shiftga o‘rnatilgan patron: gumbazsimon shift rozetkasi, qovurg‘ali karbolit E27 patron, metall rezba,
  // A60 shakldagi shisha lampa ichida filament tolalari. Klemmnik rozetkaning pastida, devor tomonida.
  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group(); // nol nuqta — shift sathi, lampa pastga osilib turadi
    const V2 = (x, y) => new THREE.Vector2(x, y);
    // Shift rozetkasi (gumbaz)
    const gumbaz = [V2(0, 0), V2(0.085, 0), V2(0.086, -0.004), V2(0.083, -0.014), V2(0.07, -0.027), V2(0.045, -0.035), V2(0.026, -0.037), V2(0, -0.037)];
    g.add(new THREE.Mesh(new THREE.LatheGeometry(gumbaz, 48), c.mat(0xf4f4f1, { roughness: 0.4 })));
    // Patron (karbolit, qovurg‘ali)
    const patronP = [V2(0, -0.035), V2(0.016, -0.035), V2(0.018, -0.04)];
    for (let i = 0; i < 6; i++) {
      const y = -0.042 - i * 0.008;
      patronP.push(V2(0.0215, y), V2(0.0215, y - 0.005), V2(0.0198, y - 0.006));
    }
    patronP.push(V2(0.0205, -0.092), V2(0.0185, -0.095), V2(0.0155, -0.095));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(patronP, 40), c.mat(0x2a2c30, { roughness: 0.55 })));
    // Metall rezba (E27)
    const rezbaP = [];
    for (let i = 0; i <= 40; i++) {
      const y = -0.094 - (i / 40) * 0.022;
      rezbaP.push(V2(0.0138 + 0.0009 * Math.sin((i / 40) * Math.PI * 2 * 4.5), y));
    }
    const metall = c.mat(0xc8ccd2, { metalness: 0.9, roughness: 0.25 });
    g.add(new THREE.Mesh(new THREE.LatheGeometry(rezbaP, 32), metall));
    // Shisha (A60): bo‘yindan kengayib, pastda yumaloq
    const shishaP = [];
    for (let i = 0; i <= 28; i++) {
      const u = i / 28;
      const y = -0.115 - u * 0.105;
      let r;
      if (u < 0.3) r = 0.0135 + (0.041 - 0.0135) * Math.sin((u / 0.3) * Math.PI / 2) ** 1.6;
      else r = 0.041 * Math.sqrt(Math.max(0, 1 - ((u - 0.3) / 0.7) ** 2.2));
      shishaP.push(V2(Math.max(0.0005, r), y));
    }
    shishaP.push(V2(0, -0.22));
    const shishaMat = new THREE.MeshStandardMaterial({ color: 0xfdfaf2, emissive: 0xffc46b, emissiveIntensity: 0, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.42, depthWrite: false });
    const shisha = new THREE.Mesh(new THREE.LatheGeometry(shishaP, 40), shishaMat);
    shisha.renderOrder = 3;
    g.add(shisha);
    // Ichki shtativ va filament tolalari
    const shtativ = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.004, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xe8f0f2, transparent: true, opacity: 0.6, roughness: 0.1 }));
    shtativ.position.y = -0.135;
    g.add(shtativ);
    const filMat = new THREE.MeshStandardMaterial({ color: 0xd9a24a, emissive: 0xffa53a, emissiveIntensity: 0, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const egri = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.003 * Math.cos(a), -0.152, 0.003 * Math.sin(a)),
        new THREE.Vector3(0.012 * Math.cos(a), -0.168, 0.012 * Math.sin(a)),
        new THREE.Vector3(0.016 * Math.cos(a), -0.19, 0.016 * Math.sin(a)),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(egri, 12, 0.0009, 6, false), filMat));
    }
    const yorugl = new THREE.PointLight(0xffd59a, 0, 9, 1.6);
    yorugl.position.y = -0.17;
    g.add(yorugl);
    // Klemmnik (oq plastik, 3 qutb) rozetka ostida, devor tomonida; vintlar pastga qaragan
    const klemmalar = {};
    const kk = new THREE.Mesh(c.ekstr(c.shakl(0.12, 0.024, 0.003), 0.01, 0.0008), c.mat(0xf0efeb, { roughness: 0.5 }));
    kk.rotation.x = Math.PI / 2;
    kk.position.set(0, -0.035, -0.03);
    g.add(kk);
    const rangi = { markaz: 0x7b4a26, rezba: 0x1f6fd6, PE: 'pe' };
    [['markaz', -0.042], ['rezba', 0], ['PE', 0.042]].forEach(([id, x]) => {
      const tag = c.quti(0.02, 0.0012, 0.006, rangi[id] === 'pe' ? c.peMat() : c.mat(rangi[id]));
      tag.position.set(x, -0.0456, -0.0405);
      g.add(tag);
      const lap = c.quti(0.014, 0.0008, 0.012, c.mat(0xc9a24a, { metalness: 0.75, roughness: 0.32 }));
      lap.position.set(x, -0.0453, -0.028);
      g.add(lap);
      const v = c.vint(0.0042);
      v.rotation.x = Math.PI / 2; // pastga qaragan vint
      v.position.set(x, -0.0458, -0.028);
      g.add(v);
      klemmalar[id] = { pos: [x, -0.049, -0.028], dir: [0, -0.5, -0.86] };
    });
    g.add(c.yorliq('L', { x: -0.042, y: -0.056, z: -0.044, olcham: 0.013 }));
    g.add(c.yorliq('N', { x: 0, y: -0.056, z: -0.044, olcham: 0.013 }));
    g.add(c.yorliq('PE', { x: 0.042, y: -0.056, z: -0.044, olcham: 0.013 }));
    g.add(c.yorliq(c.el.id, { x: 0.11, y: -0.06, z: 0, olcham: 0.026 }));
    return {
      obj: g,
      klemmalar,
      bosish: [],
      yorugl,
      yangila(h, { yonadi }) {
        shishaMat.emissiveIntensity = yonadi ? 0.9 : 0;
        shishaMat.opacity = yonadi ? 0.75 : 0.42;
        filMat.emissiveIntensity = yonadi ? 4 : 0;
        yorugl.intensity = yonadi ? 2.2 : 0;
      },
    };
  },
};
