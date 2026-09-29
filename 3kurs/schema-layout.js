/*
 * schema-layout.js — sxemalar uchun avtomatik joylashuv (koordinatalar).
 * Manba chapda, vertikal shina markazda, liniyalar va podstansiyalar o'ngda.
 * Tarmoq daraxt ko'rinishida bo'lishi mumkin: har bir uchastka alohida qator (DFS tartibida),
 * chuqurroq p/st ga liniya ota-p/st tugunidan boshlanadi va o'ngga suriladi.
 */
(function (root) {
  'use strict';

  /** Chapdan o'ngga ketma-ket element joylashtiruvchi yordamchi */
  function cursor(x0) {
    let x = x0;
    return {
      /** w kenglikdagi joy ajratadi, uning boshini, markazini va oxirini qaytaradi */
      take(w) { const s = { x1: x, xc: x + w / 2, x2: x + w }; x += w; return s; },
      skip(w) { x += w; },
      get x() { return x; }
    };
  }

  /** Qatorlar: daraxt uchastkalari (DFS tartibida), oxirida HL-6 (sistema) */
  function branchRows(r) {
    const edges = r.lines.filter((l) => l.pst);
    const tie = r.lines.find((l) => !l.pst);
    return edges.concat([tie]).map((ln) => {
      const tr = ln.pst ? r.trafos[ln.pst] : null;
      return { id: ln.id, name: ln.name, pst: ln.pst, from: ln.from, to: ln.to, depth: ln.depth || 1, ln, tr, n: ln.n, nT: tr ? tr.n : 0 };
    });
  }

  // ================================================================ 1-rasm: prinsipial sxema
  function principalLayout(r) {
    const X = {
      gen: 70, xe: 122, br1: 172, tr: 248, br2: 322, bus: 420,
      lineBr: 454, label: 486, kv: 800, hv: 900,
      // p/st ichidagi elementlar — uning YuK shinasiga (hv) nisbatan
      rel: { box: -28, br1: 44, tr: 114, br2: 184, lv: 220 }, loadLen: 46, boxW: 468,
      indent: 330      // ichki (ikkinchi va keyingi pog'ona) uchastkaning gorizontal uzunligi
    };
    const rowPitch = 122, genPitch = 84, top = 78;
    const hvOf = {}, yOf = {};
    const rows = branchRows(r).map((b, i) => {
      const y = top + i * rowPitch;
      let startX, hv;
      if (!b.pst || b.from === 'M') { startX = X.bus; hv = X.hv; }
      else { startX = hvOf[b.from]; hv = startX + X.indent; }
      if (b.pst) { hvOf[b.to] = hv; yOf[b.to] = y; }
      const off = b.n === 2 ? [-7, 7] : [0];
      const trOff = b.nT === 2 ? [-17, 17] : [0];
      return { ...b, y, startX, hv, parentY: b.pst && b.from !== 'M' ? yOf[b.from] : null, off, trOff };
    });
    const yFirst = rows[0].y, yLast = rows[rows.length - 1].y;

    // generatorlar: har biri alohida blok (generator — transformator)
    const gensList = r.gens.map((pg) => ({ Pg: pg, trafo: r.stepUps.find((s) => s.Pg === pg).trafo }));
    const genSpan = (gensList.length - 1) * genPitch;
    let gy0 = (yFirst + yLast) / 2 - genSpan / 2;
    if (gy0 < top) gy0 = top;
    const gens = gensList.map((g, i) => ({ ...g, y: gy0 + i * genPitch }));

    const yMax = Math.max(yLast, gens[gens.length - 1].y);
    const H = yMax + 90;
    const W = Math.max(...rows.map((row) => row.hv + X.rel.box + X.boxW)) + 24;
    return { W, H, X, rows, gens, bus: { x: X.bus, y1: Math.min(top, gy0) - 40, y2: yMax + 40 } };
  }

  // ================================================================ 2-rasm: ekvivalent almashtiruv sxemasi
  function equivalentLayout(r) {
    const A = 108, CAP = 26, RW = 36, XL = 44, G = 10;

    // chap qism: generator → Ug tugun → S_G → xususiy ehtiyoj ↑ → S → ΔS_po'l ↓ → S → R_t, X_t → S → shina
    const L = cursor(34);
    const gen = L.take(46);
    L.skip(8);
    const genBar = L.take(16);
    const sG = L.take(A);
    const xe = L.take(18);
    const sAfterXe = L.take(A);
    const pul = L.take(18);
    const sAfterPul = L.take(A);
    L.skip(G);
    const rt = L.take(RW); L.skip(G);
    const xt = L.take(XL); L.skip(G);
    const sBus = L.take(A);
    L.skip(12);
    const busX = L.x;

    // qator elementlari (shinadan boshlangan qator uchun): S5 → Q_c/2 → S4 → R, X → S3 → Q_c/2 → S2 → tugun U →
    // ΔS_po'l ↑ → S1 → R_t, X_t → K_T → yuklama. Ichki qatorlar ota-tugundan boshlanadi (dx ga suriladi).
    const R = cursor(busX + 6);
    const s5 = R.take(A);
    const cap1 = R.take(CAP);
    const s4 = R.take(A); R.skip(G);
    const rl = R.take(RW); R.skip(G);
    const xl = R.take(XL); R.skip(G);
    const s3 = R.take(A);
    const cap2 = R.take(CAP);
    const s2 = R.take(A);
    const node = R.take(14);
    const pulN = R.take(16);
    const s1 = R.take(A); R.skip(G);
    const rtN = R.take(RW); R.skip(G);
    const xtN = R.take(XL); R.skip(G);
    const kt = R.take(34);
    const load = R.take(52);
    const labelX = R.x + 6;
    // sistema tomoni (HL-6): Π-liniyadan keyin sistema belgisi
    const sysX = s2.x2 + 36;
    const Rbase = { s5, cap1, s4, rl, xl, s3, cap2, s2, node, pulN, s1, rtN, xtN, kt, load, labelX, sysX };

    const rowPitch = 132, top = 96;
    const nodeOf = {}, yOf = {};
    const rows = branchRows(r).map((b, i) => {
      const y = top + i * rowPitch;
      const start = !b.pst || b.from === 'M' ? busX : nodeOf[b.from];
      const dx = start - busX;
      if (b.pst) { nodeOf[b.to] = Rbase.node.xc + dx; yOf[b.to] = y; }
      return { ...b, y, start, dx, parentY: b.pst && b.from !== 'M' ? yOf[b.from] : null };
    });
    const yFirst = rows[0].y, yLast = rows[rows.length - 1].y;
    // generator qismi shinaning chap tomonida, qatorlar o'rtasida (o'ng qatorlar bilan kesishmaydi)
    const genY = (yFirst + yLast) / 2;
    const W = Math.max(...rows.map((row) => labelX + row.dx)) + 200;
    const H = yLast + 110;
    return {
      W, H, genY, rows,
      bus: { x: busX, y1: yFirst - 58, y2: yLast + 40 },
      L: { gen, genBar, sG, xe, sAfterXe, pul, sAfterPul, rt, xt, sBus },
      R: Rbase,
      dims: { A, CAP, RW, XL, G }
    };
  }

  /** Qator elementlarini dx ga surish */
  function shiftR(R, dx) {
    const out = {};
    Object.entries(R).forEach(([k, v]) => {
      out[k] = typeof v === 'number' ? v + dx : { x1: v.x1 + dx, xc: v.xc + dx, x2: v.x2 + dx };
    });
    return out;
  }

  // ================================================================ kichik topologiya chizmasi (variantlar kartasi)
  function miniLayout(parent, psts, order) {
    const rank = (p) => { const i = order.indexOf(p); return i < 0 ? 99 : i; };
    const children = { M: [] };
    psts.forEach((p) => { children[p] = []; });
    psts.forEach((p) => children[parent[p]].push(p));
    Object.values(children).forEach((l) => l.sort((a, b) => rank(a) - rank(b)));
    const pos = {}, pre = [];
    const depth = {};
    (function dfs(n, d) { children[n].forEach((c) => { depth[c] = d; pre.push(c); dfs(c, d + 1); }); })('M', 1);
    const DX = 78, DY = 26, x0 = 22, y0 = 18;
    pre.forEach((p, i) => { pos[p] = { x: x0 + depth[p] * DX, y: y0 + i * DY }; });
    pos.M = { x: x0, y: y0 + (pre.length - 1) * DY / 2 };
    const maxD = Math.max(...Object.values(depth));
    return { pos, children, W: x0 + maxD * DX + 30, H: y0 + (pre.length - 1) * DY + 20, DX };
  }

  root.SchemaLayout = { principalLayout, equivalentLayout, branchRows, shiftR, miniLayout };
})(typeof self !== 'undefined' ? self : this);
