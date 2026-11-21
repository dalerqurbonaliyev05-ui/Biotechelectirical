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

  // Real modulli avtomat (17,5 × 90 mm, DIN-reykaga): pog‘onali yon profil, old panelda markirovka,
  // o‘rtada richag va holat oynachasi, tepada va pastda vint quduqlari va sim kirish teshiklari.
  model3d(c) {
    const { THREE, param } = c;
    const g = new THREE.Group();
    const W = 0.029; // kenglik (x); masshtab bilan haqiqiy 17,5 mm modulga mos
    // Termoreaktiv plastik: oq, yarim yaltiroq, ustida yupqa lak qatlami
    const oq = new THREE.MeshPhysicalMaterial({ color: 0xf3f2ec, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.45, envMapIntensity: 0.7 });
    const qora = c.mat(0x15171a, { roughness: 0.9 });
    const metall = c.mat(0xc4c8ce, { metalness: 0.9, roughness: 0.3 });

    // Yon profil (z — chuqurlik, y — balandlik), x bo‘ylab cho‘ziladi
    const pr = new THREE.Shape();
    const P = [[0, -0.075], [0.068, -0.075], [0.073, -0.071], [0.073, -0.05], [0.088, -0.041], [0.111, -0.041], [0.115, -0.037],
      [0.115, 0.037], [0.111, 0.041], [0.088, 0.041], [0.073, 0.05], [0.073, 0.071], [0.068, 0.075], [0, 0.075]];
    pr.moveTo(P[0][0], P[0][1]);
    P.slice(1).forEach(([z, y]) => pr.lineTo(z, y));
    const geo = new THREE.ExtrudeGeometry(pr, { depth: W - 0.0016, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 3 });
    // shakl x → dunyo z, shakl y → dunyo y, cho‘zilish → −x (o‘ng qo‘l bazisi)
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)));
    geo.translate((W - 0.0016) / 2, 0, 0);
    g.add(new THREE.Mesh(geo, oq));

    // Old panel markirovkasi (yuqori aniqlik): ON/OFF, IEC belgisi, nominal, uzish qobiliyati, standart
    const tex = c.tekstura(232, 592, (x, Wp, Hp) => {
      x.fillStyle = '#f3f2ec'; x.fillRect(0, 0, Wp, Hp);
      x.fillStyle = '#0b0b0d'; x.textAlign = 'center';
      x.font = '800 26px Arial, sans-serif'; x.fillText('I  ON', Wp / 2, 46);
      // richag uyasi atrofidagi soya
      const gr = x.createLinearGradient(0, 96, 0, 330);
      gr.addColorStop(0, '#0c0d0f'); gr.addColorStop(0.5, '#25282d'); gr.addColorStop(1, '#0c0d0f');
      x.fillStyle = gr;
      x.beginPath(); x.roundRect(58, 96, 116, 236, 10); x.fill();
      x.fillStyle = '#18181c';
      x.font = '800 26px Arial, sans-serif'; x.fillText('O  OFF', Wp / 2, 370);
      x.font = '900 80px Arial, sans-serif'; x.fillText(`${param.xarakteristika}${param.nominal}`, Wp / 2, 458);
      x.lineWidth = 3; x.strokeStyle = '#18181c'; x.strokeRect(62, 478, 108, 40);
      x.font = '800 30px Arial, sans-serif'; x.fillText('4500', Wp / 2, 508);
      x.font = '700 20px Arial, sans-serif'; x.fillText('230/400V ~', Wp / 2, 546);
      x.font = '500 13px Arial, sans-serif'; x.fillText('IEC/EN 60898-1', Wp / 2, 572);
      // avtomat sxematik belgisi (chapda)
      x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(26, 398); x.lineTo(26, 420); x.lineTo(16, 438); x.moveTo(26, 446); x.lineTo(26, 466);
      x.moveTo(21, 415); x.lineTo(31, 425); x.moveTo(31, 415); x.lineTo(21, 425); x.stroke();
      x.strokeRect(198, 410, 14, 22);
    });
    tex.anisotropy = 8;
    const old = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.002, 0.074), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.45, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.5 }));
    old.position.z = 0.1162;
    g.add(old);
    // Shaffof yorliq qopqog‘i (nominal ustida)
    const qopqoq = new THREE.Mesh(c.ekstr(c.shakl(W - 0.005, 0.024, 0.002), 0.0016, 0.0005), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false }));
    qopqoq.position.set(0, -0.022, 0.1162);
    qopqoq.userData.soyasiz = true;
    g.add(qopqoq);

    // Richag uyasi (chuqurcha) va qovurg‘ali richag
    const uya = c.quti(0.0145, 0.03, 0.006, qora);
    uya.position.set(0, 0.0105, 0.1145);
    g.add(uya);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.0105, 0.111);
    const dastakMat = new THREE.MeshPhysicalMaterial({ color: 0x2c3036, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 });
    const dastak = new THREE.Mesh(c.ekstr(c.shakl(0.0126, 0.0095, 0.0028), 0.02, 0.0012), dastakMat);
    dastak.position.z = -0.003;
    pivot.add(dastak);
    for (let i = 0; i < 4; i++) {
      const q = c.quti(0.0118, 0.0007, 0.0012, c.mat(0x3c4148, { roughness: 0.5 }));
      q.position.set(0, 0.0049, 0.003 + i * 0.0035);
      pivot.add(q);
    }
    const uchi = new THREE.Mesh(c.ekstr(c.shakl(0.0132, 0.0104, 0.003), 0.003, 0.0009), dastakMat);
    uchi.position.z = 0.0155;
    pivot.add(uchi);
    g.add(pivot);

    // Holat oynachasi (qizil — yoqilgan, yashil — o‘chgan), shisha ostida
    const oyna = c.quti(0.011, 0.0045, 0.0012, c.mat(0x2fa35a, { roughness: 0.3 }));
    oyna.position.set(0, -0.0038, 0.1166);
    g.add(oyna);

    // Yon parchinlar (korpus ikki yarmini biriktiradi)
    for (const sx of [-1, 1]) for (const [y, z] of [[0.045, 0.035], [-0.045, 0.035], [0, 0.095]]) {
      const pr2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0008, 16), metall);
      pr2.rotation.z = Math.PI / 2;
      pr2.position.set(sx * (W / 2 + 0.0002), y, z);
      g.add(pr2);
    }

    // DIN qisqichi (pastda, tortgichli) va reykaga ilinadigan tirqish
    const qisqich = new THREE.Mesh(c.ekstr(c.shakl(0.012, 0.014, 0.002), 0.006, 0.0008), c.mat(0x9aa0a8, { roughness: 0.55 }));
    qisqich.position.set(0, -0.079, 0.012);
    g.add(qisqich);
    const tirqish = c.quti(0.005, 0.0025, 0.0012, qora);
    tirqish.position.set(0, -0.083, 0.0185);
    g.add(tirqish);

    // Klemmalar: yelkadagi chuqurchada metall qisqich va vint; chetida sim kirish teshigi (ichida qisqich ko‘rinadi)
    const klemmalar = {};
    [['in', 1], ['out', -1]].forEach(([id, sg]) => {
      const quduq = c.quti(0.017, 0.013, 0.004, qora);
      quduq.position.set(0, sg * 0.061, 0.0718);
      g.add(quduq);
      const plast = c.quti(0.012, 0.0095, 0.0008, metall);
      plast.position.set(0, sg * 0.061, 0.0738);
      g.add(plast);
      const v = c.vint(0.0045);
      v.position.set(0, sg * 0.061, 0.0745);
      g.add(v);
      const kirish = c.quti(0.015, 0.0022, 0.013, qora);
      kirish.position.set(0, sg * 0.0752, 0.05);
      g.add(kirish);
      const kafas = c.quti(0.011, 0.0012, 0.009, metall);
      kafas.position.set(0, sg * 0.0757, 0.05);
      g.add(kafas);
      klemmalar[id] = { pos: [0, sg * 0.061, 0.078], dir: [0, sg * 0.6, 0.8] };
    });
    g.add(c.yorliq('1', { x: 0.026, y: 0.064, z: 0.07, olcham: 0.016 }));
    g.add(c.yorliq('2', { x: 0.026, y: -0.064, z: 0.07, olcham: 0.016 }));
    g.add(c.yorliq(c.el.id, { x: 0, y: 0.1, z: 0.06, olcham: 0.024 }));
    return {
      obj: g,
      klemmalar,
      bosish: [dastak, uchi, old],
      yangila(h) {
        pivot.rotation.x = h.yoqilgan ? -0.62 : 0.62;
        oyna.material = h.yoqilgan ? c.mat(0xd8312b, { roughness: 0.3 }) : c.mat(0x2fa35a, { roughness: 0.3 });
      },
    };
  },
};
