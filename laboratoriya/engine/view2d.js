// 2D ko‘rinish (SVG): elementlarning shartli belgilari, klemmalar, simlar va tok oqimi animatsiyasi.
import { RANGLAR } from './ranglar.js';
import { t } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class View2D {
  constructor(root, lab) {
    this.root = root;
    this.lab = lab;
    const [x, y, w, h] = lab.sxema.korinish2d || [0, 0, 1000, 520];
    root.innerHTML = `
      <div class="v2d-scroll">
        <svg class="v2d" xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="2D">
          <g class="g-el"></g><g class="g-sim"></g><g class="g-oqim"></g><g class="g-kl"></g>
          <line class="g-preview" x1="0" y1="0" x2="0" y2="0"/>
          <g class="g-fx"></g>
        </svg>
      </div>
      <p class="stage-help" data-i18n="2d.yordam">${esc(t('2d.yordam'))}</p>`;
    this.svg = root.querySelector('svg');
    this.g = {
      el: root.querySelector('.g-el'), sim: root.querySelector('.g-sim'), oqim: root.querySelector('.g-oqim'),
      kl: root.querySelector('.g-kl'), fx: root.querySelector('.g-fx'), preview: root.querySelector('.g-preview'),
    };
    this.oqimlar = [];
    this.svg.addEventListener('click', (e) => this.bosildi(e));
    this.svg.addEventListener('pointermove', (e) => this.harakat(e));
    this.ochir = lab.on((tur, d) => {
      if (tur === 'ozgardi') this.chiz();
      if (tur === 'qisqa') this.uchqun(d.el);
    });
    this.chiz();
    this.faol = true;
    const loop = (ts) => { if (this.faol) this.animatsiya(ts); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  korinsin(v) { this.faol = v; }

  pos(full) {
    const r = this.lab.klemma(full);
    const [ex, ey] = r.el.pozitsiya2d;
    return [ex + r.k.xy[0], ey + r.k.xy[1]];
  }

  yo(full, boshqa) {
    const r = this.lab.klemma(full);
    if (r.k.dir2d) return r.k.dir2d;
    const [x, y] = this.pos(full), [bx, by] = this.pos(boshqa);
    const dx = bx - x, dy = by - y;
    return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
  }

  yol(s) {
    const [ax, ay] = this.pos(s.a), [bx, by] = this.pos(s.b);
    const [adx, ady] = this.yo(s.a, s.b), [bdx, bdy] = this.yo(s.b, s.a);
    const d = Math.hypot(bx - ax, by - ay);
    const L = Math.min(150, Math.max(34, d * 0.42));
    return `M${ax} ${ay} C${ax + adx * L} ${ay + ady * L} ${bx + bdx * L} ${by + bdy * L} ${bx} ${by}`;
  }

  chiz() {
    const lab = this.lab;
    const sim = lab.sim;
    // Elementlar
    this.g.el.innerHTML = lab.els.map((el) => {
      const yonadi = !!sim.yuklamalar[el.id]?.yonadi;
      const body = el.def.svg({ el, holat: lab.holat[el.id] || {}, param: el.param, yonadi });
      const bos = el.def.bosiladi ? ` data-bos="${el.id}" tabindex="0" role="button" aria-label="${esc(el.id)}"` : '';
      return `<g class="el el-${el.tur}${el.def.bosiladi ? ' bosiladi' : ''}" data-el="${el.id}" transform="translate(${el.pozitsiya2d[0]} ${el.pozitsiya2d[1]})"${bos}>${body}</g>`;
    }).join('');
    // Simlar
    this.g.sim.innerHTML = lab.simlar.map((s) => {
      const d = this.yol(s);
      const r = RANGLAR[s.rang];
      const cls = ['sim', lab.tanlanganSim === s.id ? 'tanlangan' : '', lab.belgilangan.simlar.has(s.id) ? 'belgi' : ''].join(' ');
      const ustki = r.hex2 ? `<path class="sim-c sim-pe" d="${d}" stroke="${r.hex2}"/>` : '';
      return `<g class="${cls}" data-sim="${s.id}"><path class="sim-hit" d="${d}"/><path class="sim-halo" d="${d}"/><path class="sim-c" d="${d}" stroke="${r.hex}"/>${ustki}</g>`;
    }).join('');
    // Klemmalar
    const quvvat = lab.quvvatBormi() || sim.qisqa;
    this.g.kl.innerHTML = lab.els.map((el) => el.klemmalar.map((k) => {
      const full = `${el.id}.${k.id}`;
      const [x, y] = this.pos(full);
      const n = lab.simlarSoni(full);
      const cls = ['kl', el.def.passiv ? 'kl-port' : '', n ? 'band' : '', n >= (k.maks || 2) ? 'toliq' : '',
        lab.tanlangan === full ? 'tanlangan' : '', lab.belgilangan.klemmalar.has(full) ? 'belgi' : '',
        quvvat && sim.fazaBor(full) ? 'faza' : ''].join(' ');
      const lbl = el.def.passiv ? '' : `<text class="kl-t" x="${x + 11}" y="${y - 10}">${esc(k.yorliq)}</text>`;
      return `<g class="${cls}" data-k="${full}" role="button" tabindex="0" aria-label="${esc(lab.klemmaNomi(full))}">
        <circle class="kl-hit" cx="${x}" cy="${y}" r="18"/><circle class="kl-c" cx="${x}" cy="${y}" r="${el.def.passiv ? 6.5 : 7.5}"/>${lbl}</g>`;
    }).join('')).join('');
    // Tok oqimi
    this.g.oqim.innerHTML = '';
    this.oqimlar = [];
    for (const o of sim.oqim) {
      const g = this.g.sim.querySelector(`[data-sim="${o.sim}"] .sim-c`);
      if (!g) continue;
      const len = g.getTotalLength();
      const n = Math.max(2, Math.round(len / 55));
      const nuqtalar = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('r', '3.6');
        c.setAttribute('class', 'oqim');
        this.g.oqim.appendChild(c);
        nuqtalar.push(c);
      }
      this.oqimlar.push({ yol: g, len, yonalish: o.yonalish, nuqtalar });
    }
    if (!lab.tanlangan) this.g.preview.classList.remove('on');
  }

  animatsiya(ts) {
    const v = 0.06; // px/ms
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

  svgNuqta(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  harakat(e) {
    const lab = this.lab;
    if (!lab.tanlangan || e.pointerType === 'touch') { this.g.preview.classList.remove('on'); return; }
    const [x, y] = this.pos(lab.tanlangan);
    const p = this.svgNuqta(e);
    const l = this.g.preview;
    l.setAttribute('x1', x); l.setAttribute('y1', y); l.setAttribute('x2', p.x); l.setAttribute('y2', p.y);
    l.setAttribute('stroke', RANGLAR[lab.rang].hex);
    l.classList.add('on');
  }

  bosildi(e) {
    const k = e.target.closest('[data-k]');
    if (k) { this.lab.klemmaBosish(k.dataset.k); return; }
    const s = e.target.closest('[data-sim]');
    if (s) { this.lab.simBosish(s.dataset.sim); return; }
    const b = e.target.closest('[data-bos]');
    if (b) { this.lab.elementBosish(b.dataset.bos); return; }
    this.lab.bosh();
  }

  uchqun(elId) {
    const el = elId ? this.lab.elMap.get(elId) : this.lab.els.find((e) => e.def.manba);
    if (!el) return;
    const [x, y] = el.pozitsiya2d;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'uchqun');
    g.setAttribute('transform', `translate(${x} ${y})`);
    let s = '<circle class="uchqun-c" r="40"/>';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      s += `<line x1="${(10 * Math.cos(a)).toFixed(1)}" y1="${(10 * Math.sin(a)).toFixed(1)}" x2="${(46 * Math.cos(a)).toFixed(1)}" y2="${(46 * Math.sin(a)).toFixed(1)}"/>`;
    }
    g.innerHTML = s;
    this.g.fx.appendChild(g);
    setTimeout(() => g.remove(), 900);
  }

  yoqot() {
    this.ochir();
    cancelAnimationFrame(this.raf);
  }
}
