// 3D ko‘rinish (three.js): xona, devordagi shit, taqsimlash qutisi, kalit va shiftdagi lampa.
// Klemmaga bosib sim tortiladi, simlar tanlangan rangdagi egri chiziq (tube) bo‘lib ko‘rinadi.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RANGLAR } from './ranglar.js';
import { t } from './i18n.js';

export function webglBormi() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const FOKUS_NOMI = { avtomat_1p: '3d.shit', taqsimlash_qutisi: '3d.quti', kalit_1: '3d.kalit', lampa_patron: '3d.lampa' };
const RANG_MARKER = { bosh: 0xa3acb6, band: 0x2fa35a, tanlangan: 0xffb020, belgi: 0xe5484d, hover: 0x6d4aff };

export class View3D {
  constructor(root, lab) {
    this.root = root;
    this.lab = lab;
    const s3 = lab.sxema.sahna3d || {};
    this.s3 = s3;
    this.xona = { kenglik: 4.6, balandlik: 2.7, chuqurlik: 4.2, ...(s3.xona || {}) };
    const fokus = lab.els.filter((e) => FOKUS_NOMI[e.tur]);
    root.innerHTML = `
      <div class="v3d">
        <canvas class="v3d-c" tabindex="0"></canvas>
        <div class="v3d-tip" hidden></div>
        <div class="v3d-fokus" role="group">
          <button type="button" class="chip" data-fokus="" data-i18n="3d.umumiy">${t('3d.umumiy')}</button>
          ${fokus.map((e) => `<button type="button" class="chip" data-fokus="${e.id}"><span data-i18n="${FOKUS_NOMI[e.tur]}">${t(FOKUS_NOMI[e.tur])}</span> · ${e.id}</button>`).join('')}
        </div>
        <div class="v3d-flash"></div>
      </div>
      <p class="stage-help" data-i18n="3d.yordam">${t('3d.yordam')}</p>`;
    this.canvas = root.querySelector('canvas');
    this.tip = root.querySelector('.v3d-tip');
    this.flash = root.querySelector('.v3d-flash');
    this.kesh = new Map();
    this.kl = new Map(); // full → {hit, marker, obj, dir}
    this.modellar = new Map(); // elId → model
    this.simObj = new Map(); // simId → {mesh, hit, curve, mat}
    this.bosiladigan = [];
    this.oqim = [];
    this.uchqunlar = [];
    this.faol = true;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfe3e8);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.02, 30);
    const kam = s3.kamera || { pozitsiya: [0.2, 1.55, 3.1], nishon: [-0.3, 1.7, 0.2] };
    this.camera.position.set(...kam.pozitsiya);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(...kam.nishon);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 0.18;
    this.controls.maxDistance = 4.2;
    this.controls.zoomSpeed = 1.1;
    this.controls.addEventListener('change', () => this.chegarala());
    this.umumiy = { pos: this.camera.position.clone(), nishon: this.controls.target.clone() };

    this.xonaQur();
    this.bezaklarQur();
    this.elementlarQur();
    this.scene.updateMatrixWorld(true);
    this.simlarQur();
    this.holatYangila();

    this.ochir = lab.on((tur, d) => {
      if (tur === 'ozgardi') {
        if (['sim', 'javob', 'qayta'].includes(d.sabab)) this.simlarQur();
        this.holatYangila();
      }
      if (tur === 'qisqa') this.uchqun(d.el);
    });

    this.hodisalar();
    this.ro = new ResizeObserver(() => this.olcham());
    this.ro.observe(this.canvas.parentElement);
    this.olcham();
    this.soat = new THREE.Clock();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (this.faol) this.kadr(); };
    loop();
  }

  korinsin(v) { this.faol = v; if (v) this.olcham(); }

  // ---------- materiallar va yordamchilar ----------
  mat(hex, o = {}) {
    const key = `${hex}|${o.roughness ?? ''}|${o.metalness ?? ''}`;
    if (!this.kesh.has(key)) this.kesh.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0 }));
    return this.kesh.get(key);
  }

  peTekstura() {
    if (!this._pe) {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 16;
      const x = c.getContext('2d');
      x.fillStyle = RANGLAR.sariq_yashil.hex; x.fillRect(0, 0, 64, 16);
      x.fillStyle = RANGLAR.sariq_yashil.hex2;
      for (let i = -16; i < 64; i += 32) { x.beginPath(); x.moveTo(i, 16); x.lineTo(i + 16, 0); x.lineTo(i + 32, 0); x.lineTo(i + 16, 16); x.fill(); }
      this._pe = new THREE.CanvasTexture(c);
      this._pe.colorSpace = THREE.SRGBColorSpace;
      this._pe.wrapS = this._pe.wrapT = THREE.RepeatWrapping;
    }
    return this._pe;
  }

  peMat() {
    if (!this._peMat) this._peMat = new THREE.MeshStandardMaterial({ map: this.peTekstura(), roughness: 0.5 });
    return this._peMat;
  }

  yorliq(matn, o = {}) {
    const c = document.createElement('canvas');
    const px = 64;
    const x = c.getContext('2d');
    x.font = `700 ${px * 0.62}px Manrope, system-ui, sans-serif`;
    const w = Math.ceil(x.measureText(matn).width + px * 0.5);
    c.width = w; c.height = px;
    x.font = `700 ${px * 0.62}px Manrope, system-ui, sans-serif`;
    if (o.fon !== null) {
      x.fillStyle = o.fon || 'rgba(255,255,255,.9)';
      const r = px * 0.28;
      x.beginPath(); x.roundRect(0, 0, w, px, r); x.fill();
    }
    x.fillStyle = o.rang || '#1b1440';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(matn, w / 2, px * 0.54);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
    const h = o.olcham || 0.03;
    s.scale.set((h * w) / px, h, 1);
    s.position.set(o.x || 0, o.y || 0, o.z || 0);
    s.renderOrder = 2;
    return s;
  }

  // Krest shlitsli (Pozidriv) vint: yarim sferik bosh, ikki kesishgan shlits.
  vint(r = 0.0052) {
    const g = new THREE.Group();
    const metal = this.mat(0xc9cdd3, { metalness: 0.9, roughness: 0.28 });
    const bosh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal);
    bosh.rotation.x = Math.PI / 2;
    bosh.scale.set(1, 0.42, 1);
    g.add(bosh);
    const shlisMat = this.mat(0x2e3238, { roughness: 0.8 });
    for (const rot of [0, Math.PI / 2]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(r * 1.45, r * 0.26, r * 0.5), shlisMat);
      sh.position.z = r * 0.32;
      sh.rotation.z = rot + Math.PI / 4;
      g.add(sh);
    }
    return g;
  }

  /** Burchaklari yumaloq to‘rtburchak shakli (markazi 0,0). */
  shakl(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /** Shaklni z o‘qi bo‘ylab qalinlik bilan cho‘zadi (old yuzasi z = d da), qirralari biroz yumaloq. */
  ekstr(shakl, d, qirra = 0.0008, egriSeg = 6) {
    const b = Math.min(qirra, d / 3);
    const geo = new THREE.ExtrudeGeometry(shakl, { depth: d - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: egriSeg });
    geo.translate(0, 0, b);
    return geo;
  }

  /** Kanvasga chizilgan tekstura (yozuv, belgi, shkala). */
  tekstura(wPx, hPx, chiz) {
    const c = document.createElement('canvas');
    c.width = wPx; c.height = hPx;
    chiz(c.getContext('2d'), wPx, hPx);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  ctx(el) {
    return {
      THREE, el, param: el.param, xona: this.xona,
      mat: (h, o) => this.mat(h, o),
      peMat: () => this.peMat(),
      peTekstura: () => this.peTekstura(),
      quti: (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m),
      vint: (r) => this.vint(r),
      shakl: (w, h, r) => this.shakl(w, h, r),
      ekstr: (sh, d, q, seg) => this.ekstr(sh, d, q, seg),
      tekstura: (w, h, f) => this.tekstura(w, h, f),
      yorliq: (m, o) => this.yorliq(m, o),
    };
  }

  // ---------- sahna ----------
  xonaQur() {
    const { kenglik: W, balandlik: H, chuqurlik: D } = this.xona;
    const tekis = (w, h, rang, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat(rang, { roughness: o.r ?? 0.92 }));
    const pol = tekis(W, D, 0xc8ae8c, { r: 0.75 });
    pol.rotation.x = -Math.PI / 2; pol.position.set(0, 0, D / 2);
    const devor = tekis(W, H, 0xf2efe8); devor.position.set(0, H / 2, 0);
    const chap = tekis(D, H, 0xe8e4dc); chap.rotation.y = Math.PI / 2; chap.position.set(-W / 2, H / 2, D / 2);
    const ong = tekis(D, H, 0xe8e4dc); ong.rotation.y = -Math.PI / 2; ong.position.set(W / 2, H / 2, D / 2);
    const shift = tekis(W, D, 0xfbfbfa); shift.rotation.x = Math.PI / 2; shift.position.set(0, H, D / 2);
    this.scene.add(pol, devor, chap, ong, shift);
    const plintus = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, 0.014), this.mat(0xffffff));
    plintus.position.set(0, 0.035, 0.007);
    this.scene.add(plintus);
    // Eshik (kalit odatda eshik yonida bo‘ladi)
    const eshik = new THREE.Group();
    const rom = new THREE.Mesh(new THREE.BoxGeometry(0.98, 2.1, 0.03), this.mat(0xe7e2da));
    rom.position.set(0, 1.05, 0.015);
    const tabaqa = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.02, 0.04), this.mat(0xb98a5e, { roughness: 0.55 }));
    tabaqa.position.set(0, 1.01, 0.03);
    const tutqich = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.03), this.mat(0xc7cbd1, { metalness: 0.8, roughness: 0.3 }));
    tutqich.position.set(-0.33, 1.0, 0.065);
    eshik.add(rom, tabaqa, tutqich);
    eshik.position.set(1.25, 0, 0);
    this.scene.add(eshik);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xe6dccb, 1.2);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.quyosh = new THREE.DirectionalLight(0xffffff, 1.25);
    this.quyosh.position.set(1.2, 2.2, 3.5);
    this.scene.add(this.hemi, this.ambient, this.quyosh);
  }

  // Shit korpusi: oq bo‘yalgan metall quti, eshigi ochiq, ichida perforatsiyali DIN-reyka (TH35).
  bezaklarQur() {
    for (const b of this.s3.bezaklar || []) {
      if (b.tur !== 'shit_korpus') continue;
      const [w, h, d] = b.olcham;
      const g = new THREE.Group();
      const boyoq = this.mat(0xf1f1ee, { roughness: 0.42, metalness: 0.15 });
      const ichki = this.mat(0xe4e5e2, { roughness: 0.6, metalness: 0.1 });
      const T = 0.008;
      const orqa = new THREE.Mesh(new THREE.BoxGeometry(w - 0.004, h - 0.004, 0.004), ichki);
      orqa.position.z = 0.002;
      g.add(orqa);
      // Yon devorlar: yumaloq burchakli ramka
      const devor = this.shakl(w, h, 0.012);
      devor.holes.push(this.shakl(w - 2 * T, h - 2 * T, 0.006));
      const korpus = new THREE.Mesh(this.ekstr(devor, d, 0.0015), boyoq);
      g.add(korpus);
      // Old gardish (eshik yopiladigan qirra)
      const gardish = this.shakl(w + 0.004, h + 0.004, 0.013);
      gardish.holes.push(this.shakl(w - 2 * T - 0.016, h - 2 * T - 0.016, 0.004));
      const gm = new THREE.Mesh(this.ekstr(gardish, 0.004, 0.001), boyoq);
      gm.position.z = d - 0.004;
      g.add(gm);
      // Kabel kirish teshiklari (tepada va pastda)
      const teshik = this.mat(0x3a3d42, { roughness: 0.9 });
      for (const [x, y] of [[-w * 0.22, h / 2], [w * 0.22, h / 2], [-w * 0.22, -h / 2], [0, -h / 2], [w * 0.22, -h / 2]]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 20), teshik);
        t.position.set(x, y + Math.sign(y) * 0.0005, d * 0.45);
        g.add(t);
      }
      // TH35 DIN-reyka: shlyapa profili, perforatsiya bilan
      const reykaMat = this.mat(0xc3c8cf, { metalness: 0.85, roughness: 0.32 });
      for (const y of b.din || [0]) {
        // Profil (mm): o‘rtasi devorga tegadi, 7,5 mm chiqib turgan gardishlarga qurilmalar ilinadi.
        const P = [[-12.5, 0], [12.5, 0], [12.5, 6.5], [17.5, 6.5], [17.5, 7.5], [11.5, 7.5], [11.5, 1], [-11.5, 1], [-11.5, 7.5], [-17.5, 7.5], [-17.5, 6.5], [-12.5, 6.5]];
        const pr = new THREE.Shape();
        pr.moveTo(P[0][0] / 1000, P[0][1] / 1000);
        P.slice(1).forEach(([px, py]) => pr.lineTo(px / 1000, py / 1000));
        const rw = w - 2 * T - 0.012;
        const geo = new THREE.ExtrudeGeometry(pr, { depth: rw, bevelEnabled: false });
        // shakl x → dunyo y, shakl y → dunyo z (chuqurlik), cho‘zilish → dunyo x
        geo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
        geo.translate(-rw / 2, y, 0.004);
        g.add(new THREE.Mesh(geo, reykaMat));
        for (let x = -rw / 2 + 0.012; x < rw / 2 - 0.01; x += 0.025) {
          const tir = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0055, 0.0004), teshik);
          tir.position.set(x, y, 0.0052);
          g.add(tir);
        }
      }
      // Ochiq eshik (chap tomonda, ilmoqlarda)
      const eshik = new THREE.Group();
      const tabaqa = new THREE.Mesh(this.ekstr(this.shakl(w + 0.004, h + 0.004, 0.013), 0.012, 0.0015), boyoq);
      tabaqa.position.set((w + 0.004) / 2, 0, -0.012);
      eshik.add(tabaqa);
      const qulf = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 20), this.mat(0x9aa0a8, { metalness: 0.8, roughness: 0.3 }));
      qulf.rotation.x = Math.PI / 2;
      qulf.position.set(w - 0.012, 0, -0.015);
      eshik.add(qulf);
      eshik.position.set(-w / 2 - 0.002, 0, d);
      eshik.rotation.y = -1.95;
      g.add(eshik);
      for (const y of [h * 0.32, -h * 0.32]) {
        const ilmoq = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.03, 12), this.mat(0xb9bec5, { metalness: 0.85, roughness: 0.3 }));
        ilmoq.position.set(-w / 2 - 0.002, y, d);
        g.add(ilmoq);
      }
      // Ogohlantirish belgisi (chaqmoq) eshik tashqi tomonida
      const belgi = this.tekstura(128, 112, (x, W, H) => {
        x.fillStyle = '#f6c400';
        x.beginPath(); x.moveTo(W / 2, 6); x.lineTo(W - 6, H - 6); x.lineTo(6, H - 6); x.closePath(); x.fill();
        x.lineWidth = 7; x.strokeStyle = '#111'; x.lineJoin = 'round'; x.stroke();
        x.fillStyle = '#111';
        x.beginPath(); x.moveTo(70, 30); x.lineTo(50, 70); x.lineTo(64, 70); x.lineTo(56, 98); x.lineTo(80, 58); x.lineTo(66, 58); x.lineTo(74, 30); x.closePath(); x.fill();
      });
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.0525), new THREE.MeshStandardMaterial({ map: belgi, transparent: true, roughness: 0.5 }));
      bm.rotation.y = Math.PI;
      bm.position.set((w + 0.004) / 2, h * 0.18, -0.0125);
      eshik.add(bm);
      g.position.set(...b.pozitsiya);
      this.scene.add(g);
    }
  }

  elementlarQur() {
    const kurinadigan = new THREE.SphereGeometry(1, 16, 12);
    for (const el of this.lab.els) {
      const m = el.def.model3d(this.ctx(el));
      m.obj.position.set(...el.pozitsiya3d);
      m.obj.scale.setScalar(el.masshtab3d || this.s3.masshtab || 1);
      if (el.burilish3d) m.obj.rotation.y = el.burilish3d;
      this.scene.add(m.obj);
      this.modellar.set(el.id, m);
      for (const mesh of m.bosish || []) {
        mesh.userData = { tur: 'bos', el: el.id };
        this.bosiladigan.push(mesh);
      }
      for (const k of el.klemmalar) {
        const full = `${el.id}.${k.id}`;
        const info = m.klemmalar[k.id];
        if (!info) continue;
        const r = k.r3d || 0.013;
        const hit = new THREE.Mesh(kurinadigan, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        hit.scale.setScalar(r);
        hit.position.set(...info.pos);
        hit.userData = { tur: 'kl', full };
        const marker = new THREE.Mesh(kurinadigan, new THREE.MeshBasicMaterial({ color: RANG_MARKER.bosh, transparent: true, opacity: 0.85, depthTest: true }));
        marker.scale.setScalar(Math.min(0.0055, r * 0.55));
        marker.position.set(...info.pos);
        marker.renderOrder = 1;
        m.obj.add(hit, marker);
        this.kl.set(full, { hit, marker, obj: m.obj, dir: new THREE.Vector3(...info.dir).normalize(), r });
      }
    }
  }

  // ---------- simlar ----------
  kNuqta(full) {
    const k = this.kl.get(full);
    const p = new THREE.Vector3();
    k.hit.getWorldPosition(p);
    const d = k.dir.clone().applyQuaternion(k.obj.getWorldQuaternion(new THREE.Quaternion()));
    return { p, d };
  }

  // Simning yo‘li: qisqa simlar — yumshoq yoy; uzunlari — devor bo‘ylab (kabel kanalidek) to‘g‘ri burchakli,
  // burchaklari yumaloqlangan. Shit ichidan chiqishda avval pastga, shiftdagi lampadan — shift bo‘ylab devorga.
  egri(s, idx) {
    const A = this.kNuqta(s.a), B = this.kNuqta(s.b);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const len = A.p.distanceTo(B.p);
    const H = this.xona.balandlik;
    if (len < 0.35) {
      const chiq = 0.03 + len * 0.08;
      const p1 = A.p.clone().addScaledVector(A.d, chiq), p3 = B.p.clone().addScaledVector(B.d, chiq);
      const m = p1.clone().lerp(p3, 0.5);
      m.z += 0.02 + (idx % 4) * 0.008;
      m.y = Math.min(H - 0.012, m.y - len * 0.12);
      return new THREE.CatmullRomCurve3([A.p, p1, m, p3, B.p], false, 'centripetal');
    }
    const zr = 0.105 + (idx % 8) * 0.0065;
    const dx = ((idx % 7) - 3) * 0.0075;
    const shitlar = (this.s3.bezaklar || []).filter((b) => b.tur === 'shit_korpus');
    const zanjir = (k) => {
      const ao = k.p.clone().addScaledVector(k.d, 0.045);
      const res = [k.p, ao];
      const shit = shitlar.find((b) => Math.abs(ao.x - b.pozitsiya[0]) < b.olcham[0] / 2 && Math.abs(ao.y - b.pozitsiya[1]) < b.olcham[1] / 2);
      if (shit) {
        const y = shit.pozitsiya[1] - shit.olcham[1] / 2 - 0.035 - (idx % 5) * 0.011;
        res.push(V(ao.x, ao.y, zr), V(ao.x, y, zr));
      } else if (ao.z > 0.3 && ao.y > H - 0.3) {
        const y = H - 0.018 - (idx % 5) * 0.007;
        res.push(V(ao.x, y, ao.z), V(ao.x, y, zr));
      } else if (Math.abs(ao.z - zr) > 0.01) {
        res.push(V(ao.x, ao.y, zr));
      }
      return res;
    };
    const za = zanjir(A), zb = zanjir(B).reverse();
    const LA = za[za.length - 1], FB = zb[0];
    const orta = [];
    if (Math.abs(LA.x - FB.x) > 0.01 && Math.abs(LA.y - FB.y) > 0.01) {
      orta.push(V(FB.x + dx, LA.y, zr), V(FB.x + dx, FB.y, zr));
    }
    return new THREE.CatmullRomCurve3(this.yumaloq([...za, ...orta, ...zb]), false, 'centripetal');
  }

  // Siniq chiziq burchaklarini yumaloqlab, zich nuqtalar ro‘yxatini qaytaradi.
  yumaloq(pts) {
    const p = pts.filter((v, i) => i === 0 || v.distanceTo(pts[i - 1]) > 0.002);
    if (p.length < 3) return p.length === 2 ? [p[0], p[0].clone().lerp(p[1], 0.5), p[1]] : p;
    const res = [p[0]];
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const r = Math.min(0.035, a.distanceTo(b) / 2.2, b.distanceTo(c) / 2.2);
      const b1 = b.clone().addScaledVector(a.clone().sub(b).normalize(), r);
      const b2 = b.clone().addScaledVector(c.clone().sub(b).normalize(), r);
      for (let k = 0; k <= 4; k++) {
        const u = k / 4;
        const q = b1.clone().multiplyScalar((1 - u) ** 2).addScaledVector(b, 2 * u * (1 - u)).addScaledVector(b2, u * u);
        res.push(q);
      }
    }
    res.push(p[p.length - 1]);
    return res.filter((v, i) => i === 0 || v.distanceTo(res[i - 1]) > 0.0015);
  }

  simlarQur() {
    for (const o of this.simObj.values()) {
      this.scene.remove(o.mesh, o.hit);
      o.mesh.geometry.dispose(); o.hit.geometry.dispose(); o.mat.dispose();
      if (o.mat.map && o.mat.map !== this._pe) o.mat.map.dispose();
    }
    this.simObj.clear();
    const hitMat = this._hitMat || (this._hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    this.lab.simlar.forEach((s, i) => {
      const curve = this.egri(s, i);
      const len = curve.getLength();
      const r = RANGLAR[s.rang];
      let mat;
      if (r.hex2) {
        const tex = this.peTekstura().clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, len * 26), 1);
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: r.hex, roughness: 0.45 });
      }
      const seg = Math.max(24, Math.round(len * 60));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, 0.0034, 8, false), mat);
      const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, seg >> 1), 0.011, 6, false), hitMat);
      hit.userData = { tur: 'sim', id: s.id };
      this.scene.add(mesh, hit);
      this.simObj.set(s.id, { mesh, hit, curve, mat, len });
    });
  }

  // ---------- holat ----------
  holatYangila() {
    const lab = this.lab;
    const sim = lab.sim;
    let yorug = false;
    for (const el of lab.els) {
      const m = this.modellar.get(el.id);
      const yonadi = !!sim.yuklamalar[el.id]?.yonadi;
      if (yonadi) yorug = true;
      m.yangila?.(lab.holat[el.id] || {}, { yonadi });
    }
    this.hemi.intensity = yorug ? 1.3 : 1.05;
    this.ambient.intensity = yorug ? 0.6 : 0.45;
    this.hemi.color.set(yorug ? 0xfff1dc : 0xffffff);
    for (const [full, k] of this.kl) {
      const r = lab.klemma(full);
      const n = lab.simlarSoni(full);
      let rang = n ? RANG_MARKER.band : RANG_MARKER.bosh;
      if (lab.belgilangan.klemmalar.has(full)) rang = RANG_MARKER.belgi;
      if (lab.tanlangan === full) rang = RANG_MARKER.tanlangan;
      if (this.hover === full && lab.tanlangan !== full) rang = RANG_MARKER.hover;
      k.marker.material.color.set(rang);
      k.tanlangan = lab.tanlangan === full;
      if (!k.tanlangan) k.marker.scale.setScalar(Math.min(0.0055, k.r * 0.55) * (this.hover === full ? 1.5 : 1));
      void r;
    }
    for (const [id, o] of this.simObj) {
      const tan = lab.tanlanganSim === id, bel = lab.belgilangan.simlar.has(id);
      o.mat.emissive?.set(tan ? 0x6d4aff : bel ? 0xe5484d : 0x000000);
      o.mat.emissiveIntensity = tan || bel ? 0.6 : 0;
      o.belgi = bel;
    }
    // Tok oqimi nuqtalari
    for (const d of this.oqim) { this.scene.remove(d.mesh); }
    this.oqim = [];
    const geo = this._oqGeo || (this._oqGeo = new THREE.SphereGeometry(0.0062, 10, 8));
    const mat = this._oqMat || (this._oqMat = new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    for (const o of sim.oqim) {
      const so = this.simObj.get(o.sim);
      if (!so) continue;
      const n = Math.max(2, Math.round(so.len / 0.12));
      for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        this.oqim.push({ mesh, curve: so.curve, len: so.len, faza: i / n, yonalish: o.yonalish });
      }
    }
  }

  // ---------- hodisalar ----------
  hodisalar() {
    const ray = new THREE.Raycaster();
    const nuqta = new THREE.Vector2();
    const tanla = (e) => {
      const r = this.canvas.getBoundingClientRect();
      nuqta.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(nuqta, this.camera);
      const obj = [...[...this.kl.values()].map((k) => k.hit), ...[...this.simObj.values()].map((o) => o.hit), ...this.bosiladigan];
      const hits = ray.intersectObjects(obj, false);
      if (!hits.length) return null;
      // Klemma yaqin bo‘lsa — klemma ustun (sim uchlari klemma ustida tugaydi)
      const kl = hits.find((h) => h.object.userData.tur === 'kl');
      if (kl && kl.distance - hits[0].distance < 0.03) return kl.object.userData;
      return hits[0].object.userData;
    };
    let bosh = null;
    this.canvas.addEventListener('pointerdown', (e) => { bosh = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!bosh) return;
      const siljish = Math.hypot(e.clientX - bosh.x, e.clientY - bosh.y);
      const vaqt = performance.now() - bosh.t;
      bosh = null;
      if (siljish > 7 || vaqt > 700) return;
      const u = tanla(e);
      if (!u) { this.lab.bosh(); return; }
      if (u.tur === 'kl') this.lab.klemmaBosish(u.full);
      else if (u.tur === 'sim') this.lab.simBosish(u.id);
      else if (u.tur === 'bos') this.lab.elementBosish(u.el);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || e.buttons) return;
      const u = tanla(e);
      const yangi = u && u.tur === 'kl' ? u.full : null;
      this.canvas.style.cursor = u ? 'pointer' : 'grab';
      if (yangi !== this.hover) {
        this.hover = yangi;
        this.holatYangila();
      }
      if (yangi) {
        const r = this.canvas.getBoundingClientRect();
        this.tip.hidden = false;
        this.tip.textContent = this.lab.klemmaNomi(yangi);
        this.tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 12}px)`;
      } else this.tip.hidden = true;
    });
    this.canvas.addEventListener('pointerleave', () => { this.tip.hidden = true; });
    this.root.querySelectorAll('[data-fokus]').forEach((b) => b.addEventListener('click', () => this.fokus(b.dataset.fokus)));
  }

  fokus(elId) {
    let pos, nishon;
    if (!elId) { pos = this.umumiy.pos.clone(); nishon = this.umumiy.nishon.clone(); }
    else {
      const m = this.modellar.get(elId);
      const el = this.lab.elMap.get(elId);
      nishon = new THREE.Vector3();
      m.obj.getWorldPosition(nishon);
      if (el.tur === 'lampa_patron') { nishon.y -= 0.08; pos = nishon.clone().add(new THREE.Vector3(0.22, -0.42, 0.42)); }
      else if (el.tur === 'avtomat_1p') { nishon.x -= 0.07; nishon.z += 0.05; pos = nishon.clone().add(new THREE.Vector3(0.08, 0.04, 0.55)); }
      else { nishon.z += 0.04; pos = nishon.clone().add(new THREE.Vector3(0.1, 0.03, 0.48)); }
    }
    this.tween = { t0: performance.now(), d: 650, p0: this.camera.position.clone(), n0: this.controls.target.clone(), p1: pos, n1: nishon };
  }

  chegarala() {
    const { kenglik: W, balandlik: H, chuqurlik: D } = this.xona;
    const p = this.camera.position;
    p.x = Math.min(W / 2 - 0.05, Math.max(-W / 2 + 0.05, p.x));
    p.y = Math.min(H - 0.04, Math.max(0.12, p.y));
    p.z = Math.min(D - 0.05, Math.max(0.09, p.z));
  }

  uchqun(elId) {
    const el = elId ? this.lab.elMap.get(elId) : this.lab.els.find((e) => e.def.manba);
    if (!el) return;
    const m = this.modellar.get(el.id);
    const p = new THREE.Vector3();
    m.obj.getWorldPosition(p);
    p.z += 0.1;
    const n = 70;
    const pos = new Float32Array(n * 3), tez = [];
    for (let i = 0; i < n; i++) {
      pos.set([p.x, p.y, p.z], i * 3);
      tez.push(new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.4, Math.random() * 1.2));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xfff1a8, size: 0.014, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    const nur = new THREE.PointLight(0xa8d8ff, 30, 3, 2);
    nur.position.copy(p);
    this.scene.add(pts, nur);
    this.uchqunlar.push({ pts, nur, tez, t: 0 });
    this.flash.classList.remove('on');
    void this.flash.offsetWidth;
    this.flash.classList.add('on');
  }

  olcham() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  kadr() {
    const dt = Math.min(0.05, this.soat.getDelta());
    const now = performance.now();
    if (this.tween) {
      const tw = this.tween;
      const u = Math.min(1, (now - tw.t0) / tw.d);
      const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.n0, tw.n1, e);
      if (u >= 1) this.tween = null;
    }
    this.controls.update();
    // Tanlangan klemma pulsatsiyasi, xato simlar miltillashi
    const puls = 1 + 0.45 * Math.sin(now / 160);
    for (const k of this.kl.values()) if (k.tanlangan) k.marker.scale.setScalar(Math.min(0.0055, k.r * 0.55) * 1.7 * puls);
    for (const o of this.simObj.values()) if (o.belgi) o.mat.emissiveIntensity = 0.35 + 0.35 * Math.sin(now / 200);
    for (const d of this.oqim) {
      let u = (d.faza + (now / 1000) * (0.2 / Math.max(0.2, d.len))) % 1;
      if (d.yonalish < 0) u = 1 - u;
      d.mesh.position.copy(d.curve.getPointAt(u));
    }
    for (let i = this.uchqunlar.length - 1; i >= 0; i--) {
      const u = this.uchqunlar[i];
      u.t += dt;
      const a = u.pts.geometry.attributes.position;
      for (let j = 0; j < u.tez.length; j++) {
        u.tez[j].y -= 3.2 * dt;
        a.setXYZ(j, a.getX(j) + u.tez[j].x * dt * 0.5, a.getY(j) + u.tez[j].y * dt * 0.5, a.getZ(j) + u.tez[j].z * dt * 0.5);
      }
      a.needsUpdate = true;
      u.pts.material.opacity = Math.max(0, 1 - u.t / 0.9);
      u.nur.intensity = Math.max(0, 30 * (1 - u.t / 0.25));
      if (u.t > 0.9) {
        this.scene.remove(u.pts, u.nur);
        u.pts.geometry.dispose(); u.pts.material.dispose();
        this.uchqunlar.splice(i, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  yoqot() {
    this.ochir();
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
