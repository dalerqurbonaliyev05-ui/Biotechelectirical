// Ulanishlarni tekshiruvchi.
// Faqat "to‘g‘ri/noto‘g‘ri" emas, xato turini aniqlaydi: qisqa tutashuv, ochiq zanjir (qayerda uzilgani bilan),
// kalit nolni uzishi, faza rezbada, PE yo‘qligi, sim rangi, qutini chetlab o‘tish va h.k.
// Natijadagi parametrlar: {k: 'Q1.in'} — bitta klemma, {kl: [...]} — klemmalar, {sl: [...]} — simlar ro‘yxati.
import { tayyorla, boshlangichHolat, simulyatsiya, simRollari, tarmoq, manbalar } from './simulator.js';
import { ROL_RANGLARI, ROL_RANGLARI_3F } from './ranglar.js';

const XATO = 'xato';
const OGOH = 'ogoh';

function holatBilan(els, qoshimcha = {}) {
  const h = boshlangichHolat(els);
  for (const el of els) if (el.def.himoya) h[el.id] = { ...h[el.id], yoqilgan: true }; // tok berilgan
  for (const [id, v] of Object.entries(qoshimcha)) h[id] = { ...h[id], ...v };
  return h;
}

function guruhKlemmalari(g) { return g.nuqtalar; }

/** Ochiq zanjirda uzilish joyini topadi: yo‘l bo‘yidagi nuqtalarni "indikator" bilan tekshirganday. */
function uzilishJoyi(sim, qoida) {
  if (!qoida) return null;
  const { faza_yoli: fy = [], nol_yoli: ny = [] } = qoida;
  if (fy.length) {
    let i = -1;
    while (i + 1 < fy.length && sim.fazaBor(fy[i + 1])) i++;
    if (i < fy.length - 1) {
      return i < 0
        ? { kalit: 'chk.ochiq_faza_yoq', p: { b: { k: fy[0] } } }
        : { kalit: 'chk.ochiq_faza', p: { a: { k: fy[i] }, b: { k: fy[i + 1] } } };
    }
  }
  if (ny.length) {
    // nol manbadan (birinchi nuqta) lampa tomonga qarab tekshiriladi
    let i = -1;
    while (i + 1 < ny.length && sim.nolBor(ny[i + 1])) i++;
    if (i < ny.length - 1) {
      return i < 0
        ? { kalit: 'chk.ochiq_nol_yoq', p: { b: { k: ny[0] } } }
        : { kalit: 'chk.ochiq_nol', p: { a: { k: ny[i] }, b: { k: ny[i + 1] } } };
    }
  }
  return null;
}

// Xato qoidalari reestri. Har bir qoida sxema JSON'dagi "xato_qoidalari" dan parametr oladi.
export const QOIDALAR = {
  // Kalit faza simini uzishi kerak: kalit o‘chiq bo‘lsa, lampada faza qolmasligi kerak.
  kalit_fazada(ctx, q) {
    const el = ctx.el(q.yuklama);
    if (!el) return [];
    const sim = simulyatsiya(ctx.els, ctx.simlar, holatBilan(ctx.els, { [q.kalit]: { yoqilgan: false } }));
    if (sim.qisqa || sim.yuklamalar[q.yuklama]?.yonadi) return [];
    const y = el.def.yuklama;
    const qolgan = [y.faza, y.nol].map((k) => `${el.id}.${k}`).filter((k) => sim.fazaBor(k));
    return qolgan.length ? [{ tur: 'kalit_nolda', daraja: OGOH, kalit: 'chk.kalit_nolda', p: { kl: { kl: qolgan } }, klemmalar: qolgan }] : [];
  },

  // Faza patronning markaziy kontaktiga ulanishi kerak.
  faza_markazga(ctx, q) {
    const ochiq = Object.fromEntries(ctx.els.filter((e) => 'yoqilgan' in (e.def.boshlangich(e.param) || {})).map((e) => [e.id, { yoqilgan: true }]));
    const sim = simulyatsiya(ctx.els, ctx.simlar, holatBilan(ctx.els, ochiq));
    const y = sim.yuklamalar[q.lampa];
    if (!y || sim.qisqa) return [];
    if (y.fazaRezbada && !y.fazaMarkazda) {
      const k = `${q.lampa}.${ctx.el(q.lampa).def.yuklama.nol}`;
      return [{ tur: 'faza_rezbada', daraja: OGOH, kalit: 'chk.faza_rezbada', p: {}, klemmalar: [k] }];
    }
    return [];
  },

  // PE klemmalari manbaning PE siga ulangan bo‘lishi kerak; N va PE birlashtirilmasligi kerak.
  pe_ulangan(ctx, q) {
    const { uf } = tarmoq(ctx.els, ctx.simlar, ctx.boshlangich, 'yopiq');
    const src = manbalar(ctx.els)[0];
    const res = [];
    const yoq = q.klemmalar.filter((k) => !uf.bir(k, src.PE));
    if (yoq.length) res.push({ tur: 'pe_yoq', daraja: OGOH, kalit: 'chk.pe_yoq', p: { k: { kl: yoq } }, klemmalar: yoq });
    if (uf.bir(src.N, src.PE)) res.push({ tur: 'n_pe', daraja: OGOH, kalit: 'chk.n_pe', p: {} });
    return res;
  },

  // L — jigarrang/qora, N — ko‘k, PE — sariq-yashil.
  sim_rangi(ctx, q) {
    const asos = ctx.sxema.rang_rejimi === '3f' ? ROL_RANGLARI_3F : ROL_RANGLARI;
    const ruxsat = { ...asos, ...(ctx.sxema.ranglar || {}), ...(q.ranglar || {}) };
    const rollar = simRollari(ctx.els, ctx.simlar, ctx.boshlangich);
    const notogri = ctx.simlar.filter((s) => {
      const r = rollar.get(s.id);
      if (r.size !== 1) return false; // tutashuv yoki manbaga ulanmagan sim — rangini baholab bo‘lmaydi
      const [rol] = r;
      return !(ruxsat[rol] || []).includes(s.rang);
    });
    return notogri.length
      ? [{ tur: 'sim_rangi', daraja: OGOH, kalit: 'chk.rang', p: { list: { sl: notogri.map((s) => s.id) } }, simlar: notogri.map((s) => s.id) }]
      : [];
  },

  // "orqali" ko‘rsatilgan ulanishlar taqsimlash qutisi ichida bajarilishi kerak.
  quti_orqali(ctx, q) {
    const T = new Set();
    for (const g of ctx.sxema.togri_ulanishlar) if (g.orqali === q.quti) for (const k of guruhKlemmalari(g)) T.add(k);
    const pre = `${q.quti}.`;
    const chetlab = ctx.simlar.filter((s) => !s.a.startsWith(pre) && !s.b.startsWith(pre) && (T.has(s.a) || T.has(s.b)));
    return chetlab.length
      ? [{ tur: 'quti_chetlab', daraja: OGOH, kalit: 'chk.quti', p: { q: q.quti, list: { sl: chetlab.map((s) => s.id) } }, simlar: chetlab.map((s) => s.id) }]
      : [];
  },

  // Yuklama avtomat orqali ta’minlanishi kerak: avtomat o‘chirilganda yuklamada faza qolmasin.
  avtomat_himoyasi(ctx, q) {
    const el = ctx.el(q.yuklama);
    if (!el) return [];
    const yopiq = Object.fromEntries(ctx.els.filter((e) => !e.def.himoya && 'yoqilgan' in (e.def.boshlangich(e.param) || {})).map((e) => [e.id, { yoqilgan: true }]));
    const sim = simulyatsiya(ctx.els, ctx.simlar, holatBilan(ctx.els, { ...yopiq, [q.avtomat]: { yoqilgan: false } }));
    if (sim.qisqa) return [];
    const y = el.def.yuklama;
    const qolgan = [y.faza, y.nol].map((k) => `${el.id}.${k}`).filter((k) => sim.fazaBor(k));
    return qolgan.length ? [{ tur: 'avtomat_chetlab', daraja: OGOH, kalit: 'chk.avtomat', p: { q: q.avtomat }, klemmalar: qolgan }] : [];
  },
};

/** Potensial nuqtalarni kutilgan guruhlar bilan solishtirish (passiv elementlar, masalan quti, hisobga olinmaydi). */
function topologiya(ctx) {
  const passiv = new Set(ctx.els.filter((e) => e.def.passiv).map((e) => e.id));
  const { uf } = tarmoq(ctx.els, ctx.simlar, ctx.boshlangich, 'doimiy');
  const res = [];
  const guruhi = new Map();
  ctx.sxema.togri_ulanishlar.forEach((g, i) => { for (const k of g.nuqtalar) guruhi.set(k, i); });
  for (const g of ctx.sxema.togri_ulanishlar) {
    const k0 = g.nuqtalar[0];
    const ajratilgan = g.nuqtalar.filter((k) => !uf.bir(k, k0));
    if (ajratilgan.length) res.push({ tur: 'ulanmagan', daraja: OGOH, kalit: 'chk.ulanmagan', p: { list: { kl: g.nuqtalar } }, klemmalar: g.nuqtalar });
  }
  // Bir potensialga tushib qolgan turli guruh nuqtalari
  const netlar = new Map();
  for (const [k, gi] of guruhi) {
    if (passiv.has(k.split('.')[0])) continue;
    const r = uf.find(k);
    if (!netlar.has(r)) netlar.set(r, new Map());
    const m = netlar.get(r);
    if (!m.has(gi)) m.set(gi, k);
  }
  for (const m of netlar.values()) {
    if (m.size > 1) {
      const kl = [...m.values()];
      res.push({ tur: 'ortiqcha', daraja: OGOH, kalit: 'chk.ortiqcha', p: { list: { kl } }, klemmalar: kl });
    }
  }
  return res;
}

/** Element holatiga amal qo‘llash (sinov ssenariysi va foydalanuvchi bosishi uchun umumiy). */
export function amalQoll(el, h, qiymat, tugma) {
  const d = el.def;
  h = h || {};
  if (d.amal) return d.amal(h, qiymat, tugma, el.param);
  if (qiymat === 'yoq') return { ...h, yoqilgan: true };
  if (qiymat === 'och') return { ...h, yoqilgan: false };
  if (d.bosish) return d.bosish(h, el.param);
  return h;
}

/**
 * Bitta sinov ssenariysini bajaradi: boshlang‘ich holat (barcha himoya avtomatlari yoqilgan) → qadamlar.
 * Qadam turlari: {amal: "SB2", qiymat: "bos"|"bosib_tur"|"qoyib_yubor"|"yoq"|"och"|<holat nomi>, tugma?},
 *                {kut: sekund}, {kutilgan: {"M1": "ishlaydi", "HL1": "!yonadi"}}.
 * Natija: {ok} | {qisqa, qadam} | {xato: true, qadam, el, kut, bor} | {tebranish: true}
 */
export function ssenariyIshla(els, simlar, ss) {
  let h = boshlangichHolat(els);
  for (const el of els) if (el.def.himoya) h[el.id] = { ...h[el.id], yoqilgan: true };
  for (const [id, v] of Object.entries(ss.boshlangich || {})) h[id] = { ...h[id], ...v };
  let vaqt = 0;
  let sim = simulyatsiya(els, simlar, h, { vaqt });
  h = sim.holatlar;
  const kuygan = () => Object.entries(sim.natija).find(([, n]) => n.holatlar?.includes('kuydi'))?.[0];
  const muammo = (i) => {
    if (sim.qisqa) return { qisqa: sim.qisqa, chetlab: sim.chetlab, qadam: i };
    if (sim.tebranish) return { tebranish: true, qadam: i };
    const k = kuygan();
    return k ? { kuydi: k, qadam: i } : null;
  };
  let m = muammo(-1);
  if (m) return m;
  for (let i = 0; i < ss.qadamlar.length; i++) {
    const q = ss.qadamlar[i];
    if (q.amal) {
      const el = els.find((e) => e.id === q.amal);
      if (!el) continue;
      const qiymatlar = q.qiymat === 'bos' ? ['bosib_tur', 'qoyib_yubor'] : [q.qiymat];
      for (const v of qiymatlar) {
        h = { ...h, [el.id]: amalQoll(el, h[el.id], v, q.tugma) };
        sim = simulyatsiya(els, simlar, h, { vaqt });
        h = sim.holatlar;
        m = muammo(i);
        if (m) return m;
      }
    }
    if (q.kut) {
      const n = Math.max(1, Math.ceil(q.kut / 0.5));
      for (let k = 0; k < n; k++) {
        vaqt += q.kut / n;
        sim = simulyatsiya(els, simlar, h, { vaqt });
        h = sim.holatlar;
        m = muammo(i);
        if (m) return m;
      }
    }
    if (q.kutilgan) {
      for (const [id, kut] of Object.entries(q.kutilgan)) {
        const bor = sim.natija[id]?.holatlar || [];
        const ok = kut.startsWith('!') ? !bor.includes(kut.slice(1)) : bor.includes(kut);
        if (!ok) return { xato: true, qadam: i, el: id, kut, bor };
      }
    }
  }
  return { ok: true };
}

function ssenariylarniTekshir(ctx) {
  const res = [];
  for (const ss of ctx.sxema.ssenariylar || []) {
    const r = ssenariyIshla(ctx.els, ctx.simlar, ss);
    if (r.qisqa) {
      res.push({
        tur: 'qisqa_tutashuv', daraja: XATO,
        kalit: r.qisqa.tur === 'L-N' ? 'chk.qisqa_LN' : r.qisqa.tur === 'L-PE' ? 'chk.qisqa_LPE' : 'chk.qisqa_LL',
        qoshimcha: r.chetlab ? 'chk.qisqa_chetlab' : null, p: {}, ss: ss.nomi,
      });
      return res; // qisqa tutashuv — eng jiddiy xato
    }
    if (r.tebranish) { res.push({ tur: 'tebranish', daraja: XATO, kalit: 'chk.tebranish', p: { ss: { tx: ss.nomi } } }); continue; }
    if (r.kuydi) { res.push({ tur: 'kuydi', daraja: XATO, kalit: 'chk.kuydi', p: { ss: { tx: ss.nomi }, el: r.kuydi } }); continue; }
    if (r.xato) {
      res.push({
        tur: 'ssenariy', daraja: XATO, kalit: 'chk.ss',
        p: { ss: { tx: ss.nomi }, el: r.el, kut: { st: r.kut.replace(/^!/, '') }, bor: { stl: r.bor }, yoq: r.kut.startsWith('!') ? 'yoq' : '' },
      });
    }
  }
  return res;
}

/**
 * Asosiy tekshiruv. Natija: { togri: boolean, xatolar: [...] }.
 * Sxema faqat barcha qoidalar bajarilganda to‘g‘ri hisoblanadi.
 */
export function tekshir(sxema, simlar) {
  const els = tayyorla(sxema);
  const ctx = {
    sxema, els, simlar,
    boshlangich: boshlangichHolat(els),
    el: (id) => els.find((e) => e.id === id),
  };
  if (!simlar.length) return { togri: false, xatolar: [{ tur: 'bosh', daraja: XATO, kalit: 'chk.bosh', p: {} }] };

  const maqsad = sxema.maqsad || [];
  const xatolar = [];

  // 1) Qisqa tutashuv — eng xavfli, boshqa tekshiruvlardan oldin.
  for (const sc of maqsad) {
    const sim = simulyatsiya(els, simlar, holatBilan(els, sc.holat));
    if (sim.qisqa) {
      xatolar.push({
        tur: 'qisqa_tutashuv', daraja: XATO,
        kalit: sim.qisqa.tur === 'L-N' ? 'chk.qisqa_LN' : 'chk.qisqa_LPE',
        qoshimcha: sim.chetlab ? 'chk.qisqa_chetlab' : null,
        p: {},
      });
      return { togri: false, xatolar };
    }
  }

  // 2) Maqsad holatlari: kalit yoqilganda yonadi, o‘chirilganda o‘chadi.
  const ochiqQoida = (sxema.xato_qoidalari || []).filter((q) => q.tur === 'ochiq_zanjir');
  for (const sc of maqsad) {
    const sim = simulyatsiya(els, simlar, holatBilan(els, sc.holat));
    for (const [id, kut] of Object.entries(sc.kutilgan)) {
      const bor = sim.yuklamalar[id]?.yonadi;
      if (kut === 'yonadi' && !bor) {
        const joy = uzilishJoyi(sim, ochiqQoida.find((q) => q.yuklama === id));
        xatolar.push({ tur: 'ochiq_zanjir', daraja: XATO, kalit: 'chk.ochiq', p: { y: id }, joy });
      } else if (kut === 'ochgan' && bor) {
        xatolar.push({ tur: 'boshqarilmaydi', daraja: XATO, kalit: 'chk.boshqarilmaydi', p: { y: id } });
      }
    }
  }
  const tur = new Set();
  const unikal = xatolar.filter((x) => (tur.has(x.tur) ? false : tur.add(x.tur)));

  // 2b) Ketma-ket sinov ssenariylari (yangi sxemalar)
  if (sxema.ssenariylar) {
    const ss = ssenariylarniTekshir(ctx);
    if (ss[0]?.tur === 'qisqa_tutashuv') return { togri: false, xatolar: ss };
    unikal.push(...ss);
  }

  // 3) Xavfsizlik va montaj qoidalari.
  for (const q of sxema.xato_qoidalari || []) {
    const f = QOIDALAR[q.tur];
    if (f) unikal.push(...f(ctx, q));
  }

  // 4) Hech narsa topilmagan bo‘lsa — potensial nuqtalarni to‘g‘ri yechim bilan solishtirish.
  if (!unikal.length && (sxema.topologiya ?? !!sxema.maqsad)) unikal.push(...topologiya(ctx));

  return { togri: unikal.length === 0, xatolar: unikal };
}

/** To‘g‘ri yechim simlarini yaratadi ("To‘g‘ri javobni ko‘rsatish" uchun). */
export function togriSimlar(sxema) {
  const els = tayyorla(sxema);
  const band = new Map(); // quti → ishlatilgan bloklar soni
  const simlar = [];
  let n = 0;
  const qosh = (a, b, rang) => simlar.push({ id: `j${++n}`, a, b, rang });
  for (const g of sxema.togri_ulanishlar) {
    if (g.orqali) {
      const q = els.find((e) => e.id === g.orqali);
      const bloklar = q.def.bloklar(q.param);
      const i = band.get(q.id) || 0;
      band.set(q.id, i + 1);
      const blok = bloklar[i];
      g.nuqtalar.forEach((k, j) => qosh(k, `${q.id}.${blok[j]}`, g.rang));
    } else {
      for (let j = 1; j < g.nuqtalar.length; j++) qosh(g.nuqtalar[j - 1], g.nuqtalar[j], g.rang);
    }
  }
  return simlar;
}
