// Tok oqimi simulyatsiyasi.
// Klemmalar — graf tugunlari, simlar va elementlarning ichki yopiq kontaktlari — qirralar.
// Bir-biriga ulangan klemmalar bitta potensial nuqtani (tarmoq, "net") tashkil qiladi (union-find).
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
    return { ...e, def, param, klemmalar, kmap: new Map(klemmalar.map((k) => [k.id, k])) };
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

/**
 * Potensial nuqtalarni hisoblaydi.
 * rejim: 'joriy'  — elementlar hozirgi holatida;
 *        'yopiq'  — barcha kalit/avtomatlar yopiq deb (o‘tkazgich rolini aniqlash uchun);
 *        'doimiy' — faqat doimiy ichki ulanishlar (masalan Wago bloki), kontaktlar ochiq.
 */
export function tarmoq(els, simlar, holatlar, rejim = 'joriy') {
  const uf = new UnionFind();
  const qirralar = []; // oqim yo‘lini topish uchun: {a, b, sim?}
  for (const el of els) {
    for (const k of el.klemmalar) uf.find(`${el.id}.${k.id}`);
    let h = holatlar[el.id] || {};
    if (rejim === 'yopiq' && 'yoqilgan' in h) h = { ...h, yoqilgan: true };
    if (rejim === 'doimiy' && 'yoqilgan' in h) h = { ...h, yoqilgan: false };
    for (const [a, b] of el.def.ichki(h, el.param)) {
      const fa = `${el.id}.${a}`, fb = `${el.id}.${b}`;
      uf.union(fa, fb);
      qirralar.push({ a: fa, b: fb });
    }
  }
  for (const s of simlar) {
    uf.union(s.a, s.b);
    qirralar.push({ a: s.a, b: s.b, sim: s.id });
  }
  return { uf, qirralar };
}

export function manbalar(els) {
  return els.filter((e) => e.def.manba).map((e) => ({
    el: e.id,
    L: `${e.id}.${e.def.manba.L}`,
    N: `${e.id}.${e.def.manba.N}`,
    PE: `${e.id}.${e.def.manba.PE}`,
  }));
}

function qisqaTur(uf, src) {
  if (uf.bir(src.L, src.N)) return 'L-N';
  if (uf.bir(src.L, src.PE)) return 'L-PE';
  return null;
}

/** Manbadan klemmagacha eng qisqa yo‘ldagi simlar (BFS). */
function yol(qirralar, boshi, oxiri) {
  const qo = new Map();
  for (const q of qirralar) {
    if (!qo.has(q.a)) qo.set(q.a, []);
    if (!qo.has(q.b)) qo.set(q.b, []);
    qo.get(q.a).push([q.b, q]);
    qo.get(q.b).push([q.a, q]);
  }
  const ota = new Map([[boshi, null]]);
  const nav = [boshi];
  while (nav.length) {
    const x = nav.shift();
    if (x === oxiri) break;
    for (const [y, q] of qo.get(x) || []) if (!ota.has(y)) { ota.set(y, [x, q]); nav.push(y); }
  }
  if (!ota.has(oxiri)) return [];
  const res = [];
  let c = oxiri;
  while (ota.get(c)) {
    const [p, q] = ota.get(c);
    if (q.sim) res.push({ sim: q.sim, yonalish: q.a === p ? 1 : -1 }); // 1: a→b yo‘nalishida
    c = p;
  }
  return res.reverse();
}

/**
 * To‘liq simulyatsiya.
 * Natija: { qisqa, ochirilsin, chetlab, yuklamalar: {id: {yonadi, faza, nol}}, fazaBor(k), nolBor(k), oqim: [{sim, yonalish}] }
 */
export function simulyatsiya(els, simlar, holatlar) {
  const { uf, qirralar } = tarmoq(els, simlar, holatlar, 'joriy');
  const src = manbalar(els);
  const res = { qisqa: null, ochirilsin: [], chetlab: false, yuklamalar: {}, oqim: [], uf };
  const fazaBor = (k) => src.some((s) => uf.bir(k, s.L));
  const nolBor = (k) => src.some((s) => uf.bir(k, s.N));
  res.fazaBor = fazaBor;
  res.nolBor = nolBor;

  for (const s of src) {
    const q = qisqaTur(uf, s);
    if (!q) continue;
    res.qisqa = { tur: q, manba: s.el };
    // Qaysi yoqilgan avtomat bu tutashuvni uzadi? O‘sha avtomat o‘chib ketadi.
    for (const el of els) {
      if (!el.def.himoya || !holatlar[el.id]?.yoqilgan) continue;
      const sinov = { ...holatlar, [el.id]: { ...holatlar[el.id], yoqilgan: false } };
      if (!qisqaTur(tarmoq(els, simlar, sinov, 'joriy').uf, s)) { res.ochirilsin.push(el.id); break; }
    }
    if (!res.ochirilsin.length) res.chetlab = true; // tutashuv avtomatni chetlab o‘tadi
  }

  for (const el of els) {
    const y = el.def.yuklama;
    if (!y) continue;
    const fa = `${el.id}.${y.faza}`, no = `${el.id}.${y.nol}`;
    const kuchlanish = !res.qisqa && ((fazaBor(fa) && nolBor(no)) || (nolBor(fa) && fazaBor(no)));
    res.yuklamalar[el.id] = { yonadi: kuchlanish, fazaMarkazda: fazaBor(fa), fazaRezbada: fazaBor(no) };
    if (kuchlanish) {
      const s = src[0];
      const [fk, nk] = fazaBor(fa) ? [fa, no] : [no, fa];
      for (const o of yol(qirralar, s.L, fk)) res.oqim.push(o);
      for (const o of yol(qirralar, nk, s.N)) res.oqim.push(o);
    }
  }
  return res;
}

/** Simning o‘tkazgich roli (L/N/PE) — barcha kontaktlar yopiq deb hisoblanadi. */
export function simRollari(els, simlar, holatlar) {
  const { uf } = tarmoq(els, simlar, holatlar, 'yopiq');
  const src = manbalar(els);
  const roli = new Map();
  for (const s of simlar) {
    const r = new Set();
    for (const m of src) {
      if (uf.bir(s.a, m.L)) r.add('L');
      if (uf.bir(s.a, m.N)) r.add('N');
      if (uf.bir(s.a, m.PE)) r.add('PE');
    }
    roli.set(s.id, r);
  }
  return roli;
}
