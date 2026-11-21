// Ulanishlarni tekshiruvchi.
// Faqat "to‘g‘ri/noto‘g‘ri" emas, xato turini aniqlaydi: qisqa tutashuv, ochiq zanjir (qayerda uzilgani bilan),
// kalit nolni uzishi, faza rezbada, PE yo‘qligi, sim rangi, qutini chetlab o‘tish va h.k.
// Natijadagi parametrlar: {k: 'Q1.in'} — bitta klemma, {kl: [...]} — klemmalar, {sl: [...]} — simlar ro‘yxati.
import { tayyorla, boshlangichHolat, simulyatsiya, simRollari, tarmoq, manbalar } from './simulator.js';
import { ROL_RANGLARI } from './ranglar.js';

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
    const ruxsat = { ...ROL_RANGLARI, ...(ctx.sxema.ranglar || {}), ...(q.ranglar || {}) };
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

  // 3) Xavfsizlik va montaj qoidalari.
  for (const q of sxema.xato_qoidalari || []) {
    const f = QOIDALAR[q.tur];
    if (f) unikal.push(...f(ctx, q));
  }

  // 4) Hech narsa topilmagan bo‘lsa — potensial nuqtalarni to‘g‘ri yechim bilan solishtirish.
  if (!unikal.length) unikal.push(...topologiya(ctx));

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
