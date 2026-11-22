// Elektr simulyatori (v2).
//
// 1) Potensial nuqtalar: simlar va elementlarning yopiq kontaktlari klemmalarni bitta "net"ga birlashtiradi (union-find).
// 2) Manbalar: A, B, C fazalar (230 V, 120° siljigan), N va PE (0 V). Chastota o‘zgartirgich kabi elementlar o‘z
//    chiqishlarida dinamik manba hosil qiladi.
// 3) Qisqa tutashuv: bir net ichida ikki xil faza yoki faza bilan N/PE. Eng yaqin (eng kichik nominal) himoya
//    elementi o‘chiriladi; himoya topilmasa — "chetlab o‘tgan" tutashuv.
// 4) Tugunlar bo‘yicha hisob (nodal analysis): yuklamalar (lampa, g‘altak, motor chulg‘ami) — qarshilik, manbalar —
//    kompleks kuchlanish (fazor). Natijada har bir yuklamadagi kuchlanish va tok aniqlanadi; ketma-ket ulangan
//    yuklamalar, 230/400 V, motorning aylanish yo‘nalishi to‘g‘ri chiqadi.
// 5) Holatli elementlar (kontaktor, rele, taymer, ...) `hisobla()` orqali yangilanadi va barqaror holat topilguncha
//    takrorlanadi — o‘zini ushlab turish, blokirovka, vaqt relesi shu tarzda ishlaydi.
import { elementTuri } from './elements/index.js';

export class UnionFind {
  constructor() { this.p = new Map(); }
  find(x) {
    if (!this.p.has(x)) { this.p.set(x, x); return x; }
    let r = x;
    while (this.p.get(r) !== r) r = this.p.get(r);
    let c = x;
    while (this.p.get(c) !== r) { const n = this.p.get(c); this.p.set(c, r); c = n; }
    return r;
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
  bir(a, b) { return this.find(a) === this.find(b); }
}

/** Sxema elementlarini dvigatel uchun tayyorlaydi (turi, parametrlari, klemmalari). */
export function tayyorla(sxema) {
  return sxema.elementlar.map((e) => {
    const def = elementTuri(e.tur);
    const param = { ...(def.standart || {}), ...(e.parametr || {}) };
    const klemmalar = def.klemmalar(param);
    const ichkiT = def.ichkiTugunlar ? def.ichkiTugunlar(param) : [];
    return { ...e, def, param, klemmalar, ichkiT, kmap: new Map(klemmalar.map((k) => [k.id, k])) };
  });
}

export function boshlangichHolat(els) {
  const h = {};
  for (const el of els) h[el.id] = el.def.boshlangich(el.param);
  return h;
}

/** "Q1.in" → { el, k } yoki null */
export function klemmaTop(els, full) {
  const i = full.indexOf('.');
  if (i < 0) return null;
  const elId = full.slice(0, i), kId = full.slice(i + 1);
  const el = els.find((e) => e.id === elId);
  const k = el && el.kmap.get(kId);
  return k ? { el, k } : null;
}

// ---------------- manbalar ----------------
const COS = Math.cos((2 * Math.PI) / 3), SIN = Math.sin((2 * Math.PI) / 3);
const FAZOR = { A: [230, 0], B: [230 * COS, -230 * SIN], C: [230 * COS, 230 * SIN], N: [0, 0], PE: [0, 0] };
const asosiy = (id) => id.slice(id.lastIndexOf(':') + 1); // 'UZ1:A' → 'A'
const fazami = (id) => ['A', 'B', 'C'].includes(asosiy(id));

function manbaXarita(el, h) {
  const m = el.def.manba;
  if (!m) return null;
  if (typeof m === 'function') return m(h || {}, el.param, el.id) || null;
  const r = {};
  if (m.L) r[m.L] = 'A';
  if (m.N) r[m.N] = 'N';
  if (m.PE) r[m.PE] = 'PE';
  return r;
}

/** Statik manbalar ro‘yxati (eski API): {el, L, N, PE} */
export function manbalar(els) {
  const res = [];
  for (const e of els) {
    const m = manbaXarita(e, e.def.boshlangich(e.param));
    if (!m || e.def.dinamikManba) continue;
    const top = (id) => { const k = Object.keys(m).find((t) => m[t] === id); return k ? `${e.id}.${k}` : null; };
    res.push({ el: e.id, L: top('A'), N: top('N'), PE: top('PE'), fazalar: ['A', 'B', 'C'].map(top).filter(Boolean) });
  }
  return res;
}

// ---------------- tarmoq (union-find) ----------------
function ichkiUlanish(el, h, rejim) {
  const d = el.def;
  let hh = h || {};
  let hammasi = false;
  if (rejim === 'yopiq') { hammasi = true; if ('yoqilgan' in hh) hh = { ...hh, yoqilgan: true }; }
  if (rejim === 'doimiy') {
    if (d.doimiy) return d.doimiy(el.param);
    if ('yoqilgan' in hh) hh = { ...hh, yoqilgan: false };
  }
  return d.ichki(hh, el.param, hammasi) || [];
}

/**
 * Potensial nuqtalarni hisoblaydi.
 * rejim: 'joriy'  — elementlar hozirgi holatida;
 *        'yopiq'  — barcha kontaktlar yopiq deb (o‘tkazgich rolini aniqlash uchun);
 *        'doimiy' — faqat doimiy ichki ulanishlar (masalan Wago bloki).
 * opts.kichikR — kichik qarshilikli elementlarni (hisoblagich, ampermetr, difavtomat qutblari) ulanish deb hisoblash.
 */
export function tarmoq(els, simlar, holatlar, rejim = 'joriy', opts = { kichikR: true }) {
  const uf = new UnionFind();
  const qirralar = [];
  for (const el of els) {
    for (const k of el.klemmalar) uf.find(`${el.id}.${k.id}`);
    for (const t of el.ichkiT) uf.find(`${el.id}.${t}`);
    const h = holatlar[el.id] || {};
    for (const [a, b] of ichkiUlanish(el, h, rejim)) {
      const fa = `${el.id}.${a}`, fb = `${el.id}.${b}`;
      uf.union(fa, fb);
      qirralar.push({ a: fa, b: fb });
    }
    if (opts.kichikR && el.def.kichikR) {
      for (const r of el.def.kichikR(rejim === 'yopiq' ? { ...h, yoqilgan: true } : h, el.param) || []) {
        const fa = `${el.id}.${r.a}`, fb = `${el.id}.${r.b}`;
        uf.union(fa, fb);
        qirralar.push({ a: fa, b: fb });
      }
    }
  }
  for (const s of simlar) {
    uf.union(s.a, s.b);
    qirralar.push({ a: s.a, b: s.b, sim: s.id });
  }
  return { uf, qirralar };
}

function manbaTugunlari(els, h) {
  const res = []; // [{full, id}]
  for (const el of els) {
    const m = manbaXarita(el, h[el.id]);
    if (!m) continue;
    for (const [t, id] of Object.entries(m)) {
      const sid = el.def.dinamikManba ? `${el.id}:${id}` : id;
      res.push({ full: `${el.id}.${t}`, id: sid });
    }
  }
  return res;
}

/** Netlardagi manbalar va qisqa tutashuv. */
function qisqaniTop(uf, manba) {
  const net = new Map();
  for (const m of manba) {
    const r = uf.find(m.full);
    if (!net.has(r)) net.set(r, new Set());
    net.get(r).add(m.id);
  }
  for (const [r, ids] of net) {
    const f = [...ids].filter(fazami);
    const n = [...ids].filter((i) => !fazami(i));
    if (f.length > 1) return { tur: 'L-L', net: r, ids: [...ids] };
    if (f.length === 1 && n.length) return { tur: n.some((i) => asosiy(i) === 'N') ? 'L-N' : 'L-PE', net: r, ids: [...ids] };
  }
  return null;
}

// ---------------- tugunlar bo‘yicha hisob ----------------
function gauss(A, b1, b2) {
  const n = A.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-15) continue;
    if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; [b1[p], b1[c]] = [b1[c], b1[p]]; [b2[p], b2[c]] = [b2[c], b2[p]]; }
    const d = A[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d;
      if (f === 0) continue;
      const Ar = A[r], Ac = A[c];
      for (let k = c; k < n; k++) Ar[k] -= f * Ac[k];
      b1[r] -= f * b1[c];
      b2[r] -= f * b2[c];
    }
  }
  const x1 = new Array(n).fill(0), x2 = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s1 = b1[r], s2 = b2[r];
    for (let k = r + 1; k < n; k++) { s1 -= A[r][k] * x1[k]; s2 -= A[r][k] * x2[k]; }
    const d = A[r][r] || 1e-15;
    x1[r] = s1 / d; x2[r] = s2 / d;
  }
  return [x1, x2];
}

function yech(els, simlar, h, ochiq) {
  const manba = manbaTugunlari(els, h);
  const t0 = tarmoq(els, simlar, h, 'joriy', { kichikR: true });
  const qisqa = qisqaniTop(t0.uf, manba);
  const t1 = tarmoq(els, simlar, h, 'joriy', { kichikR: false });
  const uf1 = t1.uf;
  // Netlarning ma’lum kuchlanishi
  const malum = new Map();
  const netManba0 = new Map();
  for (const m of manba) {
    malum.set(uf1.find(m.full), FAZOR[asosiy(m.id)]);
    const r0 = t0.uf.find(m.full);
    if (!netManba0.has(r0)) netManba0.set(r0, m.id);
  }
  // Ikki qutbli elementlar: yuklamalar va kichik qarshiliklar
  const ikki = [];
  for (const el of els) {
    const hh = h[el.id] || {};
    for (const y of (el.def.yuklamalar ? el.def.yuklamalar(hh, el.param) : [])) ikki.push({ el: el.id, ...y, tur: 'y' });
    for (const y of (el.def.kichikR ? el.def.kichikR(hh, el.param) : [])) ikki.push({ el: el.id, ...y, tur: 'r' });
  }
  const noma = new Map();
  const nomaQosh = (full) => {
    const r = uf1.find(full);
    if (!malum.has(r) && !noma.has(r)) noma.set(r, noma.size);
    return r;
  };
  for (const y of ikki) { y.na = nomaQosh(`${y.el}.${y.a}`); y.nb = nomaQosh(`${y.el}.${y.b}`); }
  const n = noma.size;
  const G = Array.from({ length: n }, () => new Array(n).fill(0));
  const I1 = new Array(n).fill(0), I2 = new Array(n).fill(0);
  for (let i = 0; i < n; i++) G[i][i] = 1e-9; // "osilib qolgan" tugunlar uchun juda kichik o‘tkazuvchanlik
  if (!ochiq) {
    for (const y of ikki) {
      const g = 1 / Math.max(y.R, 1e-6);
      const ia = noma.get(y.na), ib = noma.get(y.nb);
      const va = malum.get(y.na), vb = malum.get(y.nb);
      if (ia !== undefined) {
        G[ia][ia] += g;
        if (ib !== undefined) G[ia][ib] -= g; else { I1[ia] += g * vb[0]; I2[ia] += g * vb[1]; }
      }
      if (ib !== undefined) {
        G[ib][ib] += g;
        if (ia !== undefined) G[ib][ia] -= g; else { I1[ib] += g * va[0]; I2[ib] += g * va[1]; }
      }
    }
  }
  const [x1, x2] = n ? gauss(G, I1, I2) : [[], []];
  const Vnet = (r) => {
    if (ochiq) return [0, 0];
    if (malum.has(r)) return malum.get(r);
    const i = noma.get(r);
    return i === undefined ? [0, 0] : [x1[i], x2[i]];
  };
  const V = (full) => Vnet(uf1.find(full));
  const toklar = new Map(); // `${el}|${nom}` → [re, im]
  for (const y of ikki) {
    const va = Vnet(y.na), vb = Vnet(y.nb);
    const g = 1 / Math.max(y.R, 1e-6);
    const I = [(va[0] - vb[0]) * g, (va[1] - vb[1]) * g];
    y.I = I;
    if (y.nom) toklar.set(`${y.el}|${y.nom}`, I);
  }
  const fazasi = (full) => {
    if (ochiq) return null;
    const id = netManba0.get(t0.uf.find(full));
    return id ? asosiy(id) : null;
  };
  return { qisqa, uf0: t0.uf, qirralar: t0.qirralar, V, toklar, ikki, fazasi, manba };
}

const kat = (v) => Math.hypot(v[0], v[1]);
const ayir = (a, b) => [a[0] - b[0], a[1] - b[1]];

function ctxYasa(el, s, vaqt) {
  const f = (t) => `${el.id}.${t}`;
  return {
    vaqt,
    V: (t) => s.V(f(t)),
    kuchlanish: (a, b) => kat(ayir(s.V(f(a)), s.V(f(b)))),
    fazor: (a, b) => ayir(s.V(f(a)), s.V(f(b))),
    tok: (nom) => { const I = s.toklar.get(`${el.id}|${nom}`); return I ? kat(I) : 0; },
    tokF: (nom) => s.toklar.get(`${el.id}|${nom}`) || [0, 0],
    fazasi: (t) => s.fazasi(f(t)),
    bir: (a, b) => s.uf0.bir(f(a), f(b)),
  };
}

function tengmi(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/** Qisqa tutashuvni qaysi himoya elementi uzadi (eng kichik nominal — eng yaqin). */
function uzgichniTop(els, simlar, h, qisqa) {
  const nomzod = [];
  for (const el of els) {
    if (!el.def.himoya || !h[el.id]?.yoqilgan) continue;
    const sinov = { ...h, [el.id]: { ...h[el.id], yoqilgan: false } };
    const t = tarmoq(els, simlar, sinov, 'joriy', { kichikR: true });
    const q = qisqaniTop(t.uf, manbaTugunlari(els, sinov));
    if (!q) nomzod.push(el);
  }
  nomzod.sort((a, b) => (a.param.nominal ?? 999) - (b.param.nominal ?? 999));
  return nomzod[0]?.id || null;
}

/** Yuklamadan manbagacha bo‘lgan simlar (BFS) — tok oqimi animatsiyasi uchun. */
function oqimYoli(qirralar, boshi, maqsadmi) {
  const qo = new Map();
  for (const q of qirralar) {
    if (!qo.has(q.a)) qo.set(q.a, []);
    if (!qo.has(q.b)) qo.set(q.b, []);
    qo.get(q.a).push([q.b, q]);
    qo.get(q.b).push([q.a, q]);
  }
  const ota = new Map([[boshi, null]]);
  const nav = [boshi];
  let topildi = null;
  while (nav.length) {
    const x = nav.shift();
    if (x !== boshi && maqsadmi(x)) { topildi = x; break; }
    for (const [y, q] of qo.get(x) || []) if (!ota.has(y)) { ota.set(y, [x, q]); nav.push(y); }
  }
  if (!topildi) return [];
  const res = [];
  let c = topildi;
  while (ota.get(c)) {
    const [p, q] = ota.get(c);
    // yo‘nalish: manbadan yuklamaga (boshi — yuklama, oxiri — manba)
    if (q.sim) res.push({ sim: q.sim, yonalish: q.a === c ? 1 : -1 });
    c = p;
  }
  return res;
}

/**
 * To‘liq simulyatsiya.
 * Natija: { holatlar, natija: {id: {...holatlar:[...]}}, yuklamalar (= natija), qisqa, ochirilsin, chetlab,
 *           tebranish, fazaBor(k), nolBor(k), fazasi(k), kuchlanish(a,b), oqim: [{sim, yonalish}] }
 */
export function simulyatsiya(els, simlar, holatlar, opts = {}) {
  const vaqt = opts.vaqt || 0;
  const h = JSON.parse(JSON.stringify(holatlar || {}));
  const res = { qisqa: null, ochirilsin: [], chetlab: false, tebranish: false, natija: {} };
  let s = null;
  for (let it = 0; it < 40; it++) {
    s = yech(els, simlar, h, false);
    if (s.qisqa) {
      const uz = uzgichniTop(els, simlar, h, s.qisqa);
      res.qisqa = res.qisqa || { tur: s.qisqa.tur };
      if (uz) {
        h[uz] = { ...h[uz], yoqilgan: false };
        res.ochirilsin.push(uz);
        continue;
      }
      res.chetlab = true;
      s = yech(els, simlar, h, true); // tutashuv bartaraf etilmagan: hamma narsa o‘chgan deb ko‘rsatamiz
    }
    let ozgardi = false;
    for (const el of els) {
      if (!el.def.hisobla) continue;
      const r = el.def.hisobla(ctxYasa(el, s, vaqt), h[el.id] || {}, el.param) || {};
      res.natija[el.id] = r.natija || {};
      if (r.holat && !tengmi(r.holat, h[el.id])) { h[el.id] = r.holat; ozgardi = true; }
    }
    if (res.chetlab || !ozgardi) break;
    if (it === 39) res.tebranish = true;
  }
  res.holatlar = h;
  res.yuklamalar = res.natija; // eski nom
  res.fazasi = (k) => s.fazasi(k);
  res.fazaBor = (k) => ['A', 'B', 'C'].includes(s.fazasi(k) || '');
  res.nolBor = (k) => s.fazasi(k) === 'N';
  res.kuchlanish = (a, b) => kat(ayir(s.V(a), s.V(b)));
  // Tok oqimi: tok o‘tayotgan har bir yuklamadan manbalargacha
  res.oqim = [];
  const korildi = new Set();
  if (!res.chetlab) {
    const manbaTugun = new Set(s.manba.map((m) => m.full));
    for (const y of s.ikki) {
      if (y.tur !== 'y' || kat(y.I) < 0.02) continue;
      for (const t of [y.a, y.b]) {
        for (const o of oqimYoli(s.qirralar, `${y.el}.${t}`, (x) => manbaTugun.has(x))) {
          if (korildi.has(o.sim)) continue;
          korildi.add(o.sim);
          // manba tomoni faza bo‘lsa — yuklamaga qarab, N bo‘lsa — manbaga qarab
          const f = s.fazasi(`${y.el}.${t}`);
          res.oqim.push({ sim: o.sim, yonalish: f === 'N' || f === 'PE' ? -o.yonalish : o.yonalish });
        }
      }
    }
  }
  return res;
}

/** Simning o‘tkazgich roli (L/N/PE) — barcha kontaktlar yopiq deb hisoblanadi. */
export function simRollari(els, simlar, holatlar) {
  const { uf } = tarmoq(els, simlar, holatlar, 'yopiq');
  const manba = manbaTugunlari(els, holatlar);
  const netRol = new Map();
  for (const m of manba) {
    const r = uf.find(m.full);
    if (!netRol.has(r)) netRol.set(r, new Set());
    const a = asosiy(m.id);
    netRol.get(r).add(['A', 'B', 'C'].includes(a) ? 'L' : a);
  }
  const roli = new Map();
  for (const s of simlar) roli.set(s.id, new Set(netRol.get(uf.find(s.a)) || []));
  return roli;
}
