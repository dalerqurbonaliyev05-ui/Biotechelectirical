/*
 * schema-layout.js — sxemalar uchun avtomatik joylashuv (koordinatalar).
 * Manba chapda, vertikal shina markazda, liniyalar va podstansiyalar o'ngda.
 * Qatorlar soni podstansiyalar soniga, generator qatorlari generatorlar soniga qarab hisoblanadi.
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

  /** Radial tarmoq qatorlari: HL-1..HL-5 (p/st lar), oxirida HL-6 (sistema) */
  function branchRows(r) {
    const C = root.KursCalc;
    return C.LINES.map((l) => {
      const ln = r.lines.find((x) => x.id === l.id);
      const tr = l.pst ? r.trafos[l.pst] : null;
      return { id: l.id, pst: l.pst, ln, tr, n: ln.n, nT: tr ? tr.n : 0 };
    });
  }

  // ================================================================ 1-rasm: prinsipial sxema
  function principalLayout(r) {
    const X = {
      gen: 70, xe: 122, br1: 172, tr: 248, br2: 322, bus: 420,
      lineBr: 454, label: 486, kv: 800, hv: 900,
      box: 872, pstBr1: 944, pstTr: 1014, pstBr2: 1084, lv: 1120, loadLen: 46,
      boxW: 468
    };
    const rowPitch = 122, genPitch = 84, top = 78;
    const rows = branchRows(r).map((b, i) => {
      const y = top + i * rowPitch;
      const off = b.n === 2 ? [-7, 7] : [0];
      const trOff = b.nT === 2 ? [-17, 17] : [0];
      return { ...b, y, off, trOff };
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
    const W = X.box + X.boxW + 24;
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

    // o'ng qism (har qator uchun bir xil): shina → S5 → Q_c/2 → S4 → R, X → S3 → Q_c/2 → S2 → tugun U → ΔS_po'l ↑ → S1 → R_t, X_t → K_T → yuklama
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

    const rowPitch = 132, top = 96;
    const rows = branchRows(r).map((b, i) => ({ ...b, y: top + i * rowPitch }));
    const yFirst = rows[0].y, yLast = rows[rows.length - 1].y;
    // generator qismi shinaning chap tomonida, qatorlar o'rtasida (o'ng qatorlar bilan kesishmaydi)
    const genY = (yFirst + yLast) / 2;
    const W = labelX + 200;
    const H = yLast + 110;
    return {
      W, H, genY, rows,
      bus: { x: busX, y1: yFirst - 58, y2: yLast + 40 },
      L: { gen, genBar, sG, xe, sAfterXe, pul, sAfterPul, rt, xt, sBus },
      R: { s5, cap1, s4, rl, xl, s3, cap2, s2, node, pulN, s1, rtN, xtN, kt, load, labelX, sysX },
      dims: { A, CAP, RW, XL, G }
    };
  }

  root.SchemaLayout = { principalLayout, equivalentLayout, branchRows };
})(typeof self !== 'undefined' ? self : this);
