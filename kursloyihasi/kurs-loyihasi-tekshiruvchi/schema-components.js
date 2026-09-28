/*
 * schema-components.js — elektr sxemalari uchun SVG asosiy elementlari.
 * Har bir funksiya SVG satrini qaytaradi (DOM ga bog'liq emas), shuning uchun
 * bir xil kod sahifada ko'rsatish, SVG yuklab olish va DOCX uchun PNG ga aylantirishda ishlatiladi.
 * Ranglar to'g'ridan-to'g'ri yozilgan: SVG alohida fayl/rasm bo'lganda ham bir xil ko'rinadi.
 */
(function (root) {
  'use strict';

  const FONT_MONO = "Consolas, 'JetBrains Mono', 'DejaVu Sans Mono', 'Courier New', monospace";
  const FONT_SANS = "Arial, 'Helvetica Neue', 'DejaVu Sans', sans-serif";
  const COL = {
    ink: '#111111',      // asosiy chiziqlar va yozuvlar
    muted: '#555555',    // ikkinchi darajali yozuvlar
    line: '#1a7f37',     // havo liniyasi simlari
    charge: '#1f5fbf',   // zaryad quvvati Q_c/2
    loss: '#8a1c1c',     // isroflar (ΔS_po'l, xususiy ehtiyoj)
    bg: '#ffffff'
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const f2 = (x, d = 2) => {
    const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x;
    return v.toFixed(d);
  };
  /** Kompleks quvvat: "50.23+j37.50" */
  const cx = (S, d = 2) => `${f2(S.p, d)}${S.q < 0 ? '−' : '+'}j${f2(Math.abs(S.q), d)}`;

  /** Element guruhi — hover tooltip uchun data-tip */
  function group(content, tipText, cls) {
    const t = tipText ? ` data-tip="${esc(tipText)}"` : '';
    return `<g class="sch-el${cls ? ' ' + cls : ''}"${t}>${content}</g>`;
  }

  /** Matn. o: { size, anchor, font: 'mono'|'sans', weight, color, rotate, italic, baseline } */
  function text(x, y, s, o = {}) {
    const font = o.font === 'mono' ? FONT_MONO : FONT_SANS;
    const rot = o.rotate ? ` transform="rotate(${o.rotate} ${x} ${y})"` : '';
    const style = o.italic ? ' font-style="italic"' : '';
    const bl = o.baseline ? ` dominant-baseline="${o.baseline}"` : '';
    return `<text xml:space="preserve" x="${x}" y="${y}" font-family="${font}" font-size="${o.size || 11}" text-anchor="${o.anchor || 'start'}"` +
      ` font-weight="${o.weight || 400}" fill="${o.color || COL.ink}"${style}${bl}${rot}>${esc(s)}</text>`;
  }

  /** Sim (siniq chiziq). points: [[x,y], ...] */
  function wire(points, o = {}) {
    return `<polyline points="${points.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${o.color || COL.ink}"` +
      ` stroke-width="${o.width || 1.6}" stroke-linejoin="miter" stroke-linecap="square"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
  }

  /** Strelka (x1,y1) → (x2,y2) */
  function arrow(x1, y1, x2, y2, o = {}) {
    const w = o.width || 2.2, head = o.head || 8, color = o.color || COL.ink;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - head * Math.cos(ang), by = y2 - head * Math.sin(ang);
    const px = Math.sin(ang) * head * 0.45, py = -Math.cos(ang) * head * 0.45;
    return `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${w}"/>` +
      `<polygon points="${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}" fill="${color}"/>`;
  }

  /** O'chirgich (kvadrat) */
  function breaker(x, y, size = 12) {
    return `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${COL.bg}" stroke="${COL.ink}" stroke-width="1.4"/>`;
  }

  /** Tuproq belgisi (gorizontal chiziq va qiya shtrixlar) */
  function groundSymbol(x, y, o = {}) {
    const w = o.w || 22;
    let s = `<line x1="${x - w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y}" stroke="${COL.ink}" stroke-width="1.6"/>`;
    for (let i = 0; i < 4; i++) {
      const hx = x - w / 2 + 3 + i * (w - 6) / 3;
      s += `<line x1="${hx}" y1="${y}" x2="${hx - 5}" y2="${y + 6}" stroke="${COL.ink}" stroke-width="1.2"/>`;
    }
    return s;
  }

  /** Aktiv qarshilik R — to'g'ri to'rtburchak, markazi (x,y) */
  function resistor(x, y, o = {}) {
    const w = o.vertical ? (o.h || 12) : (o.w || 36), h = o.vertical ? (o.w || 36) : (o.h || 12);
    let s = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${COL.bg}" stroke="${o.color || COL.ink}" stroke-width="1.6"/>`;
    if (o.label != null) {
      s += o.vertical
        ? text(x + w / 2 + 4, y + 4, o.label, { font: 'mono', size: o.size || 10 })
        : text(x, y - h / 2 - 4, o.label, { font: 'mono', size: o.size || 10, anchor: 'middle' });
    }
    return s;
  }

  /** Induktiv qarshilik X — g'altak (4 yoy), markazi (x,y) */
  function inductor(x, y, o = {}) {
    const len = o.len || 44, n = 4, r = len / (2 * n);
    const color = o.color || COL.ink;
    let d;
    if (o.vertical) {
      d = `M ${x} ${y - len / 2}`;
      for (let i = 0; i < n; i++) d += ` a ${r} ${r} 0 0 1 0 ${2 * r}`;
    } else {
      d = `M ${x - len / 2} ${y}`;
      for (let i = 0; i < n; i++) d += ` a ${r} ${r} 0 0 1 ${2 * r} 0`;
    }
    let s = `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
    if (o.label != null) {
      s += o.vertical
        ? text(x + r + 5, y + 4, o.label, { font: 'mono', size: o.size || 10 })
        : text(x, y - r - 5, o.label, { font: 'mono', size: o.size || 10, anchor: 'middle' });
    }
    return s;
  }

  /** Zaryad quvvati Q_c/2: tugundan pastga kondensator va tuproq; yozuv ko'k rangda */
  function capacitorToGround(x, y, o = {}) {
    const drop = o.drop || 14, gap = 5, pw = 20, tail = 12;
    const y1 = y + drop, y2 = y1 + gap, yg = y2 + tail;
    let s = `<line x1="${x}" y1="${y}" x2="${x}" y2="${y1}" stroke="${COL.ink}" stroke-width="1.6"/>`;
    s += `<line x1="${x - pw / 2}" y1="${y1}" x2="${x + pw / 2}" y2="${y1}" stroke="${COL.charge}" stroke-width="2.4"/>`;
    s += `<line x1="${x - pw / 2}" y1="${y2}" x2="${x + pw / 2}" y2="${y2}" stroke="${COL.charge}" stroke-width="2.4"/>`;
    s += `<line x1="${x}" y1="${y2}" x2="${x}" y2="${yg}" stroke="${COL.ink}" stroke-width="1.6"/>`;
    s += groundSymbol(x, yg);
    if (o.label) s += text(x + pw / 2 + 3, y1 + 6, o.label, { font: 'mono', size: o.size || 10, color: COL.charge });
    return s;
  }

  /** Tugun (qalin qisqa shina), markazi (x,y) */
  function nodeBar(x, y, o = {}) {
    const h = o.h || 26;
    return `<line x1="${x}" y1="${y - h / 2}" x2="${x}" y2="${y + h / 2}" stroke="${COL.ink}" stroke-width="${o.width || 4}"/>`;
  }

  /** Kuchlanish katakchasi: "239.6 kV" */
  function voltageBox(x, y, label, o = {}) {
    const w = o.w || Math.max(46, label.length * 6.2 + 10), h = 15;
    return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${COL.bg}" stroke="${COL.ink}" stroke-width="1.3"/>` +
      text(x, y + 3.6, label, { font: 'mono', size: o.size || 10, anchor: 'middle' });
  }

  /**
   * Quvvat oqimi: sim ustida strelka va "S5=107.13+j41.12" yozuvi.
   * reverse — oqim chapga (masalan sistemadan olinganda): strelka teskari, qiymat strelka yo'nalishi bo'yicha.
   */
  function powerLabel(x1, x2, y, name, S, o = {}) {
    const ay = y - 8;
    const a = o.reverse ? arrow(x2 - 3, ay, x1 + 3, ay, { width: 2 }) : arrow(x1 + 3, ay, x2 - 3, ay, { width: 2 });
    const lbl = `${name}=${cx(o.reverse ? { p: -S.p, q: -S.q } : S)}`;
    return a + text((x1 + x2) / 2, ay - 5, lbl, { font: 'mono', size: o.size || 9.5, anchor: 'middle' });
  }

  /** Vertikal quvvat strelkasi (ΔS_po'l, xususiy ehtiyoj): tugundan tepaga yoki pastga */
  function branchArrow(x, y, len, dir, label, o = {}) {
    const y2 = dir === 'up' ? y - len : y + len;
    const color = o.color || COL.loss;
    let s = arrow(x, y, x, y2, { width: 2, color });
    const ty = dir === 'up' ? y2 - 4 : y2 + 12;
    if (label) s += text(x + 4, ty, label, { font: 'mono', size: o.size || 9.5, color, anchor: o.anchor || 'start' });
    return s;
  }

  /** Manba: generator (doira ichida ~) yoki sistema (doira ichida nuqta) */
  function sourceSymbol(x, y, type, o = {}) {
    const r = o.r || 20;
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${COL.bg}" stroke="${COL.ink}" stroke-width="${o.width || 2}"/>`;
    if (type === 'system') {
      s += `<circle cx="${x}" cy="${y}" r="${r * 0.18}" fill="${COL.ink}"/>`;
    } else {
      const w = r * 0.62;
      s += `<path d="M ${x - w} ${y} q ${w / 2} ${-r * 0.55} ${w} 0 t ${w} 0" fill="none" stroke="${COL.ink}" stroke-width="${o.width || 2}"/>`;
    }
    if (o.label) s += text(x, y + r + 14, o.label, { size: o.size || 11, anchor: 'middle', weight: 600 });
    return s;
  }

  /** Transformator (prinsipial sxema): ikki kesishgan doira, RPN bo'lsa qiya strelka */
  function transformerSymbol(x, y, o = {}) {
    const r = o.r || 10, d = r * 0.7;
    let s = `<circle cx="${x - d}" cy="${y}" r="${r}" fill="none" stroke="${COL.ink}" stroke-width="1.6"/>` +
      `<circle cx="${x + d}" cy="${y}" r="${r}" fill="none" stroke="${COL.ink}" stroke-width="1.6"/>`;
    if (o.rpn) s += arrow(x - d - r, y + r, x + d + r * 0.6, y - r - 2, { width: 1.2, head: 5 });
    if (o.label) s += text(x, y - r - 5, o.label, { size: o.size || 10, anchor: 'middle', italic: true });
    return s;
  }

  /** Ketma-ket R va X: sim faqat elementlar orasida (element ostidan o'tmaydi). rs/xs — {x1, xc, x2} */
  function seriesRX(xFrom, xTo, y, rs, xs, o = {}) {
    return wire([[xFrom, y], [rs.x1, y]]) + wire([[rs.x2, y], [xs.x1, y]]) + wire([[xs.x2, y], [xTo, y]]) +
      resistor(rs.xc, y, { w: rs.x2 - rs.x1, label: o.R, color: o.color }) +
      inductor(xs.xc, y, { len: xs.x2 - xs.x1, label: o.X, color: o.color });
  }

  /**
   * Γ-simon transformator (ekvivalent sxema): tugunda po'lat isrofi ΔS_po'l strelkasi (manba tomonida),
   * so'ng ketma-ket R_t va X_t. xNode — tugun, xPul — strelka joyi, rs/xs — R_t va X_t joylari.
   */
  function transformerGamma(xNode, xPul, xEnd, y, rs, xs, o = {}) {
    let s = wire([[xNode, y], [xPul, y]]);
    if (o.pul) s += branchArrow(xPul, y, o.pulLen || 30, o.pulDir || 'up', o.pul);
    s += seriesRX(xPul, xEnd, y, rs, xs, { R: o.R, X: o.X });
    return s;
  }

  /**
   * Π-simon liniya (ekvivalent sxema): ikki uchida Q_c/2 (tuproqqa), o'rtada ketma-ket R va X.
   * xc1, xc2 — sig'imlar joyi; rs/xs — R va X joylari.
   */
  function lineSymbol(xc1, xc2, y, rs, xs, o = {}) {
    let s = seriesRX(xc1, xc2, y, rs, xs, { R: o.R, X: o.X, color: COL.line });
    s += capacitorToGround(xc1, y, { label: o.qc });
    s += capacitorToGround(xc2, y, { label: o.qc });
    return s;
  }

  /** Podstansiya ramkasi: nomi va kategoriyasi bilan */
  function substationBox(x, y, w, h, name, cat) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="${COL.muted}" stroke-width="1.2" stroke-dasharray="6 4"/>` +
      text(x + 10, y + 16, name, { size: 12, weight: 700 }) +
      (cat ? text(x + w - 10, y + 16, cat, { size: 11, anchor: 'end', italic: true }) : '');
  }

  /** Yuklama strelkasi: o'ngga yoki pastga, yonida P+jQ */
  function loadArrow(x, y, len, label, o = {}) {
    const down = o.dir === 'down';
    let s = down ? arrow(x, y, x, y + len, { width: 2 }) : arrow(x, y, x + len, y, { width: 2 });
    if (label) {
      s += down
        ? text(x + 6, y + len + 4, label, { font: 'mono', size: o.size || 10 })
        : text(x + len + 5, y + 4, label, { font: 'mono', size: o.size || 10 });
    }
    if (o.sub) s += down ? text(x + 6, y + len + 17, o.sub, { size: 10, color: COL.muted }) : text(x + len + 5, y + 17, o.sub, { size: 10, color: COL.muted });
    return s;
  }

  /** SVG hujjat qobig'i */
  function svgDoc(w, h, body, o = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"` +
      ` role="img" aria-label="${esc(o.title || 'Sxema')}">` +
      `<title>${esc(o.title || 'Sxema')}</title>` +
      `<rect x="0" y="0" width="${w}" height="${h}" fill="${COL.bg}"/>` +
      `<g class="sch-root">${body}</g></svg>`;
  }

  root.SchemaComponents = {
    COL, FONT_MONO, FONT_SANS, esc, f2, cx,
    group, text, wire, arrow, breaker, groundSymbol, resistor, inductor, capacitorToGround,
    nodeBar, voltageBox, powerLabel, branchArrow, sourceSymbol, transformerSymbol,
    seriesRX, transformerGamma, lineSymbol, substationBox, loadArrow, svgDoc
  };
})(typeof self !== 'undefined' ? self : this);
