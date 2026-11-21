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
    const W = 0.029; // kenglik (x)
    const oq = c.mat(0xf3f3ef, { roughness: 0.42 });
    const qora = c.mat(0x1d2024, { roughness: 0.85 });

    // Yon profil (z — chuqurlik, y — balandlik), x bo‘ylab cho‘ziladi
    const pr = new THREE.Shape();
    const P = [[0, -0.075], [0.068, -0.075], [0.073, -0.071], [0.073, -0.05], [0.088, -0.041], [0.111, -0.041], [0.115, -0.037],
      [0.115, 0.037], [0.111, 0.041], [0.088, 0.041], [0.073, 0.05], [0.073, 0.071], [0.068, 0.075], [0, 0.075]];
    pr.moveTo(P[0][0], P[0][1]);
    P.slice(1).forEach(([z, y]) => pr.lineTo(z, y));
    const geo = new THREE.ExtrudeGeometry(pr, { depth: W - 0.0016, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0006, bevelSegments: 2 });
    // shakl x → dunyo z, shakl y → dunyo y, cho‘zilish → dunyo x
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));
    geo.translate(-(W - 0.0016) / 2, 0, 0);
    g.add(new THREE.Mesh(geo, oq));

    // Old panel markirovkasi
    const tex = c.tekstura(116, 300, (x, Wp, Hp) => {
      x.fillStyle = '#f3f3ef'; x.fillRect(0, 0, Wp, Hp);
      x.fillStyle = '#1b1b1f'; x.textAlign = 'center';
      x.font = '700 15px Arial, sans-serif'; x.fillText('I-ON', Wp / 2, 26);
      x.fillStyle = '#2a2d33'; x.fillRect(30, 50, 56, 112);
      x.fillStyle = '#1b1b1f';
      x.font = '700 15px Arial, sans-serif'; x.fillText('O-OFF', Wp / 2, 182);
      x.font = '800 38px Arial, sans-serif'; x.fillText(`${param.xarakteristika}${param.nominal}`, Wp / 2, 232);
      x.lineWidth = 2; x.strokeStyle = '#1b1b1f'; x.strokeRect(30, 246, 56, 22);
      x.font = '700 15px Arial, sans-serif'; x.fillText('4500', Wp / 2, 263);
      x.font = '600 12px Arial, sans-serif'; x.fillText('230/400V~', Wp / 2, 288);
    });
    const old = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.002, 0.074), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
    old.position.z = 0.1152;
    g.add(old);

    // Richag (dastak): o‘q atrofida aylanadi
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.0105, 0.112);
    const dastak = new THREE.Mesh(c.ekstr(c.shakl(0.0128, 0.0095, 0.0028), 0.019, 0.0012), c.mat(0x2f3338, { roughness: 0.5 }));
    dastak.position.z = -0.003;
    const uchi = new THREE.Mesh(c.ekstr(c.shakl(0.0134, 0.0102, 0.003), 0.003, 0.0008), c.mat(0x41464d, { roughness: 0.4 }));
    uchi.position.z = 0.0145;
    pivot.add(dastak, uchi);
    g.add(pivot);

    // Holat oynachasi (qizil — yoqilgan, yashil — o‘chgan)
    const oyna = c.quti(0.01, 0.0042, 0.0012, c.mat(0x2fa35a, { roughness: 0.3 }));
    oyna.position.set(0, -0.0035, 0.1157);
    g.add(oyna);

    // DIN qisqichi (pastda, ko‘k tortgich)
    const qisqich = c.quti(0.012, 0.012, 0.006, c.mat(0x2b5fb3, { roughness: 0.5 }));
    qisqich.position.set(0, -0.078, 0.02);
    g.add(qisqich);

    // Klemmalar: yelkadagi chuqur quduqda vint, chetida sim kirish teshigi
    const klemmalar = {};
    [['in', 1], ['out', -1]].forEach(([id, sg]) => {
      const quduq = c.quti(0.017, 0.013, 0.004, qora);
      quduq.position.set(0, sg * 0.061, 0.0718);
      g.add(quduq);
      const v = c.vint(0.0045);
      v.position.set(0, sg * 0.061, 0.0735);
      g.add(v);
      const kirish = c.quti(0.014, 0.002, 0.012, qora);
      kirish.position.set(0, sg * 0.0752, 0.05);
      g.add(kirish);
      klemmalar[id] = { pos: [0, sg * 0.061, 0.077], dir: [0, sg * 0.6, 0.8] };
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
