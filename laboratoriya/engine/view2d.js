// 2D ish maydoni (SVG): qora nuqtali to‘r, qurilmalar old ko‘rinishda, to‘g‘ri burchakli simlar.
// Boshqaruv: g‘ildirak / ikki barmoq — masshtab, bo‘sh joyni surish — siljitish, elementni surish — joyini o‘zgartirish,
// klemmani bosish — sim tortish, simni bosish — tanlash (yana bosish — o‘chirish).
import { RANGLAR } from './ranglar.js';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class View2D {
  constructor(root, lab) {
    this.root = root;
    this.lab = lab;
    root.innerHTML = `
      <svg class="v2d" xmlns="${NS}" role="img" aria-label="2D">
        <defs>
          <pattern id="nuqta-tor" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.1" fill="#2c2e34"/></pattern>
          <pattern id="pe-chiziq" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${RANGLAR.sariq_yashil.hex}"/><rect width="4" height="8" fill="${RANGLAR.sariq_yashil.hex2}"/></pattern>
          <filter id="nur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="14"/></filter>
        </defs>
        <rect class="g-fon" x="-5000" y="-5000" width="10000" height="10000" fill="url(#nuqta-tor)"/>
        <g class="g-el"></g><g class="g-sim"></g><g class="g-oqim"></g><g class="g-kl"></g>
        <path class="g-preview" d=""/>
        <g class="g-fx"></g>
      </svg>`;
    this.svg = root.querySelector('svg');
    this.g = {
      el: root.querySelector('.g-el'), sim: root.querySelector('.g-sim'), oqim: root.querySelector('.g-oqim'),
      kl: root.querySelector('.g-kl'), fx: root.querySelector('.g-fx'), preview: root.querySelector('.g-preview'),
    };
    this.oqimlar = [];
    this.v = { x: 0, y: 0, k: 1 };
    this.korsatkichlar = new Map();
    this.hodisalar();
    this.ochir = lab.on((tur, d) => {
      if (tur === 'ozgardi') this.chiz();
      if (tur === 'qisqa') this.uchqun(d.el);
    });
    this.ro = new ResizeObserver(() => { if (!this.sozlangan) this.sigdir(); else this.korinishniQoy(); });
    this.ro.observe(root);
    this.chiz();
    this.faol = true;
    const loop = (ts) => { if (this.faol) this.animatsiya(ts); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  korinsin(v) { this.faol = v; if (v) requestAnimationFrame(() => this.korinishniQoy()); }

  // ---------- ko‘rinish (masshtab / siljitish) ----------
  olcham() { const r = this.svg.getBoundingClientRect(); return { w: r.width || 1, h: r.height || 1 }; }

  korinishniQoy() {
    const { w, h } = this.olcham();
    this.svg.setAttribute('viewBox', `${this.v.x} ${this.v.y} ${w / this.v.k} ${h / this.v.k}`);
  }

  sigdir() {
    const { w, h } = this.olcham();
    if (w < 10 || h < 10) return;
    const [x, y, bw, bh] = this.chegara();
    const k = Math.min(w / bw, h / bh) * 0.92;
    this.v = { k, x: x + bw / 2 - w / k / 2, y: y + bh / 2 - h / k / 2 };
    this.sozlangan = true;
    this.korinishniQoy();
    this.chiz();
  }

  chegara() {
    const [kx, ky, kw, kh] = this.lab.sxema.korinish2d || [0, 0, 1000, 600];
    let x0 = kx, y0 = ky, x1 = kx + kw, y1 = ky + kh;
    for (const el of this.lab.els) {
      const [x, y] = this.lab.joy(el.id);
      x0 = Math.min(x0, x - 150); y0 = Math.min(y0, y - 150); x1 = Math.max(x1, x + 150); y1 = Math.max(y1, y + 150);
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }

  masshtab(f, cx, cy) {
    const { w, h } = this.olcham();
    if (cx == null) { cx = w / 2; cy = h / 2; }
    const k2 = Math.min(6, Math.max(0.15, this.v.k * f));
    const wx = this.v.x + cx / this.v.k, wy = this.v.y + cy / this.v.k;
    this.v.k = k2;
    this.v.x = wx - cx / k2;
    this.v.y = wy - cy / k2;
    this.korinishniQoy();
    clearTimeout(this._zt);
    this._zt = setTimeout(() => this.chiz(), 80); // bosish radiusi masshtabga moslashadi
  }

  fokus(elId) {
    const [x, y] = this.lab.joy(elId);
    const { w, h } = this.olcham();
    const k = Math.max(this.v.k, Math.min(2.2, Math.min(w, h) / 360));
    this.v = { k, x: x - w / k / 2, y: y - h / k / 2 };
    this.korinishniQoy();
    this.chiz();
  }

  dunyo(e) {
    const r = this.svg.getBoundingClientRect();
    return { x: this.v.x + (e.clientX - r.left) / this.v.k, y: this.v.y + (e.clientY - r.top) / this.v.k };
  }

  // ---------- geometriya ----------
  pos(full) {
    const r = this.lab.klemma(full);
    const [ex, ey] = this.lab.joy(r.el.id);
    return [ex + r.k.xy[0], ey + r.k.xy[1]];
  }

  yo(full, boshqa) {
    const r = this.lab.klemma(full);
    if (r.k.dir2d) return r.k.dir2d;
    const [x, y] = this.pos(full), [bx, by] = this.pos(boshqa);
    const dx = bx - x, dy = by - y;
    return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
  }

  // To‘g‘ri burchakli yo‘l, burchaklari yumaloqlangan
  yol(s, idx) {
    const a = this.pos(s.a), b = this.pos(s.b);
    const da = this.yo(s.a, s.b), db = this.yo(s.b, s.a);
    const L = 26;
    const p1 = [a[0] + da[0] * L, a[1] + da[1] * L], p2 = [b[0] + db[0] * L, b[1] + db[1] * L];
    const off = ((idx % 5) - 2) * 6;
    let pts;
    const gorA = da[0] !== 0, gorB = db[0] !== 0;
    if (gorA && gorB) { const mx = (p1[0] + p2[0]) / 2 + off; pts = [a, p1, [mx, p1[1]], [mx, p2[1]], p2, b]; }
    else if (!gorA && !gorB) { const my = (p1[1] + p2[1]) / 2 + off; pts = [a, p1, [p1[0], my], [p2[0], my], p2, b]; }
    else if (gorA) pts = [a, p1, [p2[0] + off, p1[1]], [p2[0] + off, p2[1]], p2, b];
    else pts = [a, p1, [p1[0] + off, p2[1]], [p2[0], p2[1]], b];
    return this.yumaloqYol(pts);
  }

  yumaloqYol(pts) {
    const p = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.5);
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 1; i < p.length - 1; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i], [cx, cy] = p[i + 1];
      const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
      const r = Math.min(12, l1 / 2, l2 / 2);
      const x1 = bx - ((bx - ax) / l1) * r, y1 = by - ((by - ay) / l1) * r;
      const x2 = bx + ((cx - bx) / l2) * r, y2 = by + ((cy - by) / l2) * r;
      d += ` L${x1.toFixed(1)} ${y1.toFixed(1)} Q${bx.toFixed(1)} ${by.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    const z = p[p.length - 1];
    return d + ` L${z[0].toFixed(1)} ${z[1].toFixed(1)}`;
  }

  // ---------- chizish ----------
  chiz() {
    const lab = this.lab;
    const sim = lab.sim;
    this.g.el.innerHTML = lab.els.map((el) => {
      const yonadi = !!sim.yuklamalar[el.id]?.yonadi;
      const [x, y] = lab.joy(el.id);
      const body = el.def.svg({ el, holat: lab.holat[el.id] || {}, param: el.param, yonadi, natija: sim.natija[el.id] || {} });
      const nur = yonadi ? '<circle class="d-nur" cx="0" cy="12" r="70" filter="url(#nur)"/>' : '';
      return `<g class="el el-${el.tur}${el.def.bosiladi ? ' bosiladi' : ''}" data-el="${el.id}" transform="translate(${x} ${y})">${nur}${body}</g>`;
    }).join('');
    this.g.sim.innerHTML = lab.simlar.map((s, i) => {
      const d = this.yol(s, i);
      const r = RANGLAR[s.rang];
      const cls = ['sim', lab.tanlanganSim === s.id ? 'tanlangan' : '', lab.belgilangan.simlar.has(s.id) ? 'belgi' : ''].join(' ');
      const ustki = r.hex2 ? `<path class="sim-c sim-pe" d="${d}" stroke="${r.hex2}"/>` : '';
      return `<g class="${cls}" data-sim="${s.id}"><path class="sim-hit" d="${d}" style="stroke-width:${Math.max(16, 14 / this.v.k)}px"/><path class="sim-halo" d="${d}"/><path class="sim-c" d="${d}" stroke="${r.hex}"/>${ustki}</g>`;
    }).join('');
    const quvvat = lab.quvvatBormi() || sim.qisqa;
    const hitR = Math.max(15, 16 / this.v.k);
    this.g.kl.innerHTML = lab.els.map((el) => el.klemmalar.map((k) => {
      const full = `${el.id}.${k.id}`;
      const [x, y] = this.pos(full);
      const n = lab.simlarSoni(full);
      const cls = ['kl', el.def.passiv ? 'kl-port' : '', n ? 'band' : '', lab.tanlangan === full ? 'tanlangan' : '',
        lab.belgilangan.klemmalar.has(full) ? 'belgi' : '', quvvat && sim.fazaBor(full) ? 'faza' : ''].join(' ');
      return `<g class="${cls}" data-k="${full}" role="button" tabindex="0" aria-label="${esc(lab.klemmaNomi(full))}">
        <circle class="kl-hit" cx="${x}" cy="${y}" r="${hitR}"/><circle class="kl-c" cx="${x}" cy="${y}" r="${el.def.passiv ? 6 : 7}"/><circle class="kl-v" cx="${x}" cy="${y}" r="2.2"/></g>`;
    }).join('')).join('');
    this.g.oqim.innerHTML = '';
    this.oqimlar = [];
    for (const o of sim.oqim) {
      const p = this.g.sim.querySelector(`[data-sim="${o.sim}"] .sim-c`);
      if (!p) continue;
      const len = p.getTotalLength();
      const n = Math.max(2, Math.round(len / 50));
      const nuqtalar = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('r', '3.4');
        c.setAttribute('class', 'oqim');
        this.g.oqim.appendChild(c);
        nuqtalar.push(c);
      }
      this.oqimlar.push({ yol: p, len, yonalish: o.yonalish, nuqtalar });
    }
    if (!lab.tanlangan) this.g.preview.classList.remove('on');
  }

  animatsiya(ts) {
    const v = 0.07;
    for (const o of this.oqimlar) {
      const n = o.nuqtalar.length;
      o.nuqtalar.forEach((c, i) => {
        let s = ((ts * v) + (i * o.len) / n) % o.len;
        if (o.yonalish < 0) s = o.len - s;
        const p = o.yol.getPointAtLength(s);
        c.setAttribute('cx', p.x.toFixed(1));
        c.setAttribute('cy', p.y.toFixed(1));
      });
    }
  }

  // ---------- hodisalar ----------
  hodisalar() {
    const svg = this.svg;
    const p = this.korsatkichlar;
    let tutish = null; // { tur, id, sx, sy, wx, wy, ox, oy, siljidi }
    let pinch = null;

    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      p.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (p.size === 2) {
        const [a, b] = [...p.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: this.v.k };
        tutish = null;
        return;
      }
      const t = e.target;
      const kl = t.closest('[data-k]');
      let sm = t.closest('[data-sim]');
      // Sim tugma yoki kalit ustidan o‘tsa ham, kursor ostidagi boshqaruv organi ustun turadi
      let am = t.closest('[data-amal]'), el = t.closest('[data-el]');
      if (!kl && !am && sm) {
        const ostida = document.elementsFromPoint(e.clientX, e.clientY).filter((x) => svg.contains(x));
        am = ostida.map((x) => x.closest('[data-amal]')).find(Boolean) || null;
        const bel = ostida.map((x) => x.closest('[data-el]')).find((x) => x && this.lab.elMap.get(x.dataset.el)?.def.bosiladi);
        if (am) el = am.closest('[data-el]');
        else if (bel) el = bel;
        if (am || bel) sm = null;
      }
      const w = this.dunyo(e);
      tutish = { sx: e.clientX, sy: e.clientY, wx: w.x, wy: w.y, siljidi: false };
      if (kl) Object.assign(tutish, { tur: 'kl', id: kl.dataset.k });
      else if (am && el) {
        const e2 = this.lab.elMap.get(el.dataset.el);
        const amal = am.dataset.amal;
        const rejim = e2.def.tugmaRejimi?.(amal, e2.param) || e2.def.tugmalar?.[amal] || 'almash';
        Object.assign(tutish, { tur: 'amal', id: e2.id, amal, rejim });
        if (rejim === 'lahzali') this.lab.elementBosish(e2.id, amal, 'bos');
      }
      else if (sm) Object.assign(tutish, { tur: 'sim', id: sm.dataset.sim });
      else if (el) { const [ox, oy] = this.lab.joy(el.dataset.el); Object.assign(tutish, { tur: 'el', id: el.dataset.el, ox, oy }); }
      else Object.assign(tutish, { tur: 'fon', vx: this.v.x, vy: this.v.y });
    });

    svg.addEventListener('pointermove', (e) => {
      if (p.has(e.pointerId)) p.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && p.size === 2) {
        const [a, b] = [...p.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = svg.getBoundingClientRect();
        this.masshtab((pinch.k * d) / pinch.d / this.v.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        return;
      }
      if (tutish) {
        const dx = e.clientX - tutish.sx, dy = e.clientY - tutish.sy;
        if (!tutish.siljidi && Math.hypot(dx, dy) > 5) tutish.siljidi = true;
        if (tutish.siljidi) {
          if (tutish.tur === 'el') this.lab.elementniSur(tutish.id, tutish.ox + dx / this.v.k, tutish.oy + dy / this.v.k);
          else if (tutish.tur === 'fon') { this.v.x = tutish.vx - dx / this.v.k; this.v.y = tutish.vy - dy / this.v.k; this.korinishniQoy(); }
        }
      }
      this.oldindanKorish(e);
    });

    const tugat = (e) => {
      p.delete(e.pointerId);
      if (p.size < 2) pinch = null;
      if (!tutish) return;
      const t = tutish;
      tutish = null;
      if (t.tur === 'amal') {
        if (t.rejim === 'lahzali') this.lab.elementBosish(t.id, t.amal, 'qoyib_yubor');
        else if (!t.siljidi) this.lab.elementBosish(t.id, t.amal, 'almash');
        return;
      }
      if (t.siljidi) { if (t.tur === 'el') this.lab.qoralamaniSaqla(); return; }
      if (t.tur === 'kl') this.lab.klemmaBosish(t.id);
      else if (t.tur === 'sim') this.lab.simBosish(t.id);
      else if (t.tur === 'el') { if (this.lab.elMap.get(t.id).def.bosiladi) this.lab.elementBosish(t.id); else this.lab.bosh(); }
      else this.lab.bosh();
    };
    svg.addEventListener('pointerup', tugat);
    svg.addEventListener('pointercancel', (e) => {
      p.delete(e.pointerId); pinch = null;
      if (tutish?.tur === 'amal' && tutish.rejim === 'lahzali') this.lab.elementBosish(tutish.id, tutish.amal, 'qoyib_yubor');
      tutish = null;
    });

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      this.masshtab(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    svg.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const kl = e.target.closest?.('[data-k]');
      if (kl) { e.preventDefault(); this.lab.klemmaBosish(kl.dataset.k); }
    });
  }

  oldindanKorish(e) {
    const lab = this.lab;
    if (!lab.tanlangan || e.pointerType === 'touch') { this.g.preview.classList.remove('on'); return; }
    const [x, y] = this.pos(lab.tanlangan);
    const w = this.dunyo(e);
    this.g.preview.setAttribute('d', `M${x} ${y} L${w.x} ${w.y}`);
    this.g.preview.setAttribute('stroke', RANGLAR[lab.rang].hex);
    this.g.preview.classList.add('on');
  }

  uchqun(elId) {
    const el = elId ? this.lab.elMap.get(elId) : this.lab.els.find((e) => e.def.manba);
    if (!el) return;
    const [x, y] = this.lab.joy(el.id);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'uchqun');
    g.setAttribute('transform', `translate(${x} ${y})`);
    let s = '<circle class="uchqun-c" r="46"/>';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += `<line x1="${(12 * Math.cos(a)).toFixed(1)}" y1="${(12 * Math.sin(a)).toFixed(1)}" x2="${(56 * Math.cos(a)).toFixed(1)}" y2="${(56 * Math.sin(a)).toFixed(1)}"/>`;
    }
    g.innerHTML = s;
    this.g.fx.appendChild(g);
    setTimeout(() => g.remove(), 900);
  }

  yoqot() {
    this.ochir();
    this.ro.disconnect();
    cancelAnimationFrame(this.raf);
  }
}
