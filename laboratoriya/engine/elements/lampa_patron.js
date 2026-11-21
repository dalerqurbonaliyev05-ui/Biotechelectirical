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

  model3d(c) {
    const { THREE } = c;
    const g = new THREE.Group(); // nol nuqta — shift sathi, lampa pastga osilib turadi
    const oq = c.mat(0xf4f4f2, { roughness: 0.5 });
    const asos = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.034, 40), oq);
    asos.position.y = -0.017;
    g.add(asos);
    const patron = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.07, 24), c.mat(0x30333a, { roughness: 0.6 }));
    patron.position.y = -0.07;
    g.add(patron);
    const rezba = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 20), c.mat(0xb9bcc2, { metalness: 0.8, roughness: 0.3 }));
    rezba.position.y = -0.112;
    g.add(rezba);
    const shishaMat = new THREE.MeshStandardMaterial({ color: 0xfdfaf0, emissive: 0xffc46b, emissiveIntensity: 0, roughness: 0.15, transparent: true, opacity: 0.92 });
    const lampa = new THREE.Mesh(new THREE.SphereGeometry(0.042, 32, 20), shishaMat);
    lampa.position.y = -0.16;
    g.add(lampa);
    const boyin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.03, 24), shishaMat);
    boyin.position.y = -0.128;
    g.add(boyin);
    const yorugl = new THREE.PointLight(0xffd59a, 0, 9, 1.6);
    yorugl.position.y = -0.17;
    g.add(yorugl);
    // Klemmalar asosning pastki yuzasida, devor tomonida
    const klemmalar = {};
    const rangi = { markaz: 0x7b4a26, rezba: 0x1f6fd6, PE: 'pe' };
    [['markaz', -0.042], ['rezba', 0], ['PE', 0.042]].forEach(([id, x]) => {
      const tag = c.quti(0.022, 0.004, 0.014, rangi[id] === 'pe' ? c.peMat() : c.mat(rangi[id]));
      tag.position.set(x, -0.036, 0.03);
      g.add(tag);
      const v = c.vint();
      v.rotation.x = Math.PI / 2; // pastga qaragan vint
      v.position.set(x, -0.036, -0.03);
      g.add(v);
      klemmalar[id] = { pos: [x, -0.04, -0.03], dir: [0, -0.5, -0.86] };
    });
    g.add(c.yorliq('L', { x: -0.042, y: -0.052, z: 0.032, olcham: 0.016 }));
    g.add(c.yorliq('N', { x: 0, y: -0.052, z: 0.032, olcham: 0.016 }));
    g.add(c.yorliq('PE', { x: 0.042, y: -0.052, z: 0.032, olcham: 0.016 }));
    g.add(c.yorliq(c.el.id, { x: 0.11, y: -0.06, z: 0, olcham: 0.026 }));
    return {
      obj: g,
      klemmalar,
      bosish: [],
      yorugl,
      yangila(h, { yonadi }) {
        shishaMat.emissiveIntensity = yonadi ? 1.6 : 0;
        yorugl.intensity = yonadi ? 2.2 : 0;
      },
    };
  },
};
