// Umumiy holat: simlar, elementlar holati, tanlov, ball. 2D va 3D ko‘rinishlar shu BITTA holatni ishlatadi.
import { tayyorla, boshlangichHolat, simulyatsiya, klemmaTop } from './simulator.js';
import { tekshir, togriSimlar } from './checker.js';
import { t, tx } from './i18n.js';
import { RANGLAR } from './ranglar.js';

const NATIJA_KEY = 'energyvibe-lab-natijalar';
const QORALAMA_KEY = (id) => `energyvibe-lab-qoralama-${id}`;

export const JARIMA = { maslahat: 10, javob: 50, xato: 5 };

export function natijalarniOl() {
  try { return JSON.parse(localStorage.getItem(NATIJA_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function natijaniSaqla(id, n) {
  try {
    const hammasi = natijalarniOl();
    const old = hammasi[id];
    hammasi[id] = { ...n, bajarildi: true, eng: Math.max(n.ball, old?.eng ?? 0), urinish: (old?.urinish || 0) + 1 };
    localStorage.setItem(NATIJA_KEY, JSON.stringify(hammasi));
  } catch (e) { /* xotira yopiq — natija faqat shu sahifada ko‘rinadi */ }
}

export class Lab {
  constructor(sxema) {
    this.sxema = sxema;
    this.els = tayyorla(sxema);
    this.elMap = new Map(this.els.map((e) => [e.id, e]));
    this.rang = 'jigarrang';
    this.kuzatuvchilar = new Set();
    this.yangidan();
    this.qoralamaniOl();
  }

  // ---------- kuzatuv ----------
  on(f) { this.kuzatuvchilar.add(f); return () => this.kuzatuvchilar.delete(f); }
  emit(tur, data = {}) { for (const f of this.kuzatuvchilar) f(tur, data); }

  yangidan() {
    this.simlar = [];
    this.holat = boshlangichHolat(this.els);
    this.tanlangan = null;
    this.tanlanganSim = null;
    this.belgilangan = { simlar: new Set(), klemmalar: new Set() };
    this.ball = { maslahat: 0, javob: false, xato: 0, boshlanish: Date.now(), tugadi: null };
    this.simN = 0;
    this.hisobla(false);
  }

  // ---------- yordamchilar ----------
  klemma(full) { return klemmaTop(this.els, full); }

  klemmaNomi(full) {
    const r = this.klemma(full);
    if (!r) return full;
    if (r.el.def.passiv) return `${r.el.id}:${r.k.yorliq}`;
    return `${r.el.id} ${tx(r.k.nomi)}`;
  }

  simNomi(id) {
    const s = this.simlar.find((x) => x.id === id);
    if (!s) return id;
    return `${this.klemmaNomi(s.a)} — ${this.klemmaNomi(s.b)} (${tx(RANGLAR[s.rang]?.nomi).toLowerCase()})`;
  }

  simlarSoni(full) { return this.simlar.filter((s) => s.a === full || s.b === full).length; }

  quvvatBormi() { return this.els.some((e) => e.def.himoya && this.holat[e.id]?.yoqilgan); }

  ballHisob() {
    const b = this.ball;
    if (b.yakuniy != null) return b.yakuniy;
    return Math.max(0, 100 - JARIMA.maslahat * b.maslahat - (b.javob ? JARIMA.javob : 0) - JARIMA.xato * b.xato);
  }

  vaqt() { return Math.round(((this.ball.tugadi || Date.now()) - this.ball.boshlanish) / 1000); }

  // ---------- simulyatsiya ----------
  hisobla(xabar = true) {
    const oldin = this.sim;
    this._ochdi = false;
    let sim = simulyatsiya(this.els, this.simlar, this.holat);
    if (sim.qisqa && sim.ochirilsin.length) {
      // Avtomat qisqa tutashuvni sezib o‘chib ketadi.
      for (const id of sim.ochirilsin) this.holat[id] = { ...this.holat[id], yoqilgan: false };
      const joy = sim.ochirilsin[0];
      sim = simulyatsiya(this.els, this.simlar, this.holat);
      this.sim = sim;
      this._ochdi = true;
      if (xabar) this.emit('qisqa', { el: joy, tur: 'ochdi' });
      if (xabar) this.emit('xabar', { matn: t('h.qisqa', { q: joy }), daraja: 'xato' });
    } else {
      this.sim = sim;
      if (sim.qisqa && sim.chetlab && xabar) {
        this.emit('qisqa', { el: null, tur: 'chetlab' });
        this.emit('xabar', { matn: t('h.qisqa_chetlab'), daraja: 'xato' });
      }
    }
    if (xabar && oldin && !oldin.qisqa && !(sim.qisqa || this.sim.qisqa) && !this._ochdi) {
      for (const [id, y] of Object.entries(this.sim.yuklamalar)) {
        const old = oldin.yuklamalar[id]?.yonadi;
        if (y.yonadi && !old) this.emit('xabar', { matn: t('h.yondi'), daraja: 'ok' });
        if (!y.yonadi && old && !this.sim.qisqa) this.emit('xabar', { matn: t('h.ochdi'), daraja: 'info' });
      }
    }
  }

  ozgardi(sabab) {
    this.hisobla();
    this.qoralamaniSaqla();
    this.emit('ozgardi', { sabab });
  }

  // ---------- foydalanuvchi amallari ----------
  setRang(r) { this.rang = r; this.emit('ozgardi', { sabab: 'rang' }); }

  klemmaBosish(full) {
    this.tanlanganSim = null;
    if (!this.klemma(full)) return;
    if (!this.tanlangan) {
      const r = this.klemma(full);
      if (this.simlarSoni(full) >= (r.k.maks || 2)) {
        this.emit('xabar', { matn: t('h.band', { k: this.klemmaNomi(full) }), daraja: 'ogoh' });
        this.emit('ozgardi', { sabab: 'tanlov' });
        return;
      }
      this.tanlangan = full;
      this.emit('xabar', { matn: t('h.tanlandi', { k: this.klemmaNomi(full) }), daraja: 'info' });
      this.emit('ozgardi', { sabab: 'tanlov' });
      return;
    }
    const a = this.tanlangan;
    this.tanlangan = null;
    if (a === full) { this.emit('xabar', { matn: t('h.boshla'), daraja: 'info' }); this.emit('ozgardi', { sabab: 'tanlov' }); return; }
    this.simQosh(a, full, this.rang);
  }

  simQosh(a, b, rang) {
    const ra = this.klemma(a), rb = this.klemma(b);
    if (!ra || !rb) return 'yoq';
    if (a === b) { this.emit('xabar', { matn: t('h.ozi'), daraja: 'ogoh' }); this.emit('ozgardi', { sabab: 'tanlov' }); return 'ozi'; }
    if (this.simlar.some((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a))) {
      this.emit('xabar', { matn: t('h.takror'), daraja: 'ogoh' }); this.emit('ozgardi', { sabab: 'tanlov' }); return 'takror';
    }
    for (const [f, r] of [[a, ra], [b, rb]]) {
      if (this.simlarSoni(f) >= (r.k.maks || 2)) {
        this.emit('xabar', { matn: t('h.band', { k: this.klemmaNomi(f) }), daraja: 'ogoh' }); this.emit('ozgardi', { sabab: 'tanlov' }); return 'band';
      }
    }
    const s = { id: `s${++this.simN}`, a, b, rang };
    this.simlar.push(s);
    this.belgilangan = { simlar: new Set(), klemmalar: new Set() };
    this.emit('xabar', { matn: t('h.ulandi', { a: this.klemmaNomi(a), b: this.klemmaNomi(b) }), daraja: 'info' });
    this.ozgardi('sim');
    return 'ok';
  }

  simBosish(id) {
    this.tanlangan = null;
    if (this.tanlanganSim === id) { this.simOchir(id); return; }
    const s = this.simlar.find((x) => x.id === id);
    if (!s) return;
    this.tanlanganSim = id;
    this.emit('xabar', { matn: t('h.sim_tanlandi', { a: this.klemmaNomi(s.a), b: this.klemmaNomi(s.b) }), daraja: 'info' });
    this.emit('ozgardi', { sabab: 'tanlov' });
  }

  simOchir(id) {
    this.simlar = this.simlar.filter((s) => s.id !== id);
    this.tanlanganSim = null;
    this.belgilangan.simlar.delete(id);
    this.emit('xabar', { matn: t('h.ochirildi'), daraja: 'info' });
    this.ozgardi('sim');
  }

  bosh() {
    if (!this.tanlangan && !this.tanlanganSim) return;
    this.tanlangan = null;
    this.tanlanganSim = null;
    this.emit('ozgardi', { sabab: 'tanlov' });
  }

  elementBosish(id) {
    const el = this.elMap.get(id);
    if (!el || !el.def.bosiladi) return;
    this.holat[id] = el.def.bosish(this.holat[id]);
    const h = this.holat[id];
    this.emit('xabar', { matn: t('h.element', { e: id, s: t(h.yoqilgan ? 's.yoqilgan' : 's.ochgan') }), daraja: 'info' });
    this.ozgardi('holat');
  }

  quvvatAlmashtir() {
    const yoq = !this.quvvatBormi();
    for (const el of this.els) if (el.def.himoya) this.holat[el.id] = { ...this.holat[el.id], yoqilgan: yoq };
    this.emit('xabar', { matn: t(yoq ? 'h.quvvat_on' : 'h.quvvat_off'), daraja: 'info' });
    this.ozgardi('holat');
  }

  // ---------- tekshiruv, maslahat, javob ----------
  tekshir() {
    const r = tekshir(this.sxema, this.simlar);
    this.belgilangan = { simlar: new Set(), klemmalar: new Set() };
    for (const x of r.xatolar) {
      (x.simlar || []).forEach((s) => this.belgilangan.simlar.add(s));
      (x.klemmalar || []).forEach((k) => this.belgilangan.klemmalar.add(k));
    }
    if (r.togri) {
      if (!this.ball.tugadi) {
        this.ball.tugadi = Date.now();
        const n = { ball: this.ballHisob(), vaqt: this.vaqt(), xatolar: this.ball.xato, maslahat: this.ball.maslahat, javob: this.ball.javob, sana: new Date().toISOString() };
        this.ball.yakuniy = n.ball;
        natijaniSaqla(this.sxema.id, n);
        this.qoralamaniSaqla();
        this.emit('tugadi', n);
      }
    } else if (!this.ball.tugadi && r.xatolar[0]?.tur !== 'bosh') {
      this.ball.xato++;
      this.qoralamaniSaqla();
    }
    this.emit('tekshiruv', r);
    this.emit('ozgardi', { sabab: 'tekshiruv' });
    return r;
  }

  maslahat() {
    const list = tx(this.sxema.maslahatlar) || [];
    if (this.ball.maslahat >= list.length) return { matn: t('h.maslahat_yoq'), yangi: false };
    this.ball.maslahat++;
    this.qoralamaniSaqla();
    this.emit('ozgardi', { sabab: 'maslahat' });
    return { matn: list[this.ball.maslahat - 1], yangi: true };
  }

  maslahatlarRoyxati() {
    const list = tx(this.sxema.maslahatlar) || [];
    return list.slice(0, this.ball.maslahat);
  }

  javobniKorsat() {
    this.ball.javob = true;
    for (const el of this.els) this.holat[el.id] = el.def.boshlangich(el.param);
    this.simlar = togriSimlar(this.sxema).map((s) => ({ ...s, id: `s${++this.simN}` }));
    this.tanlangan = null;
    this.tanlanganSim = null;
    this.belgilangan = { simlar: new Set(), klemmalar: new Set() };
    this.emit('xabar', { matn: t('h.javob'), daraja: 'ogoh' });
    this.ozgardi('javob');
  }

  qayta() {
    this.yangidan();
    this.qoralamaniSaqla();
    this.emit('xabar', { matn: t('h.qayta'), daraja: 'info' });
    this.emit('ozgardi', { sabab: 'qayta' });
  }

  // ---------- qoralama (sahifa yangilansa ish yo‘qolmasin) ----------
  qoralamaniSaqla() {
    try {
      localStorage.setItem(QORALAMA_KEY(this.sxema.id), JSON.stringify({ v: this.sxema.versiya || 1, simlar: this.simlar, simN: this.simN, ball: this.ball }));
    } catch (e) { /* e’tiborsiz */ }
  }

  qoralamaniOl() {
    try {
      const q = JSON.parse(localStorage.getItem(QORALAMA_KEY(this.sxema.id)) || 'null');
      if (!q || q.v !== (this.sxema.versiya || 1) || !Array.isArray(q.simlar)) return;
      this.simlar = q.simlar.filter((s) => this.klemma(s.a) && this.klemma(s.b) && RANGLAR[s.rang]);
      this.simN = q.simN || this.simlar.length;
      if (q.ball && typeof q.ball.boshlanish === 'number') this.ball = { ...this.ball, ...q.ball };
      this.hisobla(false);
    } catch (e) { /* buzilgan qoralama — e’tiborsiz */ }
  }
}
