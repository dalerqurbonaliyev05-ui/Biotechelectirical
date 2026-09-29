/*
 * schema-drawer.js — hisoblash natijalari asosida ikki sxemani chizadi:
 *   1-rasm: radial variantning prinsipial sxemasi
 *   2-rasm: radial variantning ekvivalent almashtiruv sxemasi (Π-liniyalar, Γ-transformatorlar, quvvat oqimlari)
 *
 * build*Svg(r)  → { svg, W, H }  — sof SVG satr (sahifa, SVG yuklab olish va DOCX uchun bir xil)
 * draw*Schema(r, containerId)    — sahifaga joylaydi, zoom/pan (svg-pan-zoom) va tooltiplarni ulaydi
 *
 * Eslatma: loyiha sof statik va index.html ni file:// orqali ham ochish mumkin bo'lishi uchun
 * ES-modul (import/export) o'rniga global window.SchemaDrawer ishlatiladi.
 */
(function (root) {
  'use strict';

  const K = root.SchemaComponents;
  const Lay = root.SchemaLayout;
  const { COL, text, wire, group, cx, f2 } = K;

  const wireName = (l) => (l.n === 2 ? '2×' : '') + l.wire.marka;
  const trName = (t) => (t.n === 2 ? '2×' : '') + t.marka;
  const katName = (k) => ['', 'I', 'II', 'III'][k] + ' kat';
  const sub = (S1, S2) => ({ p: S1.p - S2.p, q: S1.q - S2.q });

  // ================================================================ 1-rasm: prinsipial sxema
  function buildPrincipalSvg(r) {
    const lay = Lay.principalLayout(r);
    const X = lay.X;
    const U = r.U;
    let body = '';

    // YuK shinasi
    body += group(
      `<line x1="${X.bus}" y1="${lay.bus.y1}" x2="${X.bus}" y2="${lay.bus.y2}" stroke="${COL.ink}" stroke-width="5"/>` +
      text(X.bus, lay.bus.y1 - 10, `${r.input.manba} — ${U} kV shina`, { size: 12, anchor: 'middle', weight: 700 }),
      `Stansiyaning ${U} kV YuK shinasi, U_A = ${f2(r.volt[0].Ubus)} kV`
    );

    // generatorlar bloki: G — xususiy ehtiyoj — o'chirgich — ko'taruvchi transformator — o'chirgich — shina
    const cosM = r.input.cosManba;
    lay.gens.forEach((g, i) => {
      const y = g.y;
      let s = wire([[X.gen + 15, y], [X.bus, y]]);
      s += K.sourceSymbol(X.gen, y, 'gen', { r: 15 });
      s += text(X.gen - 16, y - 21, `${f2(g.Pg, 0)} MVt`, { size: 10, italic: true });
      s += wire([[X.xe, y], [X.xe, y + 20]]) + K.breaker(X.xe, y + 20, 10);
      s += K.arrow(X.xe, y + 25, X.xe, y + 46, { width: 1.6, head: 6 });
      s += text(X.xe, y + 58, 'XE', { size: 10, anchor: 'middle', italic: true });
      s += K.breaker(X.br1, y) + K.transformerSymbol(X.tr, y, { label: g.trafo.marka }) + K.breaker(X.br2, y);
      body += group(s, `G${i + 1}: ${f2(g.Pg, 0)} MVt, cosφ = ${cosM}, S_G = ${f2(g.Pg / cosM)} MVA; ko'taruvchi transformator ${g.trafo.marka} (ПБВ ±2×2.5%)`);
    });

    // liniyalar va podstansiyalar
    lay.rows.forEach((row) => {
      const y = row.y, ln = row.ln;
      let s = '';
      const endX = row.pst ? row.hv : X.hv + 8;
      const inner = row.parentY != null;          // ota-p/st shinasidan boshlanuvchi uchastka
      if (!inner) {
        row.off.forEach((o) => {
          s += wire([[X.bus, y + o], [endX, y + o]], { color: COL.line, width: 1.8 });
          s += K.breaker(X.lineBr, y + o, 10);
        });
        s += text(X.label, y - 17, `${row.name}:  ${wireName(ln)}, l=${f2(ln.l, 0)} km`, { size: 11, italic: true });
        s += text(X.kv, y - 17, `${U} kV`, { size: 15, italic: true });
      } else {
        // ota-p/st YuK shinasidan pastga tushib, o'ngga: ikki zanjir bir-birini kesmaydi
        const pairs = row.n === 2 ? [[-5, 7], [5, -7]] : [[0, 0]];
        pairs.forEach(([ox, oy]) => {
          s += wire([[row.startX + ox, row.parentY], [row.startX + ox, y + oy], [endX, y + oy]], { color: COL.line, width: 1.8 });
          s += K.breaker(row.startX + 40, y + oy, 10);
        });
        s += text(row.startX + 60, y - 17, `${row.name}:  ${wireName(ln)}, l=${f2(ln.l, 0)} km`, { size: 11, italic: true });
      }
      body += group(s, `${row.name}: ${wireName(ln)}, l = ${f2(ln.l, 1)} km, R = ${f2(ln.R)} Om, X = ${f2(ln.X)} Om, Q_c = ${f2(ln.Qc)} MVAr` +
        (ln.pst ? `; tranzit ${f2(ln.S)} MVA (${ln.sub.join(', ')})` : ''));

      if (row.pst) {
        const p = row.pst, tr = row.tr, ld = r.loads[p];
        const hv = row.hv, rel = X.rel;
        const P = { box: hv + rel.box, br1: hv + rel.br1, tr: hv + rel.tr, br2: hv + rel.br2, lv: hv + rel.lv };
        let ps = K.substationBox(P.box, y - 52, X.boxW, 104, `P/ST ${p}`, katName(ld.kat));
        const span = Math.max(...row.off.map(Math.abs), ...row.trOff.map(Math.abs)) + 12;
        ps += K.nodeBar(hv, y, { h: span * 2, width: 3 });
        row.trOff.forEach((o) => {
          const yy = y + o;
          ps += wire([[hv, yy], [P.lv, yy]]);
          ps += K.breaker(P.br1, yy, 10) + K.transformerSymbol(P.tr, yy, { rpn: true, r: 9 }) + K.breaker(P.br2, yy, 10);
        });
        ps += K.nodeBar(P.lv, y, { h: span * 2, width: 3 });
        ps += text(P.tr, y + 44, trName(tr), { size: 10, anchor: 'middle', italic: true });
        const comp = r.compensation && r.compensation.perPst.find((c) => c.pst === p && c.Qk > 0.005);
        ps += K.loadArrow(P.lv, y, X.loadLen, `S_${p}=${cx({ p: ld.P, q: ld.Q })} MVA`,
          { sub: `cosφ=${f2(ld.cos)}${comp ? `, BK: ${comp.count}×${r.compensation.unit.Q_MVAr} MVAr` : ''}` });
        body += group(ps, `P/ST ${p} (${katName(ld.kat)}): ${trName(tr)}, S_n = ${tr.Sn} MVA, R_t = ${f2(tr.Rt)} Om, X_t = ${f2(tr.Xt)} Om, ` +
          `ΔP_x = ${tr.dPpul} kVt, ΔQ_x = ${tr.dQpul} kVAr; yuklama ${cx({ p: ld.P, q: ld.Q })} MVA, cosφ = ${f2(ld.cos)}`);
      } else {
        const sx = X.hv + 44;
        let ss = K.arrow(endX, y, sx - 20, y, { width: 1.8, color: COL.line });
        ss += K.sourceSymbol(sx, y, 'system', { r: 18, label: 'Sistema' });
        body += group(ss, `Energotizim: U ≈ ${f2(r.voltHL6.Usys)} kV; maksimal rejimda HL-6 oqimi ${cx(r.station.max.S6)} MVA`);
      }
    });

    const title = 'Radial variantning prinsipial sxemasi';
    return { svg: K.svgDoc(lay.W, lay.H, body, { title }), W: lay.W, H: lay.H };
  }

  // ================================================================ 2-rasm: ekvivalent almashtiruv sxemasi
  function buildEquivalentSvg(r) {
    const lay = Lay.equivalentLayout(r);
    const { L, R } = lay;
    const st = r.station.max;
    const Ubus = r.volt[0].Ubus;
    const busX = lay.bus.x;
    let body = '';
    let k = 0;                       // quvvat oqimlarining tartib raqami
    const nextS = () => `S${++k}`;

    // --- shina
    body += group(
      `<line x1="${busX}" y1="${lay.bus.y1}" x2="${busX}" y2="${lay.bus.y2}" stroke="${COL.ink}" stroke-width="5"/>` +
      K.voltageBox(busX, lay.bus.y1 - 12, `${f2(Ubus)} kV`),
      `Stansiya YuK shinasi: U_A = ${f2(Ubus)} kV (o'zgarmas)`
    );

    // --- podstansiyalar tarmoqlari (har biri: 5 ta oqim, oxiridan boshiga raqamlangan)
    lay.rows.filter((row) => row.pst).forEach((rowRaw) => {
      const row = rowRaw;
      const R = Lay.shiftR(lay.R, row.dx);        // ichki uchastkalar ota-tugundan boshlanadi
      const y = row.y, p = row.pst, ln = row.ln, tr = row.tr;
      const c = r.chains[p], v = r.volt.find((x) => x.pst === p), ld = r.loads[p];
      const n = { S1: nextS(), S2: nextS(), S3: nextS(), S4: nextS(), S5: nextS() };

      // Π-liniya (ichki uchastka: ota-tugundan pastga tushadi)
      let sl = K.powerLabel(R.s5.x1, R.s5.x2, y, n.S5, c.S4);
      sl += row.parentY != null ? wire([[row.start, row.parentY], [row.start, y], [R.cap1.xc, y]]) : wire([[busX, y], [R.cap1.xc, y]]);
      sl += K.lineSymbol(R.cap1.xc, R.cap2.xc, y, R.rl, R.xl, { R: f2(ln.R), X: 'j' + f2(ln.X), qc: '−j' + f2(ln.Qc / 2) });
      sl += K.powerLabel(R.s4.x1, R.s4.x2, y, n.S4, c.S3);
      sl += K.powerLabel(R.s3.x1, R.s3.x2, y, n.S3, c.S2);
      sl += text((R.rl.x1 + R.xl.x2) / 2, y - 42, `${row.name} · ${wireName(ln)} · ${f2(ln.l, 0)} km`, { size: 11, anchor: 'middle', italic: true });
      body += group(sl, `${row.name}: ${wireName(ln)}, R = ${f2(ln.R)} Om, X = ${f2(ln.X)} Om, Q_c = ${f2(ln.Qc)} MVAr (har uchida Q_c/2 = ${f2(ln.Qc / 2)}); ` +
        `ΔS_HL = ${cx({ p: c.dPl, q: c.dQl }, 3)} MVA; tranzit: ${ln.sub.join(', ')}`);

      // tugun (liniya oxiri): Kirxgof 1-qonuni — o'z transformatori + bolalar
      let sn = wire([[R.cap2.xc, y], [R.node.xc, y]]);
      sn += K.powerLabel(R.s2.x1, R.s2.x2, y, n.S2, c.Snode);
      sn += K.nodeBar(R.node.xc, y) + K.voltageBox(R.node.xc - 36, y + 30, `${f2(v.Uend)} kV`);
      body += group(sn, `${row.name} oxiri, p/st ${p} YuK tomoni: U = ${f2(v.Uend)} kV (ΔU_HL = ${f2(v.dUl)} kV; manbadan ${f2(v.dUpath, 1)}%)` +
        (c.children.length ? `; tugundan ${c.children.map((k) => 'p/st ' + k).join(', ')} ham ta'minlanadi` : ''));

      // Γ-transformator
      let st1 = K.transformerGamma(R.node.xc, R.pulN.xc, R.kt.xc, y, R.rtN, R.xtN,
        { pul: cx({ p: c.dPx, q: c.dQx }, 3), R: f2(c.Rt), X: 'j' + f2(c.Xt) });
      st1 += K.powerLabel(R.s1.x1, R.s1.x2, y, n.S1, c.ST);
      st1 += text(R.rtN.xc, y - 42, `P/ST ${p}`, { size: 11, anchor: 'middle', weight: 700 });
      body += group(st1, `P/ST ${p}: ${trName(tr)}; R_t = ${f2(c.Rt)} Om, X_t = ${f2(c.Xt)} Om (${tr.n} ta parallel), ` +
        `ΔS_po'l = ${cx({ p: c.dPx, q: c.dQx }, 3)} MVA, ΔS_t = ${cx({ p: c.dPt, q: c.dQt }, 3)} MVA`);

      // PK tomoni: K_T, kuchlanishlar, yuklama
      const tap = v.tap;
      let sk = K.nodeBar(R.kt.xc, y, { h: 20, width: 2.5 });
      sk += K.voltageBox(R.kt.xc, y - 30, `${f2(tap.Upk)} kV`);
      sk += K.voltageBox(R.kt.xc, y + 30, `${f2(v.Uref)} kV`);
      sk += text(R.kt.xc, y - 44, `K_T=${v.UnPK}/${f2(tap.Uotv)} (${tap.pct > 0 ? '+' : ''}${tap.pct}%)`, { size: 9.5, anchor: 'middle', font: 'mono' });
      const comp = c.Qk > 0.005 ? `, Q_k=−j${f2(c.Qk)}` : '';
      sk += K.loadArrow(R.kt.xc, y, R.load.x2 - R.kt.xc, `S_${p}=${cx({ p: ld.P, q: ld.Q })} MVA`, { sub: `п/ст ${p}, cosφ=${f2(ld.cos)}${comp}` });
      body += group(sk, `P/ST ${p} PK tomoni: U_PK = ${f2(tap.Upk)} kV (RPN ${tap.pct > 0 ? '+' : ''}${tap.pct}%, U_otv = ${f2(tap.Uotv)} kV), ` +
        `U'_PK = ${f2(v.Uref)} kV; yuklama ${cx({ p: ld.P, q: ld.Q })} MVA${c.Qk > 0.005 ? `, kompensatsiya ${f2(c.Qk)} MVAr` : ''}`);
    });

    // --- generator va ko'taruvchi transformatorlar (chapda)
    {
      const y = lay.genY;
      const sv = r.stepUpVolt[0];
      const names = { G: nextS(), xe: nextS(), pul: nextS(), bus: nextS() };
      let s = K.sourceSymbol(L.gen.xc, y, 'gen', { r: 22 });
      s += wire([[L.gen.x2, y], [L.genBar.xc, y]]);
      s += K.nodeBar(L.genBar.xc, y, { h: 22 }) + K.voltageBox(L.genBar.xc, y - 32, `${f2(sv.tap.Ug)} kV`);
      s += text(L.genBar.xc - 8, y + 26, `K_T=${sv.UnG}/${f2(sv.tap.Uotv)} (${sv.tap.pct > 0 ? '+' : ''}${sv.tap.pct}%)`, { size: 9.5, font: 'mono' });
      s += wire([[L.genBar.xc, y], [L.pul.xc, y]]);
      s += K.powerLabel(L.sG.x1, L.sG.x2, y, names.G, st.SG);
      s += K.branchArrow(L.xe.xc, y, 30, 'up', `S_XE=${cx(st.Sxus)}`);
      s += K.powerLabel(L.sAfterXe.x1, L.sAfterXe.x2, y, names.xe, st.afterXus);
      s += text(L.gen.xc, y + 40, `${r.stepUps.map((u) => u.count + '×' + f2(u.Pg, 0)).join('+')} MVt`, { size: 10, anchor: 'middle' });
      body += group(s, `Generatorlar: ΣP = ${f2(st.Pg)} MVt, Q = ${f2(st.Qg)} MVAr (cosφ = ${f2(st.cosGen, 3)}); ` +
        `xususiy ehtiyoj ${cx(st.Sxus)} MVA; U_G = ${f2(sv.tap.Ug)} kV`);

      let t = K.transformerGamma(L.pul.xc, L.pul.xc, busX, y, L.rt, L.xt,
        { pul: cx(st.pulUp, 3), pulDir: 'down', R: f2(st.RtUp), X: 'j' + f2(st.XtUp) });
      t += K.powerLabel(L.sAfterPul.x1, L.sAfterPul.x2, y, names.pul, st.afterPul);
      t += K.powerLabel(L.sBus.x1, L.sBus.x2, y, names.bus, st.toBus);
      t += text((L.rt.x1 + L.xt.x2) / 2, y - 42, r.stepUps.map((u) => u.count + '×' + u.trafo.marka).join(' + '), { size: 10, anchor: 'middle', italic: true });
      body += group(t, `Ko'taruvchi transformatorlar (parallel ekvivalent): R_t = ${f2(st.RtUp, 3)} Om, X_t = ${f2(st.XtUp)} Om; ` +
        `ΔS_po'l = ${cx(st.pulUp, 3)} MVA, ΔS_cho'lg'am = ${cx(st.windUp, 3)} MVA`);
    }

    // --- sistema bilan bog'lovchi liniya (HL-6)
    {
      const row = lay.rows.find((x) => !x.pst);
      const y = row.y, ln = row.ln;
      const rev = st.S6.p < 0;
      const afterZ = sub(st.Sp, { p: st.dP6, q: st.dQ6 });
      const nm = { a: nextS(), b: nextS(), c: nextS(), d: nextS() };
      let s = wire([[busX, y], [R.cap1.xc, y]]);
      s += K.powerLabel(R.s5.x1, R.s5.x2, y, nm.a, st.S6, { reverse: rev });
      s += K.lineSymbol(R.cap1.xc, R.cap2.xc, y, R.rl, R.xl, { R: f2(ln.R), X: 'j' + f2(ln.X), qc: '−j' + f2(ln.Qc / 2) });
      s += K.powerLabel(R.s4.x1, R.s4.x2, y, nm.b, st.Sp, { reverse: rev });
      s += K.powerLabel(R.s3.x1, R.s3.x2, y, nm.c, afterZ, { reverse: rev });
      s += wire([[R.cap2.xc, y], [R.sysX - 20, y]]);
      s += K.powerLabel(R.s2.x1, R.s2.x2, y, nm.d, st.Ssys, { reverse: rev });
      s += K.sourceSymbol(R.sysX, y, 'system', { r: 18, label: 'Sistema' });
      s += K.voltageBox(R.sysX, y - 34, `${f2(r.voltHL6.Usys)} kV`);
      s += text((R.rl.x1 + R.xl.x2) / 2, y - 42, `${row.name} · ${wireName(ln)} · ${f2(ln.l, 0)} km`, { size: 11, anchor: 'middle', italic: true });
      body += group(s, `${row.name} (sistema bilan bog'lovchi): ${wireName(ln)}, R = ${f2(ln.R)} Om, X = ${f2(ln.X)} Om, Q_c = ${f2(ln.Qc)} MVAr; ` +
        `ΔS = ${cx({ p: st.dP6, q: st.dQ6 }, 3)} MVA; cosφ = ${f2(st.cos6, 3)}; ${rev ? 'sistemadan olinadi' : 'sistemaga uzatiladi'}`);
    }

    // izoh
    body += text(20, lay.H - 14, "S — MVA, R va X — Om, Q_c/2 — MVAr (ko'k); ΔS_po'l — transformator po'lat isrofi; maksimal rejim", { size: 10, color: COL.muted });

    const title = 'Radial variantning ekvivalent almashtiruv sxemasi';
    return { svg: K.svgDoc(lay.W, lay.H, body, { title }), W: lay.W, H: lay.H };
  }

  // ================================================================ kichik topologiya chizmasi
  /** Variant (parent xaritasi va uchastkalar) uchun ixcham daraxt: M → p/st lar; ikki zanjir — qo'sh chiziq */
  function buildTopologyMini(v, manbaName) {
    const C = root.KursCalc;
    const lay = Lay.miniLayout(v.parent, C.PST, root.KursTopology.ORDER);
    const pos = lay.pos;
    const edgeOf = (to) => (v.edges || []).find((e) => e.to === to) || { n: 1, l: null };
    let s = '';
    C.PST.forEach((p) => {
      const par = v.parent[p], a = pos[par], b = pos[p], e = edgeOf(p);
      const xm = b.x - lay.DX / 2;
      const offs = e.n === 2 ? [-2, 2] : [0];
      offs.forEach((o) => {
        s += `<polyline points="${a.x + 10},${a.y + o} ${xm + o},${a.y + o} ${xm + o},${b.y + o} ${b.x - 10},${b.y + o}" fill="none" stroke="${COL.line}" stroke-width="1.5"/>`;
      });
      if (e.l != null) s += text((xm + b.x) / 2 - 2, b.y - 5, `${f2(e.l, 0)}`, { size: 9, anchor: 'middle', font: 'mono', color: COL.muted });
    });
    s += `<rect x="${pos.M.x - 11}" y="${pos.M.y - 11}" width="22" height="22" rx="3" fill="#fff4d6" stroke="${COL.ink}" stroke-width="1.3"/>` +
      text(pos.M.x, pos.M.y + 4, 'M', { size: 11, anchor: 'middle', weight: 700 });
    C.PST.forEach((p) => {
      s += `<circle cx="${pos[p].x}" cy="${pos[p].y}" r="10" fill="#e8f1fc" stroke="${COL.ink}" stroke-width="1.3"/>` +
        text(pos[p].x, pos[p].y + 4, p, { size: 11, anchor: 'middle', weight: 700 });
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lay.W} ${lay.H}" role="img" aria-label="Topologiya: ${K.esc(manbaName || 'M')} manbadan">${s}</svg>`;
  }

  // ================================================================ sahifaga joylash
  function attachTooltip(host) {
    let tip = host.querySelector('.schema-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'schema-tip';
      tip.setAttribute('role', 'tooltip');
      host.appendChild(tip);
    }
    let active = null;
    const show = (el, e) => {
      if (active) active.classList.remove('is-hover');
      active = el;
      el.classList.add('is-hover');
      tip.textContent = el.getAttribute('data-tip');
      tip.style.display = 'block';
      const rect = host.getBoundingClientRect();
      let x = e.clientX - rect.left + 14, y = e.clientY - rect.top + 14;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      if (x + tw > rect.width - 4) x = Math.max(4, e.clientX - rect.left - tw - 14);
      if (y + th > rect.height - 4) y = Math.max(4, e.clientY - rect.top - th - 14);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    };
    const hide = () => {
      if (active) active.classList.remove('is-hover');
      active = null;
      tip.style.display = 'none';
    };
    host.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el && host.contains(el)) show(el, e); else hide();
    });
    host.addEventListener('mouseleave', hide);
    // sensorli ekran: bosilganda ko'rsatish
    host.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el && host.contains(el)) show(el, e); else hide();
    });
  }

  const mounted = {};

  function mount(containerId, built) {
    const host = document.getElementById(containerId);
    if (!host) throw new Error('Konteyner topilmadi: ' + containerId);
    if (mounted[containerId] && mounted[containerId].panZoom) {
      try { mounted[containerId].panZoom.destroy(); } catch (e) { /* e'tiborsiz */ }
    }
    host.innerHTML = built.svg;
    const svg = host.querySelector('svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.display = 'block';
    let panZoom = null;
    if (root.svgPanZoom) {
      panZoom = root.svgPanZoom(svg, {
        zoomEnabled: true, panEnabled: true, controlIconsEnabled: false,
        dblClickZoomEnabled: true, mouseWheelZoomEnabled: true,
        fit: true, center: true, minZoom: 0.7, maxZoom: 30, zoomScaleSensitivity: 0.25
      });
    }
    attachTooltip(host);
    mounted[containerId] = { built, panZoom, host };
    return mounted[containerId];
  }

  function drawPrincipalSchema(results, containerId) { return mount(containerId, buildPrincipalSvg(results)); }
  function drawEquivalentSchema(results, containerId) { return mount(containerId, buildEquivalentSvg(results)); }

  /** Oyna o'lchami o'zgarganda sxemalarni qayta moslashtirish */
  function refit() {
    Object.values(mounted).forEach((m) => {
      if (m.panZoom) { try { m.panZoom.resize(); m.panZoom.fit(); m.panZoom.center(); } catch (e) { /* e'tiborsiz */ } }
    });
  }

  root.SchemaDrawer = {
    buildPrincipalSvg, buildEquivalentSvg, buildTopologyMini,
    drawPrincipalSchema, drawEquivalentSchema,
    get: (id) => mounted[id], refit
  };
})(typeof self !== 'undefined' ? self : this);
