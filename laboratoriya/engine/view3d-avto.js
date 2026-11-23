// Har qanday sxema uchun avtomatik 3D sahna (sxemada qo‘lda yozilgan `sahna3d` bo‘lmasa).
// Uy xonasi: devorda montaj shiti (qurilmalar 2D sxemadagi tartibda), lampalar shiftda,
// kalit/rozetkalar devorda, motorlar polda. Shit qurilmalarining old yuzasi — 2D rasmining o‘zi
// (klemmalar, rangli nomlar va holati bilan), shuning uchun 2D va 3D bir xil "o‘qiladi".
import * as THREE from 'three';
import { ELEMENTLAR } from './elements/index.js';
import { KLEMMA_RANG, klemmaTuri } from './elements/_umumiy.js';

const NS = 'http://www.w3.org/2000/svg';
const SHIFT = new Set(['lampochka', 'lyum_lampa', 'drossel', 'starter', 'lampa_patron']);
const DEVOR = new Set(['kalit_1', 'kalit_2y', 'rozetka', 'karta_kalit', 'ventilyator', 'suzgich', 'solenoid']);
const POL = new Set(['motor_3f', 'motor_6', 'motor_1f']);
/** Qurilma xonaning qayerida turadi: shit | devor | shift | pol. */
export const joyTuri = (tur) => (SHIFT.has(tur) ? 'shift' : DEVOR.has(tur) ? 'devor' : POL.has(tur) ? 'pol' : 'shit');

const H = 2.7;
const DEVOR_BALAND = { rozetka: 0.4, ventilyator: 2.05, suzgich: 1.05, solenoid: 1.15 };

/** Joylashuv: xona o‘lchami, shit, har bir qurilmaning 3D joyi, kamera. */
export function avtoJoylash(lab) {
  const els = lab.els;
  const shitEl = els.filter((e) => joyTuri(e.tur) === 'shit');
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of shitEl) {
    const [x, y] = e.pozitsiya2d;
    x0 = Math.min(x0, x - 115); y0 = Math.min(y0, y - 120); x1 = Math.max(x1, x + 115); y1 = Math.max(y1, y + 135);
  }
  if (!shitEl.length) { x0 = 0; y0 = 0; x1 = 200; y1 = 200; }
  const bw = x1 - x0, bh = y1 - y0;
  const K = Math.min(0.0006, 1.6 / bw, 1.15 / bh);
  const sw = bw * K + 0.07, sh = bh * K + 0.07;
  const sy = Math.max(0.9 + sh / 2, Math.min(1.5, H - 0.3 - sh / 2));
  // Gorizontal joylash: 0 — shitning chap cheti; keyin xona markaziga suriladi
  const joy = new Map();
  const shitX = sw / 2;
  const map2d = (x, y) => [shitX - sw / 2 + 0.035 + (x - x0) * K, sy + sh / 2 - 0.035 - (y - y0) * K];
  for (const e of shitEl) {
    const [x, y] = map2d(...e.pozitsiya2d);
    joy.set(e.id, { tur: 'shit', pos: [x, y, 0.008], K });
  }
  const tartib = (a, b) => a.pozitsiya2d[0] - b.pozitsiya2d[0] || a.pozitsiya2d[1] - b.pozitsiya2d[1];
  let o = sw + 0.45;
  for (const e of els.filter((x) => joyTuri(x.tur) === 'devor').sort(tartib)) {
    joy.set(e.id, { tur: 'devor', pos: [o, DEVOR_BALAND[e.tur] ?? 1.0, 0.002], K: 0.0006, masshtab: e.tur === 'kalit_1' ? 1.3 : 1 });
    o += e.tur === 'suzgich' ? 0.5 : 0.42;
  }
  const shiftEl = els.filter((x) => joyTuri(x.tur) === 'shift').sort(tartib);
  let so = Math.max(sw * 0.7, 0.4);
  for (const e of shiftEl) {
    const lampa = e.tur === 'lampochka' || e.tur === 'lampa_patron';
    joy.set(e.id, { tur: 'shift', pos: [so, H, e.tur === 'lyum_lampa' ? 0.55 : lampa ? 0.5 : 0.3], K: 0.0006, masshtab: lampa ? 1.3 : 1 });
    so += e.tur === 'lyum_lampa' ? 0.85 : 0.6;
  }
  let mo = 0.25;
  for (const e of els.filter((x) => joyTuri(x.tur) === 'pol').sort(tartib)) {
    joy.set(e.id, { tur: 'pol', pos: [mo, 0, 0.85], K: 0.0006 });
    mo += 0.7;
  }
  const ong = Math.max(sw, o - 0.2, so - 0.2, mo - 0.3);
  const W = Math.max(4.6, ong + 1.6);
  const siljit = -ong / 2 - 0.15;
  for (const j of joy.values()) j.pos[0] += siljit;
  const shitMarkaz = [shitX + siljit, sy, 0];
  const mid = ong / 2 + siljit;
  const D = 4.2;
  const shiftBor = shiftEl.length > 0;
  const polBor = els.some((x) => joyTuri(x.tur) === 'pol');
  const masofa = Math.min(D - 0.35, Math.max(shiftBor ? 3.0 : polBor ? 2.7 : 0, 1.45 + ong * 0.42));
  const kamY = polBor && !shiftBor ? 1.75 : shiftBor ? 1.3 : 1.45;
  const nishonY = polBor && !shiftBor ? 0.95 : shiftBor ? 1.62 : 1.25;
  return {
    K, x0, y0,
    map2d: (x, y) => { const [a, b] = map2d(x, y); return [a + siljit, b]; },
    joy,
    shit: { pozitsiya: shitMarkaz, olcham: [sw, sh, 0.16] },
    s3: {
      xona: { kenglik: W, balandlik: H, chuqurlik: D },
      masshtab: 1,
      kamera: { pozitsiya: [mid + 0.1, kamY, masofa], nishon: [mid, nishonY, polBor ? 0.45 : 0.25] },
      bezaklar: [{ tur: 'shit_korpus', pozitsiya: shitMarkaz, olcham: [sw, sh, 0.16], din: [] }],
    },
  };
}

// ---------- 2D rasmidan "naqsh" (decal): yashirin SVG da chizib, stillarini ichiga yozib, rasmga aylantiramiz ----------
let olchovchi = null;
function olchovSvg() {
  if (olchovchi) return olchovchi;
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:-10000px;top:0;width:10px;height:10px;overflow:hidden;visibility:hidden;pointer-events:none';
  d.innerHTML = `<svg class="v2d" xmlns="${NS}" width="10" height="10"><g></g></svg>`;
  document.body.appendChild(d);
  olchovchi = d.querySelector('g');
  return olchovchi;
}

const STIL = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-weight', 'font-family', 'letter-spacing'];

function halqalar(el) {
  return el.klemmalar.map((k) => {
    const r = KLEMMA_RANG[klemmaTuri(k.yorliq)];
    return `<circle cx="${k.xy[0]}" cy="${k.xy[1]}" r="7" fill="#fff" stroke="${r}" stroke-width="2.4"/><circle cx="${k.xy[0]}" cy="${k.xy[1]}" r="2.2" fill="${r}"/>`;
  }).join('');
}

/** Element 2D rasmini o‘lchaydi va mustaqil SVG matniga aylantiradi. */
function naqsh(el, holat, natija, yonadi, sobit = null) {
  const g = olchovSvg();
  g.innerHTML = `<g class="tana">${el.def.svg({ el, holat, param: el.param, yonadi, natija })}</g><g>${halqalar(el)}</g>`;
  const tana = g.firstChild;
  const yashir = [...tana.querySelectorAll('.d-lbl, .d-klg')];
  yashir.forEach((n) => { n.style.display = 'none'; });
  const tb = tana.getBBox();
  yashir.forEach((n) => { n.style.display = ''; });
  const fb = g.getBBox();
  const amallar = [...g.querySelectorAll('[data-amal]')].map((n) => { const b = n.getBBox(); return { amal: n.dataset.amal, x: b.x, y: b.y, w: b.width, h: b.height }; });
  // Korpus rangi — eng katta to‘rtburchakning rangi
  let rang = '#e8e8e6', max = 0;
  for (const r of tana.querySelectorAll('rect')) {
    const b = r.getBBox();
    const f = getComputedStyle(r).fill;
    if (b.width * b.height > max && f && f !== 'none' && !f.includes('url') && f !== 'transparent' && !/rgba\(.*,\s*0\)/.test(f)) { max = b.width * b.height; rang = f; }
  }
  for (const n of g.querySelectorAll('*')) {
    const cs = getComputedStyle(n);
    for (const p of STIL) { const v = cs.getPropertyValue(p); if (v) n.setAttribute(p, v); }
    n.removeAttribute('class');
    n.removeAttribute('style');
  }
  const p = 6;
  const v = sobit || { x: fb.x - p, y: fb.y - p, w: fb.width + 2 * p, h: fb.height + 2 * p };
  const svg = `<svg xmlns="${NS}" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" width="${Math.round(v.w * 3)}" height="${Math.round(v.h * 3)}">${g.innerHTML}</svg>`;
  g.innerHTML = '';
  return { svg, tana: { x: tb.x, y: tb.y, w: tb.width, h: tb.height }, toliq: v, amallar, rang };
}

function rasmga(svg, mat) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const eski = mat.map;
      mat.map = tex;
      mat.opacity = 1;
      mat.needsUpdate = true;
      eski?.dispose();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/** Shit/devor qurilmasi: korpus (quti) + old yuzasida 2D rasmi. Klemmalar 2D joylariga mos. */
function naqshModel(v, el, j) {
  const K = j.K;
  const lab = v.lab;
  const boshNatija = lab.sim.natija[el.id] || {};
  let n = naqsh(el, lab.holat[el.id] || {}, boshNatija, !!lab.sim.yuklamalar[el.id]?.yonadi);
  const g = new THREE.Group();
  const chuq = el.tur === 'suzgich' ? 0.06 : 0.042;
  const korpus = new THREE.Mesh(new THREE.BoxGeometry(n.tana.w * K, n.tana.h * K, chuq), v.mat(new THREE.Color(n.rang).getHex(), { roughness: 0.5 }));
  korpus.position.set((n.tana.x + n.tana.w / 2) * K, -(n.tana.y + n.tana.h / 2) * K, chuq / 2);
  g.add(korpus);
  const yuzMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0, alphaTest: 0.03, roughness: 0.55, envMapIntensity: 0.4 });
  const yuz = new THREE.Mesh(new THREE.PlaneGeometry(n.toliq.w * K, n.toliq.h * K), yuzMat);
  yuz.position.set((n.toliq.x + n.toliq.w / 2) * K, -(n.toliq.y + n.toliq.h / 2) * K, chuq + 0.0008);
  yuz.userData.soyasiz = true;
  g.add(yuz);
  let versiya = 0, oxirgi = n.svg;
  rasmga(n.svg, yuzMat);
  const klemmalar = {};
  for (const k of el.klemmalar) {
    const [dx, dy] = k.dir2d || [0, 0];
    klemmalar[k.id] = { pos: [k.xy[0] * K, -k.xy[1] * K, chuq + 0.002], dir: [dx * 0.55, -dy * 0.55, 0.84], r: 0.0075 };
  }
  korpus.userData = { tur: 'bos', el: el.id };
  const m = {
    obj: g, klemmalar, bosish: [korpus, yuz],
    // Bosilgan nuqta (yuzadagi uv) bo‘yicha qaysi tugma/dastak bosilganini aniqlaydi
    amalTop(uv) {
      const sx = n.toliq.x + uv.x * n.toliq.w, sy = n.toliq.y + (1 - uv.y) * n.toliq.h;
      const a = n.amallar.find((b) => sx >= b.x - 4 && sx <= b.x + b.w + 4 && sy >= b.y - 4 && sy <= b.y + b.h + 4);
      return a?.amal || null;
    },
    yangila(holat, { yonadi, natija }) {
      const yangi = naqsh(el, holat, natija || {}, yonadi, n.toliq);
      if (yangi.svg === oxirgi) return;
      oxirgi = yangi.svg;
      const ver = ++versiya;
      n = { ...yangi, toliq: n.toliq, tana: n.tana };
      rasmga(yangi.svg, yuzMat).then(() => { void ver; });
    },
  };
  return m;
}

/** Motor (polda): korpus, qovurg‘alar, panjara qopqoq, val va aylanadigan parrak; klemma qutisi tepada. */
function motorModel(v, el) {
  const g = new THREE.Group();
  const R = 0.09, L = 0.28, oy = 0.04 + R;
  const kok = v.mat(0x4fa9cc, { roughness: 0.45, metalness: 0.2 });
  const toq = v.mat(0x2f86a8, { roughness: 0.5, metalness: 0.2 });
  const metal = v.mat(0xc3c8cf, { metalness: 0.85, roughness: 0.3 });
  const tana = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 40), kok);
  tana.rotation.z = Math.PI / 2; tana.position.y = oy;
  g.add(tana);
  for (let i = 0; i < 9; i++) {
    const q = new THREE.Mesh(new THREE.TorusGeometry(R + 0.002, 0.004, 6, 40), kok);
    q.rotation.y = Math.PI / 2; q.position.set(-L / 2 + 0.03 + i * 0.028, oy, 0);
    g.add(q);
  }
  const qopqoq = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.9, 0.07, 36), toq);
  qopqoq.rotation.z = Math.PI / 2; qopqoq.position.set(-L / 2 - 0.035, oy, 0);
  g.add(qopqoq);
  const old = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.02, 36), toq);
  old.rotation.z = Math.PI / 2; old.position.set(L / 2 + 0.01, oy, 0);
  g.add(old);
  const val = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 16), metal);
  val.rotation.z = Math.PI / 2; val.position.set(L / 2 + 0.06, oy, 0);
  g.add(val);
  // Aylanish ko‘rinsin: valdagi uch rangli parrak (2D dagidek)
  const parrak = new THREE.Group();
  const rangl = [0xf5c400, 0xd93a32, 0x22a35a];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.024), v.mat(rangl[i], { roughness: 0.5 }));
    b.position.y = 0.035;
    const q = new THREE.Group(); q.rotation.x = (i * 2 * Math.PI) / 3; q.add(b);
    parrak.add(q);
  }
  parrak.position.set(L / 2 + 0.1, oy, 0);
  g.add(parrak);
  for (const z of [-0.06, 0.06]) {
    const oyoq = new THREE.Mesh(new THREE.BoxGeometry(L * 0.8, 0.04, 0.03), toq);
    oyoq.position.set(0, 0.02, z);
    g.add(oyoq);
  }
  const plita = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.012, 0.24), v.mat(0x5b6068, { roughness: 0.7, metalness: 0.3 }));
  plita.position.set(0.03, 0.006, 0);
  g.add(plita);
  // Klemma qutisi
  const kq = { w: 0.12, h: 0.05, d: 0.1 };
  const ty = oy + R - 0.01;
  const quti = new THREE.Mesh(new THREE.BoxGeometry(kq.w, kq.h, kq.d), toq);
  quti.position.set(0, ty + kq.h / 2, 0);
  g.add(quti);
  const tepa = ty + kq.h;
  const klemmalar = {};
  const asosiy = el.klemmalar.filter((k) => k.id !== 'PE');
  const qator = asosiy.length > 4 ? [asosiy.slice(0, 3), asosiy.slice(3)] : [asosiy];
  qator.forEach((q, qi) => {
    q.forEach((k, i) => {
      const x = (i - (q.length - 1) / 2) * 0.03;
      const z = qator.length > 1 ? (qi ? 0.025 : -0.025) : 0;
      klemmalar[k.id] = { pos: [x, tepa + 0.004, z], dir: [0, 1, 0.15], r: 0.008 };
      const vint = v.vint(0.0045);
      vint.rotation.x = -Math.PI / 2;
      vint.position.set(x, tepa + 0.001, z);
      g.add(vint);
      g.add(v.yorliq(k.yorliq, { olcham: 0.013, x, y: tepa + 0.022, z: z + 0.012, rang: KLEMMA_RANG[klemmaTuri(k.yorliq)] }));
    });
  });
  if (el.klemmalar.some((k) => k.id === 'PE')) {
    klemmalar.PE = { pos: [kq.w / 2 + 0.004, ty + 0.02, 0.03], dir: [1, 0, 0.3], r: 0.008 };
    g.add(v.yorliq('PE', { olcham: 0.013, x: kq.w / 2 + 0.022, y: ty + 0.04, z: 0.03, rang: KLEMMA_RANG.pe }));
  }
  g.add(v.yorliq(el.id, { olcham: 0.028, x: 0, y: oy, z: R + 0.02, fon: 'rgba(255,255,255,.92)', rang: '#111318' }));
  let tezlik = 0;
  return {
    obj: g, klemmalar, bosish: [],
    yangila(h, { natija }) {
      const hol = natija?.holatlar || [];
      tezlik = hol.includes('ishlaydi') ? (hol.includes('teskari') ? -1 : 1) * (hol.includes('yulduz') ? 9 : 16) : 0;
    },
    kadr(dt) { parrak.rotation.x += tezlik * dt; val.rotation.x += tezlik * dt; },
  };
}

/** Lyuminessent lampa (shiftda): korpus, naycha (yonganda nur), uchlarida A1–A2 va B1–B2 tola klemmalari. */
function lyumModel(v, el) {
  const g = new THREE.Group();
  const korpus = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.11), v.mat(0xf2f2ef, { roughness: 0.45 }));
  korpus.position.y = -0.02;
  g.add(korpus);
  const naychaMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, emissive: 0x000000, roughness: 0.3 });
  const naycha = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.6, 20), naychaMat);
  naycha.rotation.z = Math.PI / 2; naycha.position.y = -0.058;
  g.add(naycha);
  for (const x of [-0.31, 0.31]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.05), v.mat(0x9aa0a8, { roughness: 0.5 }));
    t.position.set(x, -0.055, 0); g.add(t);
  }
  const nur = new THREE.PointLight(0xfff6e0, 0, 6, 1.6);
  nur.position.y = -0.2;
  g.add(nur);
  const klemmalar = {
    A1: { pos: [-0.355, -0.03, -0.025], dir: [-1, 0, 0], r: 0.008 }, A2: { pos: [-0.355, -0.03, 0.025], dir: [-1, 0, 0], r: 0.008 },
    B1: { pos: [0.355, -0.03, -0.025], dir: [1, 0, 0], r: 0.008 }, B2: { pos: [0.355, -0.03, 0.025], dir: [1, 0, 0], r: 0.008 },
  };
  for (const [id, k] of Object.entries(klemmalar)) g.add(v.yorliq(id, { olcham: 0.014, x: k.pos[0] + Math.sign(k.pos[0]) * 0.02, y: -0.05, z: k.pos[2], rang: KLEMMA_RANG.boshqa }));
  return {
    obj: g, klemmalar, bosish: [], yorugl: nur,
    yangila(h, { natija }) {
      const on = (natija?.holatlar || []).includes('yonadi');
      naychaMat.emissive.set(on ? 0xfff4d6 : 0x000000);
      naychaMat.emissiveIntensity = on ? 1.6 : 0;
      nur.intensity = on ? 2.2 : 0;
    },
  };
}

/** Avto rejimdagi element modeli. */
export function avtoModel(v, el, j) {
  if (j.tur === 'pol') return motorModel(v, el);
  if (el.tur === 'lyum_lampa') return lyumModel(v, el);
  if (el.tur === 'lampochka') {
    // Shiftdagi patronli lampa modeli; klemmalar: L → markaziy kontakt, N → rezba
    const m = ELEMENTLAR.lampa_patron.model3d(v.ctx(el));
    m.klemmalar = { L: m.klemmalar.markaz, N: m.klemmalar.rezba };
    return m;
  }
  if (el.def.model3d && (el.tur === 'kalit_1' || el.tur === 'lampa_patron')) return el.def.model3d(v.ctx(el));
  const m = naqshModel(v, el, j);
  if (j.tur === 'shift') m.obj.rotation.x = Math.PI / 2; // old yuzasi pastga qaraydi
  return m;
}

/** 2D dagidek to‘g‘ri burchakli yo‘l (2D koordinatalarda). */
export function yol2d(a, b, da, db, idx) {
  const L = 26;
  const p1 = [a[0] + da[0] * L, a[1] + da[1] * L], p2 = [b[0] + db[0] * L, b[1] + db[1] * L];
  const off = ((idx % 5) - 2) * 6;
  const gorA = da[0] !== 0, gorB = db[0] !== 0;
  if (gorA && gorB) { const mx = (p1[0] + p2[0]) / 2 + off; return [a, p1, [mx, p1[1]], [mx, p2[1]], p2, b]; }
  if (!gorA && !gorB) { const my = (p1[1] + p2[1]) / 2 + off; return [a, p1, [p1[0], my], [p2[0], my], p2, b]; }
  if (gorA) return [a, p1, [p2[0] + off, p1[1]], [p2[0] + off, p2[1]], p2, b];
  return [a, p1, [p1[0] + off, p2[1]], [p2[0], p2[1]], b];
}
