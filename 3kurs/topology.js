/*
 * topology.js — tarmoq topologiyasi: podstansiyalarni manbadan daraxt (radial-magistral) ko'rinishida ulash.
 *
 * Qo'llanma (4-bob, bet 11–12; 5.2, bet 18–20): p/st lar bir-biri orqali zanjir qilib ulanishi mumkin,
 * jami (ekvivalent) uzunligi eng kichik variant tanlanadi.
 *
 * Tugunlar: 'M' — manba shinasi (ildiz), 'S' — sistema (faqat M–S bog'lovchi liniya), 'A'..'E' — p/st lar.
 * Topologiya — ota-ona xaritasi: { A: 'M', B: 'A', ... } (har p/st qayerdan ta'minlanadi).
 * DOM ga bog'liq emas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KursTopology = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROOT = 'M';
  const SYS = 'S';
  const MATRIX_NODES = ['M', 'S', 'A', 'B', 'C', 'D', 'E'];
  // Liniyalarni raqamlash tartibi (eski yulduz sxema bilan mos: HL-1→A, HL-2→C, HL-3→B, HL-4→D, HL-5→E)
  const ORDER = ['A', 'C', 'B', 'D', 'E'];
  const KM_PER_CM = 20;   // M 1:2 000 000 → 1 sm = 20 km

  /** Juftlik kaliti (tartibdan qat'i nazar bir xil): "M-A", "A-B", ... */
  function key(a, b) {
    const ia = MATRIX_NODES.indexOf(a), ib = MATRIX_NODES.indexOf(b);
    return ia <= ib ? `${a}-${b}` : `${b}-${a}`;
  }

  /** Masofa (km) yoki null — «bu juftlik ulanmaydi» */
  function dist(d, a, b) {
    const v = d ? d[key(a, b)] : null;
    return v > 0 ? v : null;
  }

  /** Chizmadagi koordinatalardan (sm) masofalar matritsasi: 1 sm = 20 km */
  function distFromCoords(coords, kmPerCm = KM_PER_CM) {
    const out = {};
    for (let i = 0; i < MATRIX_NODES.length; i++) {
      for (let j = i + 1; j < MATRIX_NODES.length; j++) {
        const a = MATRIX_NODES[i], b = MATRIX_NODES[j];
        const ca = coords[a], cb = coords[b];
        if (!ca || !cb || [ca.x, ca.y, cb.x, cb.y].some((v) => typeof v !== 'number' || isNaN(v))) continue;
        // sistema faqat manba bilan bog'lanadi
        if ((a === SYS || b === SYS) && !(a === ROOT || b === ROOT)) continue;
        out[key(a, b)] = Math.round(Math.hypot(ca.x - cb.x, ca.y - cb.y) * kmPerCm * 10) / 10;
      }
    }
    return out;
  }

  /** Ota-ona xaritasini tekshirish: tsikl, manbaga yetib bormaslik, masofasi yo'q juftlik */
  function validateParent(parent, psts, d) {
    const errs = [];
    psts.forEach((p) => {
      const par = parent[p];
      if (!par) { errs.push(`p/st ${p}: qayerdan ta'minlanishi ko'rsatilmagan.`); return; }
      if (par === p) { errs.push(`p/st ${p} o'zidan ta'minlana olmaydi.`); return; }
      if (par !== ROOT && !psts.includes(par)) { errs.push(`p/st ${p}: noma'lum manba «${par}».`); return; }
      if (!dist(d, par, p)) errs.push(`${par === ROOT ? 'Manba' : 'p/st ' + par} – p/st ${p} masofasi berilmagan (bu juftlik ulanmaydi).`);
    });
    if (errs.length) return errs;
    psts.forEach((p) => {
      const seen = new Set([p]);
      let cur = parent[p];
      while (cur !== ROOT) {
        if (seen.has(cur)) { errs.push(`Tsikl bor: p/st ${p} manbaga yetib bormaydi (${[...seen, cur].join(' → ')}).`); return; }
        seen.add(cur);
        cur = parent[cur];
      }
    });
    return [...new Set(errs)];
  }

  /**
   * Manba ildiz bo'lgan barcha daraxtlar (masofasi berilgan qirralar bilan).
   * 5 ta p/st uchun nazariy soni 6^4 = 1296 (Keli formulasi); brute force yetarli.
   */
  function enumerateTrees(psts, d) {
    const cands = psts.map((p) => [ROOT, ...psts.filter((q) => q !== p)].filter((par) => dist(d, par, p)));
    const out = [];
    const cur = {};
    const reachesRoot = () => psts.every((p) => {
      let x = p;
      for (let k = 0; k <= psts.length; k++) { x = cur[x]; if (x === ROOT) return true; }
      return false;
    });
    (function rec(i) {
      if (i === psts.length) {
        if (reachesRoot()) out.push({ ...cur });
        return;
      }
      for (const par of cands[i]) { cur[psts[i]] = par; rec(i + 1); }
    })(0);
    return out;
  }

  /** Yulduz topologiya (hamma p/st manbadan) */
  const star = (psts) => Object.fromEntries(psts.map((p) => [p, ROOT]));

  /** Daraxt tuzilmasi: bolalar, chuqurlik, quyi daraxt (subtree), DFS tartibidagi uchastkalar HL-1.. */
  function buildTree(parent, psts, d) {
    const rank = (p) => { const i = ORDER.indexOf(p); return i < 0 ? 99 : i; };
    const children = { [ROOT]: [] };
    psts.forEach((p) => { children[p] = []; });
    psts.forEach((p) => children[parent[p]].push(p));
    Object.values(children).forEach((list) => list.sort((a, b) => rank(a) - rank(b)));
    const order = [], depth = {}, subtree = {};
    (function dfs(node, dep) {
      children[node].forEach((c) => {
        depth[c] = dep;
        order.push(c);
        dfs(c, dep + 1);
      });
    })(ROOT, 1);
    // subtree (o'zi + barcha avlodlari), post-order bilan
    (function collect(node) {
      const s = node === ROOT ? [] : [node];
      children[node].forEach((c) => s.push(...collect(c)));
      if (node !== ROOT) subtree[node] = s;
      return s;
    })(ROOT);
    const edges = order.map((p, i) => ({ id: `HL-${i + 1}`, from: parent[p], to: p, depth: depth[p], l: dist(d, parent[p], p) }));
    const post = order.slice().reverse();   // barglardan ildizga (bolalar ota-onadan oldin)
    return { parent: { ...parent }, children, order, post, depth, subtree, edges, maxDepth: Math.max(...Object.values(depth)) };
  }

  /** Uchastkadagi tranzit yuklama: ΣP, ΣQ, S, o'rtacha Tm, kategoriyalar */
  function edgeTransit(tree, p, loads) {
    const sub = tree.subtree[p];
    const P = sub.reduce((a, q) => a + loads[q].P, 0);
    const Q = sub.reduce((a, q) => a + loads[q].Q, 0);
    const Tm = sub.reduce((a, q) => a + loads[q].P * loads[q].Tm, 0) / P;
    const kats = sub.map((q) => loads[q].kat);
    return { sub, P, Q, S: Math.hypot(P, Q), cos: P / Math.hypot(P, Q), Tm, hasI: kats.includes(1), hasII: kats.includes(2) };
  }

  /** Zanjirlar soni: quyi daraxtda I kat. bo'lsa 2; «II kat. uchun ham 2» sozlamasi bo'lsa II ham */
  function circuits(tr, lineKat2) {
    return tr.hasI || (lineKat2 === 2 && tr.hasII) ? 2 : 1;
  }

  /** Qisqa yozuv: "A←M, C←B, ..." */
  function signature(parent, psts, rootName = 'M') {
    return psts.slice().sort().map((p) => `${p}←${parent[p] === ROOT ? rootName : parent[p]}`).join(', ');
  }

  const isStar = (parent) => Object.values(parent).every((v) => v === ROOT);

  return {
    ROOT, SYS, MATRIX_NODES, ORDER, KM_PER_CM,
    key, dist, distFromCoords, validateParent, enumerateTrees, star, buildTree, edgeTransit, circuits, signature, isStar
  };
});
