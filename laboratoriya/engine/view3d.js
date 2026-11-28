// 3D ko‘rinish (three.js): xona, devordagi shit, taqsimlash qutisi, kalit va shiftdagi lampa.
// Klemmaga bosib sim tortiladi, simlar tanlangan rangdagi egri chiziq (tube) bo‘lib ko‘rinadi.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RANGLAR } from './ranglar.js';
import { t } from './i18n.js';
import { sifatAniqla } from './sifat.js';
import { statikBirlashtir } from './birlash.js';

import { avtoJoylash, avtoModel, joyTuri, yol2d } from './view3d-avto.js';

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
    // Sxemada qo‘lda yozilgan sahna bo‘lmasa — avtomatik joylash (shit, devor, shift, pol)
    this.avto = lab.sxema.sahna3d ? null : avtoJoylash(lab);
    const s3 = lab.sxema.sahna3d || this.avto.s3;
    this.s3 = s3;
    this.xona = { kenglik: 4.6, balandlik: 2.7, chuqurlik: 4.2, ...(s3.xona || {}) };
    const fokus = this.avto ? [] : lab.els.filter((e) => FOKUS_NOMI[e.tur]);
    const avtoFokus = this.avto ? [`<button type="button" class="chip" data-fokus="__shit"><span data-i18n="3d.shit">${t('3d.shit')}</span></button>`,
      ...lab.els.filter((e) => joyTuri(e.tur) !== 'shit').map((e) => `<button type="button" class="chip" data-fokus="${e.id}">${e.id}</button>`)].join('') : '';
    root.innerHTML = `
      <div class="v3d">
        <canvas class="v3d-c" tabindex="0"></canvas>
        <div class="v3d-tip" hidden></div>
        <div class="v3d-fokus" role="group">
          <button type="button" class="chip" data-fokus="" data-i18n="3d.umumiy">${t('3d.umumiy')}</button>
          ${fokus.map((e) => `<button type="button" class="chip" data-fokus="${e.id}"><span data-i18n="${FOKUS_NOMI[e.tur]}">${t(FOKUS_NOMI[e.tur])}</span> · ${e.id}</button>`).join('')}${avtoFokus}
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
    this._mL = new THREE.Matrix4(); this._mM = new THREE.Matrix4(); this._mq = new THREE.Quaternion(); this._mv = new THREE.Vector3(); this._mrang = new THREE.Color();
    this.oqim = [];
    this.uchqunlar = [];
    this.faol = true;
    this.soyaKerak = true; // statik soya xaritasini qayta chizish kerakmi (sifat: orta)
    this.sifat = sifatAniqla(); // unumdorlik darajasi (engine/sifat.js)

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.sifat.aa });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.sifat.pr));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = this.sifat.soya;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    if (this.sifat.glow) this.glowQur();
    // Muhit yoritilishi: metall va plastik yuzalarda real aks
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;
    pmrem.dispose();
    this.soyalarniSozla();
    this.scene.updateMatrixWorld(true);
    // Passiv elementlar (taqsimlash qutisi) chegarasi — sim yo‘lini qurish uchun
    this.qutiChegara = new Map();
    for (const el of this.lab.els) {
      if (!el.def.passiv) continue;
      const bx = new THREE.Box3();
      this.modellar.get(el.id).obj.traverse((o) => { if (o.isMesh && !o.userData.tur && !o.material.isMeshBasicMaterial) bx.expandByObject(o); });
      this.qutiChegara.set(el.id, bx);
    }
    if (this.sifat.birlash) this.statikniBirlashtir();
    // Statik soya: harakatlanuvchi model (motor) bo‘lmasa, soya xaritasi faqat sahna o‘zgarganda qayta chiziladi
    if (this.sifat.soya && this.sifat.soyaStatik && ![...this.modellar.values()].some((m) => m.kadr)) this.renderer.shadowMap.autoUpdate = false;
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
    this.debugQur();
    this.soat = new THREE.Clock();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (this.faol) this.kadr(); };
    loop();
  }

  korinsin(v) { this.faol = v; if (v) this.olcham(); }

  // ---------- materiallar va yordamchilar ----------
  mat(hex, o = {}) {
    const key = `${hex}|${o.roughness ?? ''}|${o.metalness ?? ''}`;
    if (!this.kesh.has(key)) this.kesh.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0, envMapIntensity: 0.7 }));
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
  // ---------- xona (Blender'dagi kabi: real o‘lchamlar, protsedural teksturalar, oyna orqali kunduzgi yorug‘lik, soyalar) ----------
  shuvoqTekstura(asos) {
    return this.tekstura(512, 512, (x, w, h) => {
      x.fillStyle = asos; x.fillRect(0, 0, w, h);
      // Bo‘yalgan shuvoq: mayda notekisliklar va yumshoq dog‘lar
      for (let i = 0; i < 2600; i++) {
        const r = Math.random() * 2.2 + 0.4;
        x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(120,105,85,0.07)';
        x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, 7); x.fill();
      }
      for (let i = 0; i < 40; i++) {
        const g = x.createRadialGradient(0, 0, 0, 0, 0, 60);
        g.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(110,95,75,0.045)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.save(); x.translate(Math.random() * w, Math.random() * h); x.fillStyle = g; x.fillRect(-60, -60, 120, 120); x.restore();
      }
    });
  }

  laminatTekstura() {
    // 1024 px = 2 m; taxtalar 0,2 m eni, uzunligi har xil, tolalari va choklari bilan
    return this.tekstura(1024, 1024, (x, w, h) => {
      const qator = 102.4;
      for (let r = 0; r < 10; r++) {
        let pos = -Math.random() * 600;
        while (pos < w) {
          const uz = 420 + Math.random() * 300;
          const t = 0.93 + Math.random() * 0.11;
          x.fillStyle = `rgb(${Math.round(176 * t)},${Math.round(132 * t)},${Math.round(92 * t)})`;
          x.fillRect(pos, r * qator, uz, qator);
          for (let k = 0; k < 26; k++) {
            x.strokeStyle = `rgba(${Math.random() < 0.5 ? '90,55,25' : '230,200,160'},${0.04 + Math.random() * 0.06})`;
            x.lineWidth = 0.6 + Math.random() * 1.6;
            const y = r * qator + Math.random() * qator;
            x.beginPath(); x.moveTo(pos, y);
            x.bezierCurveTo(pos + uz * 0.3, y + (Math.random() - 0.5) * 8, pos + uz * 0.7, y + (Math.random() - 0.5) * 8, pos + uz, y + (Math.random() - 0.5) * 4);
            x.stroke();
          }
          x.fillStyle = 'rgba(60,38,20,0.4)';
          x.fillRect(pos, r * qator, 1.5, qator);
          pos += uz;
        }
        x.fillStyle = 'rgba(60,38,20,0.5)';
        x.fillRect(0, r * qator, w, 1.5);
      }
    });
  }

  // Burchaklardagi yumshoq soya (ambient occlusion imitatsiyasi)
  aoTasma(uz, en, pos, bx, by) {
    if (!this._aoTex) {
      this._aoTex = this.tekstura(4, 128, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(40,30,20,0.30)'); g.addColorStop(0.35, 'rgba(40,30,20,0.10)'); g.addColorStop(1, 'rgba(40,30,20,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      });
    }
    // bx — tasma uzunligi yo‘nalishi, by — qorong‘i chetdan ochiq tomonga teskari yo‘nalish (tekstura tepasi qorong‘i)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(uz, en), new THREE.MeshBasicMaterial({ map: this._aoTex, transparent: true, depthWrite: false }));
    const X = new THREE.Vector3(...bx), Y = new THREE.Vector3(...by);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, X.clone().cross(Y)));
    m.position.set(...pos);
    m.userData.soyasiz = true;
    m.renderOrder = 1;
    this.scene.add(m);
  }

  profilBoylab(P, uz, mat, basis, pos) {
    const sh = new THREE.Shape();
    sh.moveTo(P[0][0], P[0][1]);
    P.slice(1).forEach(([a, b]) => sh.lineTo(a, b));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: uz, bevelEnabled: false, curveSegments: 6 });
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(...basis));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    this.scene.add(m);
    return m;
  }

  xonaQur() {
    const { kenglik: W, balandlik: H, chuqurlik: D } = this.xona;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // Materiallar
    const shuvoq = this.shuvoqTekstura('#f1ece3');
    shuvoq.wrapS = shuvoq.wrapT = THREE.RepeatWrapping;
    shuvoq.repeat.set(1 / 1.4, 1 / 1.4); // UV metrlarda
    const devorMat = new THREE.MeshStandardMaterial({ map: shuvoq, roughness: 0.93, envMapIntensity: 0.35 });
    const shiftTex = this.shuvoqTekstura('#f6f4ef');
    shiftTex.wrapS = shiftTex.wrapT = THREE.RepeatWrapping;
    shiftTex.repeat.set(1 / 1.6, 1 / 1.6);
    const shiftMat = new THREE.MeshStandardMaterial({ map: shiftTex, roughness: 0.95, envMapIntensity: 0.3 });
    const lam = this.laminatTekstura();
    lam.wrapS = lam.wrapT = THREE.RepeatWrapping;
    lam.repeat.set(0.5, 0.5);
    const polMat = new THREE.MeshStandardMaterial({ map: lam, roughness: 0.48, envMapIntensity: 0.6 });
    const oqBoyoq = new THREE.MeshStandardMaterial({ color: 0xfbfbf8, roughness: 0.38, envMapIntensity: 0.6 });

    // Yuzalar: UV = metr (ShapeGeometry), shuning uchun teksturalar masshtabi bir xil
    const yuza = (w, h, mat, teshiklar = []) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(w, 0); sh.lineTo(w, h); sh.lineTo(0, h); sh.lineTo(0, 0);
      for (const [x0, y0, tw, th] of teshiklar) {
        const t = new THREE.Path();
        t.moveTo(x0, y0); t.lineTo(x0, y0 + th); t.lineTo(x0 + tw, y0 + th); t.lineTo(x0 + tw, y0); t.lineTo(x0, y0);
        sh.holes.push(t);
      }
      return new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
    };
    const orqa = yuza(W, H, devorMat);
    orqa.position.set(-W / 2, 0, 0);
    // Chap devorda deraza teshigi
    const oyna = { z: 2.05, y: 0.88, en: 1.36, bal: 1.5 };
    const chap = yuza(D, H, devorMat, [[D - oyna.z - oyna.en / 2, oyna.y, oyna.en, oyna.bal]]);
    chap.rotation.y = Math.PI / 2;
    chap.position.set(-W / 2, 0, D);
    const ong = yuza(D, H, devorMat);
    ong.rotation.y = -Math.PI / 2;
    ong.position.set(W / 2, 0, 0);
    const pol = yuza(W, D, polMat);
    pol.rotation.x = -Math.PI / 2;
    pol.position.set(-W / 2, 0, D);
    const shift = yuza(W, D, shiftMat);
    shift.rotation.x = Math.PI / 2;
    shift.position.set(-W / 2, H, 0);
    this.scene.add(orqa, chap, ong, pol, shift);
    // Deraza o‘ymasi qalinligi (otkos), devor tashqi qatlami
    const qal = 0.28;
    const otkos = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), devorMat); m.position.set(x, y, z); this.scene.add(m); };
    otkos(qal, 0.02, oyna.en, -W / 2 - qal / 2, oyna.y - 0.01, oyna.z);
    otkos(qal, 0.02, oyna.en, -W / 2 - qal / 2, oyna.y + oyna.bal + 0.01, oyna.z);
    otkos(qal, oyna.bal, 0.02, -W / 2 - qal / 2, oyna.y + oyna.bal / 2, oyna.z - oyna.en / 2 - 0.01);
    otkos(qal, oyna.bal, 0.02, -W / 2 - qal / 2, oyna.y + oyna.bal / 2, oyna.z + oyna.en / 2 + 0.01);
    // Plastik rom: tashqi rom, o‘rtadagi impost, ikki tabaqa, shisha
    const rom = new THREE.Group();
    const romMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.32, envMapIntensity: 0.8 });
    const brus = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), romMat); m.position.set(x, y, z); rom.add(m); };
    const t = 0.065;
    brus(0.07, t, oyna.en, 0, -oyna.bal / 2 + t / 2, 0);
    brus(0.07, t, oyna.en, 0, oyna.bal / 2 - t / 2, 0);
    brus(0.07, oyna.bal, t, 0, 0, -oyna.en / 2 + t / 2);
    brus(0.07, oyna.bal, t, 0, 0, oyna.en / 2 - t / 2);
    brus(0.07, oyna.bal, 0.08, 0, 0, 0);
    for (const sz of [-1, 1]) {
      const cz = sz * oyna.en / 4;
      const sw = oyna.en / 2 - t - 0.04;
      const sh = oyna.bal - 2 * t;
      brus(0.075, 0.05, sw, 0.012, sh / 2 - 0.025, cz);
      brus(0.075, 0.05, sw, 0.012, -sh / 2 + 0.025, cz);
      brus(0.075, sh, 0.05, 0.012, 0, cz - sw / 2 + 0.025);
      brus(0.075, sh, 0.05, 0.012, 0, cz + sw / 2 - 0.025);
      const shisha = new THREE.Mesh(new THREE.PlaneGeometry(sw - 0.1, sh - 0.1), new THREE.MeshStandardMaterial({ color: 0xcfe6f2, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.2, depthWrite: false }));
      shisha.rotation.y = Math.PI / 2;
      shisha.position.set(0.01, 0, cz);
      shisha.userData.soyasiz = true;
      rom.add(shisha);
      const dasta = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 }));
      dasta.position.set(0.055, 0.02, cz + sz * (sw / 2 - 0.05));
      rom.add(dasta);
    }
    rom.position.set(-W / 2 - 0.2, oyna.y + oyna.bal / 2, oyna.z);
    this.scene.add(rom);
    // Deraza tokchasi (podokonnik)
    const tokcha = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, oyna.en + 0.16), oqBoyoq);
    tokcha.position.set(-W / 2 - 0.08 + 0.02, oyna.y - 0.0125, oyna.z);
    this.scene.add(tokcha);
    // Tashqi osmon (oyna ortida)
    const osmon = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({
      map: this.tekstura(16, 256, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#8fbce6'); g.addColorStop(0.6, '#cfe3f3'); g.addColorStop(1, '#eef3f1');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      }),
    }));
    osmon.rotation.y = Math.PI / 2;
    osmon.position.set(-W / 2 - 1.6, 1.6, oyna.z);
    osmon.userData.soyasiz = true;
    this.scene.add(osmon);
    // Radiator (alyuminiy seksiyalar) deraza ostida
    const rad = new THREE.Group();
    const radMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.3, metalness: 0.1, envMapIntensity: 0.8 });
    for (let i = 0; i < 10; i++) {
      const sek = new THREE.Mesh(this.ekstr(this.shakl(0.075, 0.56, 0.02), 0.07, 0.006), radMat);
      sek.rotation.y = Math.PI / 2;
      sek.position.set(0, 0, -0.4 + i * 0.08 + 0.04);
      rad.add(sek);
    }
    const quvur = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 16), radMat);
    quvur.rotation.x = Math.PI / 2; quvur.position.set(0.03, -0.24, 0);
    rad.add(quvur);
    rad.position.set(-W / 2 + 0.06, 0.42, oyna.z);
    this.scene.add(rad);

    // Plintus va karniz (profil bo‘ylab cho‘zilgan)
    const plintP = [[0, 0], [0.016, 0], [0.016, 0.062], [0.01, 0.075], [0.004, 0.08], [0, 0.08]];
    const karnizP = [[0, 0], [0.075, 0], [0.075, -0.008], [0.06, -0.012], [0.03, -0.03], [0.014, -0.06], [0.008, -0.075], [0, -0.075]];
    // orqa devor: shakl x → z, shakl y → y, cho‘zilish → −x (o‘ng qo‘l bazisi)
    const bOrqa = [V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)];
    this.profilBoylab(plintP, W, oqBoyoq, bOrqa, [W / 2, 0, 0]);
    this.profilBoylab(karnizP, W, oqBoyoq, bOrqa, [W / 2, H, 0]);
    // chap devor: shakl x → x, cho‘zilish → z
    const bChap = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
    this.profilBoylab(plintP, D, oqBoyoq, bChap, [-W / 2, 0, 0]);
    this.profilBoylab(karnizP, D, oqBoyoq, bChap, [-W / 2, H, 0]);
    // o‘ng devor: shakl x → −x, cho‘zilish → −z
    const bOng = [V(-1, 0, 0), V(0, 1, 0), V(0, 0, -1)];
    this.profilBoylab(karnizP, D, oqBoyoq, bOng, [W / 2, H, D]);
    this.profilBoylab(plintP, D, oqBoyoq, bOng, [W / 2, 0, D]);
    // Burchak soyalari (ambient occlusion imitatsiyasi)
    this.aoTasma(W, 0.35, [0, H - 0.075 - 0.175, 0.002], [1, 0, 0], [0, 1, 0]);
    this.aoTasma(W, 0.25, [0, 0.08 + 0.125, 0.002], [-1, 0, 0], [0, -1, 0]);
    this.aoTasma(H, 0.3, [-W / 2 + 0.15, H / 2, 0.003], [0, 1, 0], [-1, 0, 0]);
    this.aoTasma(H, 0.3, [W / 2 - 0.15, H / 2, 0.003], [0, -1, 0], [1, 0, 0]);
    this.aoTasma(H, 0.3, [-W / 2 + 0.002, H / 2, 0.15], [0, -1, 0], [0, 0, -1]);
    this.aoTasma(D, 0.35, [-W / 2 + 0.002, H - 0.075 - 0.175, D / 2], [0, 0, -1], [0, 1, 0]);

    // Panelli eshik: nalichnik, ikki bo‘rtiq panel, ilgaklar, dastak-ruchka
    const eshik = new THREE.Group();
    const yogoch = this.tekstura(256, 512, (x, w, h) => {
      x.fillStyle = '#9c6c44'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        x.strokeStyle = `rgba(${Math.random() < 0.5 ? '70,40,18' : '200,150,105'},${0.06 + Math.random() * 0.1})`;
        x.lineWidth = 0.5 + Math.random() * 2;
        const xx = Math.random() * w;
        x.beginPath(); x.moveTo(xx, 0); x.bezierCurveTo(xx + (Math.random() - 0.5) * 20, h * 0.3, xx + (Math.random() - 0.5) * 20, h * 0.7, xx + (Math.random() - 0.5) * 10, h); x.stroke();
      }
    });
    const eshikMat = new THREE.MeshStandardMaterial({ map: yogoch, roughness: 0.5, envMapIntensity: 0.5 });
    const nalMat = new THREE.MeshStandardMaterial({ map: yogoch, color: 0xe8ddd0, roughness: 0.5, envMapIntensity: 0.5 });
    const EW = 0.86, EH = 2.03;
    const tab = new THREE.Mesh(new THREE.BoxGeometry(EW, EH, 0.04), eshikMat);
    tab.position.set(0, EH / 2, 0.02);
    eshik.add(tab);
    for (const [py, ph] of [[1.42, 0.95], [0.5, 0.72]]) {
      const panel = new THREE.Mesh(this.ekstr(this.shakl(EW - 0.22, ph, 0.01), 0.012, 0.006), eshikMat);
      panel.position.set(0, py, 0.036);
      eshik.add(panel);
    }
    for (const [x, y, w, h] of [[-EW / 2 - 0.035, EH / 2 + 0.035, 0.07, EH + 0.07], [EW / 2 + 0.035, EH / 2 + 0.035, 0.07, EH + 0.07], [0, EH + 0.035, EW + 0.14, 0.07]]) {
      const n = new THREE.Mesh(this.ekstr(this.shakl(w, h, 0.004), 0.018, 0.004), nalMat);
      n.position.set(x, y, 0);
      eshik.add(n);
    }
    const xrom = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.22 });
    const rozet = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.01, 32), xrom);
    rozet.rotation.x = Math.PI / 2; rozet.position.set(-EW / 2 + 0.07, 1.0, 0.045);
    const dasta = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.11, 6, 12), xrom);
    dasta.rotation.z = Math.PI / 2; dasta.position.set(-EW / 2 + 0.115, 1.0, 0.068);
    const boyin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.025, 12), xrom);
    boyin.rotation.x = Math.PI / 2; boyin.position.set(-EW / 2 + 0.07, 1.0, 0.056);
    eshik.add(rozet, dasta, boyin);
    for (const y of [0.25, 1.8]) {
      const ilgak = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 12), xrom);
      ilgak.position.set(EW / 2 + 0.002, y, 0.04);
      eshik.add(ilgak);
    }
    eshik.position.set(1.3, 0, 0);
    this.scene.add(eshik);

    // Yoritish: oyna orqali kunduzgi quyosh (soyali), muhit yoritilishi, yumshoq to‘ldiruvchi
    this.hemi = new THREE.HemisphereLight(0xeef4ff, 0xe0d2bc, 0.8);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.0);
    this.quyosh = new THREE.DirectionalLight(0xfff0d8, 3.2);
    this.quyosh.position.set(-W / 2 - 2.6, 3.1, oyna.z + 0.6);
    this.quyosh.target.position.set(0.2, 0.2, 1.6);
    this.quyosh.castShadow = this.sifat.soya;
    const xarita = this.sifat.soyaXarita || (window.innerWidth < 700 ? 1024 : 2048); // yuqori: avvalgidek; orta: 1024
    this.quyosh.shadow.mapSize.set(xarita, xarita);
    const sc = this.quyosh.shadow.camera;
    sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 9;
    this.quyosh.shadow.bias = -0.0004;
    this.quyosh.shadow.normalBias = 0.02;
    this.quyosh.shadow.radius = 5;
    this.oldNur = new THREE.DirectionalLight(0xfffaf2, 0.75); // xona ichidagi yoyilgan yorug‘lik (devorga yumshoq soya)
    this.oldNur.position.set(1.4, 2.9, 3.6);
    this.oldNur.target.position.set(-0.3, 1.4, 0);
    this.oldNur.castShadow = this.sifat.soya;
    this.oldNur.shadow.mapSize.set(xarita, xarita);
    const oc = this.oldNur.shadow.camera;
    oc.left = -1.8; oc.right = 1.8; oc.top = 1.6; oc.bottom = -1.6; oc.near = 1; oc.far = 8;
    this.oldNur.shadow.bias = -0.0003;
    this.oldNur.shadow.normalBias = 0.01;
    this.oldNur.shadow.radius = 7;
    this.scene.add(this.oldNur.target);
    this.scene.add(this.hemi, this.ambient, this.quyosh, this.quyosh.target, this.oldNur);
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
      const j = this.avto?.joy.get(el.id);
      const m = j ? avtoModel(this, el, j) : el.def.model3d(this.ctx(el));
      m.obj.position.set(...(j ? j.pos : el.pozitsiya3d));
      m.obj.scale.setScalar(j ? j.masshtab || 1 : el.masshtab3d || this.s3.masshtab || 1);
      if (el.burilish3d) m.obj.rotation.y = el.burilish3d;
      this.scene.add(m.obj);
      this.modellar.set(el.id, m);
      for (const mesh of m.bosish || []) {
        mesh.userData = { tur: 'bos', el: el.id, model: m };
        this.bosiladigan.push(mesh);
      }
      for (const k of el.klemmalar) {
        const full = `${el.id}.${k.id}`;
        const info = m.klemmalar[k.id];
        if (!info) continue;
        const r = info.r || k.r3d || 0.013;
        // «hit» faqat nur (raycast) uchun: 1-qatlamda, kamera ko‘rmaydi va chizilmaydi (Raycaster.layers.enable(1))
        const hit = new THREE.Mesh(kurinadigan, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        hit.scale.setScalar(r);
        hit.position.set(...info.pos);
        hit.userData = { tur: 'kl', full };
        hit.layers.set(1);
        m.obj.add(hit);
        // Marker: bitta InstancedMesh ichidagi nusxa (model fazosidagi joyi va o‘lchami saqlanadi)
        this.kl.set(full, { hit, i: this.kl.size, mpos: new THREE.Vector3(...info.pos), mscale: Math.min(0.0055, r * 0.55), obj: m.obj, dir: new THREE.Vector3(...info.dir).normalize(), r });
      }
    }
    const n = Math.max(1, this.kl.size);
    const markerGeo = this.sifat.nom === 'yuqori' ? kurinadigan : new THREE.SphereGeometry(1, 8, 6); // kichik shar: past/orta da yengilroq
    this.markerlar = new THREE.InstancedMesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: true }), n);
    this.markerlar.count = this.kl.size;
    this.markerlar.renderOrder = 1;
    this.markerlar.frustumCulled = false;
    for (let i = 0; i < n; i++) this.markerlar.setColorAt(i, this._mrang.set(RANG_MARKER.bosh));
    this.scene.add(this.markerlar);
  }

  /** Marker nusxasini yozadi: model (obj) jahon matritsasi × lokal joy/o‘lcham. olcham 0 — ko‘rinmaydi. */
  markerYoz(k, olcham, rang) {
    this._mL.compose(k.mpos, this._mq, this._mv.setScalar(olcham));
    this._mM.multiplyMatrices(k.obj.matrixWorld, this._mL);
    this.markerlar.setMatrixAt(k.i, this._mM);
    if (rang != null) this.markerlar.setColorAt(k.i, this._mrang.set(rang));
  }

  soyalarniSozla() {
    this.scene.traverse((o) => {
      if (o.isPointLight && o.parent !== this.scene) {
        o.shadow.mapSize.set(512, 512);
        o.shadow.bias = -0.003;
        o.shadow.radius = 4;
        o.shadow.camera.near = 0.03;
      }
      if (!o.isMesh) return;
      const m = o.material;
      const asos = o.userData.soyasiz || m.isMeshBasicMaterial || (m.transparent && m.opacity === 0);
      o.castShadow = !asos && !(m.transparent && m.opacity < 0.5);
      o.receiveShadow = !asos;
    });
    // Yorug‘lik manbai bo‘lgan qurilma (lampa) o‘ziga soya tashlamasin — artefaktlarning oldini olish
    for (const m of this.modellar.values()) {
      if (m.yorugl) m.obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
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
    if (this.avto) return this.egriAvto(s, idx);
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
    const k5 = (idx % 5) * 0.008;
    const shitlar = (this.s3.bezaklar || []).filter((b) => b.tur === 'shit_korpus');
    const zanjir = (k, full, boshqa) => {
      const ao = k.p.clone().addScaledVector(k.d, 0.045);
      const res = [k.p, ao];
      const qb = this.qutiChegara.get(full.split('.')[0]);
      const shit = shitlar.find((b) => Math.abs(ao.x - b.pozitsiya[0]) < b.olcham[0] / 2 && Math.abs(ao.y - b.pozitsiya[1]) < b.olcham[1] / 2);
      if (qb) {
        // Taqsimlash qutisi: sim qutining yuqori yoki pastki chetidan chiqadi (membrana orqali)
        const y = boshqa.p.y > (qb.min.y + qb.max.y) / 2 ? qb.max.y + 0.03 + k5 : qb.min.y - 0.03 - k5;
        res.push(V(ao.x, ao.y, zr), V(ao.x, y, zr));
      } else if (shit) {
        const tepa = shit.pozitsiya[1] + shit.olcham[1] / 2, past = shit.pozitsiya[1] - shit.olcham[1] / 2;
        const reyka = shit.pozitsiya[1] + (shit.din?.[0] ?? 0);
        if (boshqa.p.y > tepa) {
          // Shit ichida: qurilmalar ostidan o‘ng yon kanalga, so‘ng yuqoridan chiqish
          const yb = Math.max(past + 0.025, reyka - 0.14 - (idx % 5) * 0.007);
          const kx = shit.pozitsiya[0] + shit.olcham[0] / 2 - 0.028 - (idx % 6) * 0.006;
          res.push(V(ao.x, ao.y, zr), V(ao.x, yb, zr), V(kx, yb, zr), V(kx, tepa + 0.035 + k5, zr));
        } else {
          res.push(V(ao.x, ao.y, zr), V(ao.x, past - 0.035 - k5, zr));
        }
      } else if (ao.z > 0.3 && ao.y > H - 0.3) {
        const y = H - 0.018 - (idx % 5) * 0.007;
        res.push(V(ao.x, y, ao.z), V(ao.x, y, zr));
      } else if (Math.abs(ao.z - zr) > 0.01) {
        res.push(V(ao.x, ao.y, zr));
      }
      return res;
    };
    const za = zanjir(A, s.a, B), zb = zanjir(B, s.b, A).reverse();
    const LA = za[za.length - 1], FB = zb[0];
    const orta = [];
    if (Math.abs(LA.x - FB.x) > 0.01 && Math.abs(LA.y - FB.y) > 0.01) {
      // Gorizontal qism doim yuqoriroq sathda yuradi (qurilmalar ustidan kesib o‘tmaslik uchun)
      if (LA.y >= FB.y) orta.push(V(FB.x + dx, LA.y, zr), V(FB.x + dx, FB.y, zr));
      else orta.push(V(LA.x + dx, LA.y, zr), V(LA.x + dx, FB.y, zr));
    }
    return new THREE.CatmullRomCurve3(this.yumaloq([...za, ...orta, ...zb]), false, 'centripetal');
  }

  // Avto sahna: shit ichida — 2D dagidek yo‘l (qurilmalar old yuzasi ustida); tashqariga — shitning pastidan
  // devor bo‘ylab; shiftdagi qurilmaga — shift bo‘ylab; poldagi motorga — pol bo‘ylab.
  egriAvto(s, idx) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const A = this.kNuqta(s.a), B = this.kNuqta(s.b);
    const ea = this.lab.elMap.get(s.a.split('.')[0]), eb = this.lab.elMap.get(s.b.split('.')[0]);
    const ja = this.avto.joy.get(ea.id), jb = this.avto.joy.get(eb.id);
    const H = this.xona.balandlik;
    const sh = this.avto.shit;
    const zIn = 0.064 + (idx % 6) * 0.0022;
    if (ja.tur === 'shit' && jb.tur === 'shit') {
      const ka = ea.kmap.get(s.a.split('.').slice(1).join('.')), kb = eb.kmap.get(s.b.split('.').slice(1).join('.'));
      const pa = [ea.pozitsiya2d[0] + ka.xy[0], ea.pozitsiya2d[1] + ka.xy[1]], pb = [eb.pozitsiya2d[0] + kb.xy[0], eb.pozitsiya2d[1] + kb.xy[1]];
      const yo = (k, p, q) => k.dir2d || (Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]) ? [Math.sign(q[0] - p[0]) || 1, 0] : [0, Math.sign(q[1] - p[1]) || 1]);
      const pts2 = yol2d(pa, pb, yo(ka, pa, pb), yo(kb, pb, pa), idx);
      const ichki = pts2.slice(1, -1).map(([x, y]) => { const [X, Y] = this.avto.map2d(x, y); return V(X, Y, zIn); });
      return new THREE.CatmullRomCurve3(this.yumaloq([A.p, V(A.p.x, A.p.y, zIn), ...ichki, V(B.p.x, B.p.y, zIn), B.p]), false, 'centripetal');
    }
    const zr = 0.018 + (idx % 6) * 0.004;
    const pastShit = sh.pozitsiya[1] - sh.olcham[1] / 2;
    const k5 = (idx % 7) * 0.007;
    const chiqish = (k, j) => {
      const ao = k.p.clone().addScaledVector(k.d, 0.025);
      if (j.tur === 'shit') { const y = pastShit - 0.03 - k5; return { pts: [k.p, V(k.p.x, k.p.y, zIn), V(k.p.x, y, zIn), V(k.p.x, y, zr)], daraja: 'shit' }; }
      if (j.tur === 'shift') { const y = H - 0.014 - (idx % 5) * 0.006; return { pts: [k.p, ao, V(ao.x, y, ao.z), V(ao.x, y, zr)], daraja: 'shift' }; }
      if (j.tur === 'pol') { const y = 0.016 + (idx % 5) * 0.006; return { pts: [k.p, ao, V(ao.x, ao.y, ao.z), V(ao.x, y, ao.z), V(ao.x, y, zr)], daraja: 'pol' }; }
      return { pts: [k.p, ao, V(ao.x, ao.y, zr)], daraja: 'devor' };
    };
    const ca = chiqish(A, ja), cb = chiqish(B, jb);
    const LA = ca.pts[ca.pts.length - 1], FB = cb.pts[cb.pts.length - 1];
    const dx = ((idx % 7) - 3) * 0.006;
    let orta = [];
    if (Math.abs(LA.x - FB.x) > 0.01 && Math.abs(LA.y - FB.y) > 0.01) {
      // Shit tomonidagi uch — gorizontal qism shit ostidan; aks holda — balandroq sathda
      const shitA = ca.daraja === 'shit', shitB = cb.daraja === 'shit';
      const gorizA = shitA || (!shitB && LA.y >= FB.y);
      orta = gorizA ? [V(FB.x + dx, LA.y, zr), V(FB.x + dx, FB.y, zr)] : [V(LA.x + dx, LA.y, zr), V(LA.x + dx, FB.y, zr)];
    }
    return new THREE.CatmullRomCurve3(this.yumaloq([...ca.pts, ...orta, ...cb.pts.reverse()]), false, 'centripetal');
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
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, this.avto ? 0.0021 : 0.0034, 8, false), mat);
      const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, seg >> 1), this.avto ? 0.006 : 0.011, 6, false), hitMat);
      hit.userData = { tur: 'sim', id: s.id };
      hit.layers.set(1); // faqat nur uchun, chizilmaydi
      mesh.castShadow = this.sifat.soya;
      mesh.receiveShadow = true;
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
      const natija = sim.natija[el.id] || {};
      const yonadi = !!sim.yuklamalar[el.id]?.yonadi || (natija.holatlar || []).includes('yonadi');
      if (yonadi && (m.yorugl || el.def.yuklama)) yorug = true;
      m.yangila?.(lab.holat[el.id] || {}, { yonadi, natija });
      if (m.glow) m.glow.visible = yonadi;
    }
    this.soyaKerak = true;
    this.hemi.intensity = yorug ? 1.0 : 0.8;
    this.hemi.color.set(yorug ? 0xfff1dc : 0xeaf2ff);
    for (const m of this.modellar.values()) if (m.yorugl) m.yorugl.castShadow = this.sifat.lampaSoya && m.yorugl.intensity > 0;
    for (const [full, k] of this.kl) {
      const r = lab.klemma(full);
      const n = lab.simlarSoni(full);
      let rang = n ? RANG_MARKER.band : RANG_MARKER.bosh;
      if (lab.belgilangan.klemmalar.has(full)) rang = RANG_MARKER.belgi;
      if (lab.tanlangan === full) rang = RANG_MARKER.tanlangan;
      if (this.hover === full && lab.tanlangan !== full) rang = RANG_MARKER.hover;
      // Avto sahnada klemma halqalari qurilma rasmida bor — bo‘sh klemmada shar ko‘rinmaydi (olcham 0)
      const korinadi = !this.avto || rang !== RANG_MARKER.bosh;
      k.tanlangan = lab.tanlangan === full;
      this.markerYoz(k, korinadi ? k.mscale * (!k.tanlangan && this.hover === full ? 1.5 : 1) : 0, rang);
      void r;
    }
    this.markerlar.instanceMatrix.needsUpdate = true;
    if (this.markerlar.instanceColor) this.markerlar.instanceColor.needsUpdate = true;
    for (const [id, o] of this.simObj) {
      const tan = lab.tanlanganSim === id, bel = lab.belgilangan.simlar.has(id);
      o.mat.emissive?.set(tan ? 0x6d4aff : bel ? 0xe5484d : 0x000000);
      o.mat.emissiveIntensity = tan || bel ? 0.6 : 0;
      o.belgi = bel;
    }
    // Tok oqimi nuqtalari: bitta InstancedMesh (joylari kadr() da yangilanadi)
    this.oqim = [];
    for (const o of sim.oqim) {
      const so = this.simObj.get(o.sim);
      if (!so) continue;
      const n = Math.max(2, Math.round(so.len / 0.12));
      for (let i = 0; i < n; i++) this.oqim.push({ curve: so.curve, len: so.len, faza: i / n, yonalish: o.yonalish });
    }
    this.oqimMeshniTayyorla();
  }

  oqimMeshniTayyorla() {
    const kerak = this.oqim.length;
    if (!this.oqimMesh || this.oqimMesh.instanceMatrix.count < kerak) {
      if (this.oqimMesh) { this.scene.remove(this.oqimMesh); this.oqimMesh.dispose(); }
      const geo = this._oqGeo || (this._oqGeo = new THREE.SphereGeometry(this.avto ? 0.0034 : 0.0062, ...(this.sifat.nom === 'yuqori' ? [10, 8] : [6, 4])));
      const mat = this._oqMat || (this._oqMat = new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      this.oqimMesh = new THREE.InstancedMesh(geo, mat, Math.max(64, kerak * 2));
      this.oqimMesh.frustumCulled = false; // nuqtalar sahna bo‘ylab yuradi, chegara sferasi kerak emas
      this.scene.add(this.oqimMesh);
    }
    this.oqimMesh.count = kerak;
    this.oqimMesh.visible = kerak > 0;
  }

  // ---------- unumdorlik: birlashtirish, glow, debug ----------
  /** Statik mesh'larni (xona, shit korpusi va harakatlanmaydigan qurilma qismlari) material bo‘yicha birlashtiradi. */
  statikniBirlashtir() {
    this.scene.updateMatrixWorld(true);
    const istisno = new Set();
    // Holati o‘zgarganda ko‘chadigan/ko‘rinishi almashadigan mesh'lar (klavisha, dasta...) va aylanuvchi modellar birlashtirilmaydi
    for (const el of this.lab.els) {
      const m = this.modellar.get(el.id);
      const meshlar = [];
      m.obj.traverse((o) => { if (o.isMesh) meshlar.push(o); });
      if (m.kadr) { meshlar.forEach((o) => istisno.add(o)); continue; } // aylanuvchi/animatsiyali model
      if (!m.yangila || m.amalTop) continue; // rasm-asosli (naqsh) modelda yuz tekstura bilan almashadi — yangila()ni bu yerda chaqirmaymiz
      const h0 = el.def.boshlangich(el.param) || {};
      // Faqat mantiqiy (true/false) holatni sinab ko‘ramiz; boshqa turdagi holat (satr, son) bo‘lsa — ishonch uchun butun model chetlanadi
      if (Object.values(h0).some((vv) => typeof vv !== 'boolean')) { meshlar.forEach((o) => istisno.add(o)); continue; }
      const surat = () => { m.obj.updateWorldMatrix(true, true); return meshlar.map((o) => `${o.matrixWorld.elements.join(',')}|${o.visible}|${o.material.id}|${o.geometry.id}`); };
      const holatlar = [h0];
      for (const [kk, vv] of Object.entries(h0)) holatlar.push({ ...h0, [kk]: !vv });
      holatlar.push(Object.fromEntries(Object.keys(h0).map((kk) => [kk, true])));
      const natijalar = [{}, { holatlar: ['yonadi', 'ishlaydi', 'tortilgan', 'yoqilgan', 'ochiq', 'teskari', 'yulduz'] }];
      let bazaS = null;
      try {
        for (const yon of [false, true]) for (const nat of natijalar) for (const h of holatlar) {
          m.yangila(h, { yonadi: yon, natija: nat });
          const sr = surat();
          if (!bazaS) bazaS = sr;
          sr.forEach((x, i) => { if (x !== bazaS[i]) istisno.add(meshlar[i]); });
        }
      } catch (e) { meshlar.forEach((o) => istisno.add(o)); }
    }
    const barchasi = [];
    this.scene.traverse((o) => { if (o.isMesh) barchasi.push(o); });
    this.birlashStat = statikBirlashtir(THREE, barchasi, this.scene, istisno);
  }

  /** Yongan lampa uchun yorug‘lik dog‘i (soyasiz sifat darajalarida kub soyasi o‘rniga). */
  glowQur() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,226,170,0.85)'); g.addColorStop(0.35, 'rgba(255,205,130,0.35)'); g.addColorStop(1, 'rgba(255,190,100,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (const m of this.modellar.values()) {
      if (!m.yorugl) continue;
      const sp = new THREE.Sprite(mat);
      sp.scale.set(0.5, 0.5, 1);
      sp.position.copy(m.yorugl.position);
      sp.visible = false;
      m.obj.add(sp);
      m.glow = sp;
    }
  }

  /** ?debug=1: FPS, draw call, uchburchak, sifat darajasi. */
  debugQur() {
    if (!this.sifat.debug) return;
    this.dbg = document.createElement('div');
    this.dbg.style.cssText = 'position:absolute;left:8px;bottom:8px;z-index:5;background:#000c;color:#9f9;font:11px/1.35 ui-monospace,monospace;padding:5px 8px;pointer-events:none;white-space:pre';
    this.root.querySelector('.v3d').appendChild(this.dbg);
    this.dbgT = performance.now(); this.dbgN = 0;
    this.renderer.info.autoReset = false; // aks holda soya o‘tishlari hisobga kirmaydi; kadr() har kadr boshida o‘zi nolga tushiradi
  }

  debugYangila() {
    this.dbgN++;
    const now = performance.now();
    if (now - this.dbgT < 500) return;
    const i = this.renderer.info.render;
    this.fps = Math.round((this.dbgN * 1000) / (now - this.dbgT));
    this.dbg.textContent = `FPS ${this.fps}\ncalls ${i.calls}\ntri ${(i.triangles / 1000).toFixed(1)}k\nsifat ${this.sifat.nom} pr ${this.renderer.getPixelRatio()}${this.sifat.birlash ? ' merge' : ''}\n${this.canvas.width}×${this.canvas.height}\n${this.sifat.sabab}`;
    this.dbgT = now; this.dbgN = 0;
  }

  // ---------- hodisalar ----------
  hodisalar() {
    const ray = new THREE.Raycaster();
    ray.layers.enable(1); // 1-qatlam: ko‘rinmas «hit» obyektlar (chizilmaydi, lekin nur tegadi)
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
      // Sim qurilma ustidan o‘tsa ham, ostidagi tugma/dastak ustun turadi (2D dagidek)
      const amalli = hits.find((h) => h.object.userData.tur === 'bos' && h.uv && h.object.userData.model?.amalTop?.(h.uv));
      if (amalli) return { ...amalli.object.userData, uv: amalli.uv };
      return { ...hits[0].object.userData, uv: hits[0].uv };
    };
    // Avto sahna: qurilma rasmidagi tugma/dastakni aniqlash (2D dagidek)
    const amalTop = (u) => {
      if (u?.tur !== 'bos' || !u.model?.amalTop || !u.uv) return null;
      const amal = u.model.amalTop(u.uv);
      if (!amal) return null;
      const el = this.lab.elMap.get(u.el);
      return { amal, rejim: el.def.tugmaRejimi?.(amal, el.param) || el.def.tugmalar?.[amal] || 'almash' };
    };
    const qoyibYubor = () => {
      if (!this.lahzali) return;
      this.lab.elementBosish(this.lahzali.el, this.lahzali.amal, 'qoyib_yubor');
      this.lahzali = null;
      this.controls.enabled = true;
    };
    let bosh = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      bosh = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (!this.avto) return;
      const u = tanla(e);
      const a = amalTop(u);
      if (a?.rejim === 'lahzali') {
        this.lahzali = { el: u.el, amal: a.amal };
        this.controls.enabled = false;
        this.lab.elementBosish(u.el, a.amal, 'bos');
      }
    });
    this.canvas.addEventListener('pointercancel', qoyibYubor);
    this.canvas.addEventListener('pointerup', (e) => {
      if (this.lahzali) { qoyibYubor(); bosh = null; return; }
      if (!bosh) return;
      const siljish = Math.hypot(e.clientX - bosh.x, e.clientY - bosh.y);
      const vaqt = performance.now() - bosh.t;
      bosh = null;
      if (siljish > 7 || vaqt > 700) return;
      const u = tanla(e);
      if (!u) { this.lab.bosh(); return; }
      if (u.tur === 'kl') this.lab.klemmaBosish(u.full);
      else if (u.tur === 'sim') this.lab.simBosish(u.id);
      else if (u.tur === 'bos') {
        if (this.avto) {
          const a = amalTop(u);
          if (a) { if (a.rejim !== 'lahzali') this.lab.elementBosish(u.el, a.amal, 'almash'); return; }
          if (!this.lab.elMap.get(u.el).def.bosiladi) { this.lab.bosh(); return; }
        }
        this.lab.elementBosish(u.el);
      }
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
    this.canvas.addEventListener('pointerleave', () => { this.tip.hidden = true; qoyibYubor(); });
    this.root.querySelectorAll('[data-fokus]').forEach((b) => b.addEventListener('click', () => this.fokus(b.dataset.fokus)));
  }

  fokus(elId) {
    let pos, nishon;
    if (!elId) { pos = this.umumiy.pos.clone(); nishon = this.umumiy.nishon.clone(); }
    else if (elId === '__shit') {
      const sh = this.avto.shit;
      nishon = new THREE.Vector3(sh.pozitsiya[0], sh.pozitsiya[1], 0.05);
      const fov = (this.camera.fov * Math.PI) / 180;
      const d = Math.max(sh.olcham[1] / 2 / Math.tan(fov / 2), sh.olcham[0] / 2 / Math.tan(fov / 2) / this.camera.aspect) * 1.18 + 0.06;
      pos = nishon.clone().add(new THREE.Vector3(0.04, 0.02, d));
    }
    else {
      const m = this.modellar.get(elId);
      const el = this.lab.elMap.get(elId);
      nishon = new THREE.Vector3();
      m.obj.getWorldPosition(nishon);
      if (el.tur === 'lampa_patron') { nishon.y -= 0.08; pos = nishon.clone().add(new THREE.Vector3(0.22, -0.42, 0.42)); }
      else if (el.tur === 'avtomat_1p') { nishon.x -= 0.07; nishon.z += 0.05; pos = nishon.clone().add(new THREE.Vector3(0.08, 0.04, 0.55)); }
      else if (this.avto?.joy.get(elId)?.tur === 'pol') { nishon.y += 0.16; pos = nishon.clone().add(new THREE.Vector3(0.28, 0.32, 0.72)); }
      else if (this.avto?.joy.get(elId)?.tur === 'shift') { nishon.y -= 0.1; pos = nishon.clone().add(new THREE.Vector3(0.25, -0.6, 0.75)); }
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
    for (const m of this.modellar.values()) m.kadr?.(dt);
    // Tanlangan klemma pulsatsiyasi, xato simlar miltillashi
    const puls = 1 + 0.45 * Math.sin(now / 160);
    let tanlanganBor = false;
    for (const k of this.kl.values()) if (k.tanlangan) { this.markerYoz(k, k.mscale * 1.7 * puls, null); tanlanganBor = true; }
    if (tanlanganBor) this.markerlar.instanceMatrix.needsUpdate = true;
    for (const o of this.simObj.values()) if (o.belgi) o.mat.emissiveIntensity = 0.35 + 0.35 * Math.sin(now / 200);
    if (this.oqim.length) {
      const mt = this._mM;
      this.oqim.forEach((d, i) => {
        let u = (d.faza + (now / 1000) * (0.2 / Math.max(0.2, d.len))) % 1;
        if (d.yonalish < 0) u = 1 - u;
        mt.makeTranslation(d.curve.getPointAt(u, this._mv));
        this.oqimMesh.setMatrixAt(i, mt);
      });
      this.oqimMesh.instanceMatrix.needsUpdate = true;
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
    if (this.soyaKerak && this.renderer.shadowMap.enabled && !this.renderer.shadowMap.autoUpdate) { this.renderer.shadowMap.needsUpdate = true; this.soyaKerak = false; }
    if (this.dbg) this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    if (this.dbg) this.debugYangila();
  }

  yoqot() {
    this.ochir();
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.markerlar?.dispose();
    this.oqimMesh?.dispose();
    this.dbg?.remove();
    this.renderer.dispose();
  }
}
