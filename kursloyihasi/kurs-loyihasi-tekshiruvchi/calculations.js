/*
 * calculations.js — Elektr tarmoqlari kurs loyihasi: sof hisoblash funksiyalari.
 * DOM ga bog'liq emas. Brauzerda `window.KursCalc`, Node'da `module.exports` orqali ishlaydi.
 *
 * Algoritm ToshDTU uslubiy qo'llanmasi (Rasulov A.N. va boshq., 2014) bo'yicha:
 *   3-bob balans, 5.1–5.7 radial variant, 7-bob kuchlanish va RPN.
 *
 * Birliklar:
 *   P — MVt, Q — MVAr, S — MVA, U — kV, R/X — Om, l — km, I — A, F — mm²,
 *   W (kirish) — 10⁶ kVt·soat, ΔW (natija) — MVt·soat.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KursCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- konstantalar
  const PST = ['A', 'B', 'C', 'D', 'E'];
  // Liniya → podstansiya bog'lanishi (SPEC: HL-1→A, HL-2→C, HL-3→B, HL-4→D, HL-5→E, HL-6→sistema)
  const LINES = [
    { id: 'HL-1', pst: 'A' },
    { id: 'HL-2', pst: 'C' },
    { id: 'HL-3', pst: 'B' },
    { id: 'HL-4', pst: 'D' },
    { id: 'HL-5', pst: 'E' },
    { id: 'HL-6', pst: null }
  ];
  const STD_U = [35, 110, 220];
  // Qo'llanma 3.2: xususiy ehtiyoj generatorlar quvvatidan — GES 1%, IES 8%, DIES 3–5%
  const K_XUS = { GES: 0.01, IES: 0.08, DIES: 0.04 };
  // Qo'llanma 3.3: zaryad quvvati bir zanjirning har km i uchun (MVAr/km)
  const Q_ZAR_KM = { 35: 0.0035, 110: 0.035, 220: 0.132 };
  const TRAFO_KEY = { 35: 'ikki_cholgamli_35kV', 110: 'ikki_cholgamli_110kV', 220: 'ikki_cholgamli_220kV' };
  const TAP_KEY = { 35: '35_kV', 110: '110_kV', 220: '220_kV' };
  const ZERO_TAP_DOWN = { 35: 36.75, 110: 115, 220: 230 };   // qo'llanma 5.3.б
  const SQ3 = Math.sqrt(3);

  const DEFAULT_OPTS = {
    kXusPct: null,        // null → manba turiga qarab (% ΣP_gen)
    dPtarPct: 8,          // ΔP_tar, % ΣP_yuk (qo'llanma: 6–10%)
    dQpulPct: 5,          // transformatorlar po'lat o'zagidagi ΔQ, % ΣP_yuk
    lineKat2: 1,          // II kategoriya liniyasi zanjirlari soni (qo'llanma misolida — 1)
    trafoKat2: 2,         // II kategoriya transformatorlari soni (qo'llanma 5.3.б — 2 ta, har biri 70%)
    kTrafoI: 1.0,         // I kategoriya: har bir transformator Sn ≥ k·S (qo'llanma: 100% zaxira)
    kTrafo2: 0.7,         // II/III kategoriya, 2 ta transformator: Sn ≥ 0.7·S
    kTrafo1: 1.0,         // bitta transformator: Sn ≥ k·S
    kat3OneMax: 100,      // III kategoriya: S < 100 MVA bo'lsa bitta transformator
    onlyStepDown: true,   // p/st lar uchun faqat pasaytiruvchi (RPN li, nol shahobchasi 230/115/36.75 kV) turlar
    uBusCoef: 1.1,        // manba YuK shinasi: 1.1·U_nom (220 → 242 kV)
    minLoadFactor: 0.6,   // minimal rejim: barcha yuklamalar 60%
    avLoadFactor: 0.7,    // avariyadan keyingi rejim: II va III kategoriya yuklamalari 70%
    tieTm: 5000,          // sistema bilan bog'lovchi liniya va stansiya uchun T = 5000 soat
    cosTieMin: 0.97       // bog'lovchi liniyada cosφ ≥ 0.97
  };

  class CalcError extends Error {
    constructor(messages, kind) {
      const list = Array.isArray(messages) ? messages : [messages];
      super(list.join('\n'));
      this.name = 'CalcError';
      this.messages = list;
      this.kind = kind || 'input';   // 'wire' — kuchlanishni oshirish bilan hal bo'lishi mumkin
    }
  }

  // ---------------------------------------------------------------- yordamchilar
  const tgOf = (cos) => Math.sqrt(1 - cos * cos) / cos;
  const cplx = (p, q) => ({ p, q, s: Math.hypot(p, q) });
  const sq = (x) => x * x;
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

  /** "3x100+2x50 MVt", "3×100 + 2×50", "4x100" → [100,100,100,50,50] */
  function parseGenerators(str) {
    const out = [];
    String(str || '')
      .replace(/MVt|MW|МВт/gi, '')
      .split('+')
      .forEach((part) => {
        const t = part.trim();
        if (!t) return;
        const m = t.match(/^(\d+)\s*[x×х*]\s*(\d+(?:[.,]\d+)?)$/i);
        if (m) {
          const cnt = parseInt(m[1], 10);
          const p = parseFloat(m[2].replace(',', '.'));
          for (let i = 0; i < cnt; i++) out.push(p);
        } else {
          const p = parseFloat(t.replace(',', '.'));
          if (!isNaN(p)) out.push(p);
        }
      });
    return out;
  }

  const crossSection = (marka) => parseInt(String(marka).split('-')[1], 10);

  /** Standart qatordan eng yaqin kuchlanish */
  function nearestStd(u) {
    let best = STD_U[0];
    STD_U.forEach((s) => { if (Math.abs(s - u) <= Math.abs(best - u)) best = s; });
    return best;
  }

  /** Tm bo'yicha tokning iqtisodiy zichligi (A/mm²), qo'llanma 5.2 jadvali */
  function economicDensity(Tm, data) {
    const t = data.wires.tok_iqtisodiy_zichligi_A_mm2;
    if (Tm <= 3000) return t['1000-3000_soat'];
    if (Tm <= 5000) return t['3000-5000_soat'];
    return t['5000-8760_soat'];
  }

  /** τ = f(Tm, cosφ): 2-ilova 4-jadval bo'yicha ikki o'lchamli chiziqli interpolatsiya */
  function tauLookup(Tm, cos, data) {
    const rows = data.tau.jadval;
    const formula = () => ({ tau: sq(0.124 + Tm / 1e4) * 8760, method: 'formula' });
    if (!(Tm >= rows[0].Tm && Tm <= rows[rows.length - 1].Tm)) return formula();
    const c = Math.min(1, Math.max(0.6, cos));
    const at = (row) => {
      const v6 = row['cos_0.6'], v8 = row['cos_0.8'], v10 = row['cos_1.0'];
      if (c <= 0.8) {
        const a = v6 == null ? v8 : v6;
        return a + (v8 - a) * (c - 0.6) / 0.2;
      }
      return v8 + (v10 - v8) * (c - 0.8) / 0.2;
    };
    for (let i = 0; i < rows.length - 1; i++) {
      const r0 = rows[i], r1 = rows[i + 1];
      if (Tm >= r0.Tm && Tm <= r1.Tm) {
        const a = at(r0), b = at(r1);
        return { tau: a + (b - a) * (Tm - r0.Tm) / (r1.Tm - r0.Tm), method: 'jadval' };
      }
    }
    return formula();
  }

  /** Berilgan kuchlanish uchun sim katalogi (kesim bo'yicha tartiblangan) */
  function wireCatalog(U, data) {
    const params = data.wires.kuchlanish_parametrlari[U + '_kV'];
    if (!params) return [];
    return data.wires.simlar
      .filter((w) => params[w.marka])
      .map((w) => {
        const p = params[w.marka];
        const q100 = p.q0 != null ? p.q0 : U * U * p.b0 * 1e-4; // MVAr / 100 km
        return {
          marka: w.marka,
          F: crossSection(w.marka),
          d: w.d_mm,
          Iruh: w.I_ruh_A,
          r0: w.r0,             // Om/km
          x0: p.x0 / 100,       // Om/km
          b0: p.b0 * 1e-6,      // Sim/km
          q0: q100 / 100        // MVAr/km
        };
      })
      .sort((a, b) => a.F - b.F);
  }

  function trafoCatalog(U, data) {
    const list = data.transformers[TRAFO_KEY[U]] || [];
    return list.filter((t) => [t.Sn, t.UnYuK, t.dPpul, t.dQpul, t.Rt, t.Xt].every((v) => typeof v === 'number'));
  }

  /** PK tarafining nominal kuchlanishi (UnPK satridan 10.5 ga eng yaqin qiymat) */
  function pickUnPK(str) {
    const nums = String(str).split(/[;\/]/).map(parseFloat).filter((x) => !isNaN(x) && x > 0);
    if (!nums.length) return 10.5;
    return nums.reduce((b, x) => (Math.abs(x - 10.5) < Math.abs(b - 10.5) ? x : b), nums[0]);
  }

  // ---------------------------------------------------------------- tanlash
  function selectWire(line, U, data) {
    const cat = wireCatalog(U, data);
    if (!cat.length) throw new CalcError(`${U} kV uchun sim katalogi topilmadi.`);
    const F_calc = line.I_max / line.j;
    const econ = cat.find((w) => w.F >= F_calc - 1e-9);
    if (!econ) {
      throw new CalcError(
        `${line.id}: hisobiy kesim yuza F = ${F_calc.toFixed(1)} mm² — ${U} kV katalogidagi eng katta simdan ` +
        `(${cat[cat.length - 1].marka}) ham katta. Qo'llanma 5.2 ga ko'ra nominal kuchlanishni oshiring yoki ikki zanjirli liniya oling.`,
        'wire'
      );
    }
    let wire = econ;
    let increased = false;
    while (wire && line.I_heat > wire.Iruh) {
      wire = cat[cat.indexOf(wire) + 1];
      increased = true;
    }
    if (!wire) {
      throw new CalcError(
        `${line.id}: qizish sharti bo'yicha avariyadan keyingi tok I = ${line.I_heat.toFixed(0)} A — ` +
        `${U} kV katalogidagi birorta sim bardosh bermaydi. Nominal kuchlanishni oshiring.`,
        'wire'
      );
    }
    return { wire, econ, F_calc, increasedForHeating: increased, minF: cat[0].F };
  }

  /** Qo'llanma 5.3.б: podstansiya transformatorlari soni va quvvat koeffitsienti */
  function trafoRule(ld, o) {
    let n;
    if (ld.kat === 1) n = 2;
    else if (ld.kat === 2) n = o.trafoKat2;
    else n = ld.S >= o.kat3OneMax ? 2 : 1;
    const k = n === 1 ? o.kTrafo1 : (ld.kat === 1 ? o.kTrafoI : o.kTrafo2);
    return { n, k };
  }

  function selectStepDown(ld, o, U, data) {
    const { n, k } = trafoRule(ld, o);
    const cat = trafoCatalog(U, data);
    const S = ld.S;
    const Sreq = k * S;
    // PK tarafi 10 kV tarmoq uchun faqat 10.5–11 kV cho'lg'ami bor transformatorlar
    const pool = cat.filter((t) => { const u = pickUnPK(t.UnPK); return u >= 10 && u <= 11.5; });
    // qo'llanma 5.3.б: pasaytiruvchi (RPN li) transformatorlarning nol shahobchasi 230/115/36.75 kV
    const down = o.onlyStepDown ? pool.filter((t) => t.UnYuK <= 1.051 * U) : pool;
    const smallest = (list) => {
      const c = list.filter((x) => x.Sn >= Sreq - 1e-9);
      if (!c.length) return null;
      const minSn = Math.min(...c.map((x) => x.Sn));
      return c.filter((x) => x.Sn === minSn).sort((a, b) => a.UnYuK - b.UnYuK)[0];
    };
    let note = null;
    let t = smallest(down);
    if (!t) {
      // eng katta pasaytiruvchi transformator 1.4 marta o'ta yuklanish bilan yetadimi?
      const biggest = down.slice().sort((a, b) => b.Sn - a.Sn)[0];
      if (n === 2 && biggest && biggest.Sn >= S / 1.4 - 1e-9) {
        t = biggest;
        note = `Katalogda S_n ≥ ${Sreq.toFixed(1)} MVA li pasaytiruvchi transformator yo'q — eng kattasi olindi; bittasi o'chganda o'ta yuklanish ${(S / biggest.Sn).toFixed(2)} (≤ 1.4). Kerak bo'lsa 3 ta transformator yoki avtotransformator varianti ko'riladi (qo'llanma 5.3.в).`;
      } else {
        t = smallest(pool);
        if (t) note = `Katalogda mos pasaytiruvchi (RPN li, nol shahobchasi ${ZERO_TAP_DOWN[U]} kV) transformator yo'q — ${t.marka} (nol shahobchasi ${t.UnYuK} kV) olindi; unda RPN o'rniga ПБВ ±2×2.5% bo'lishi mumkin, kuchlanishni rostlashni o'qituvchi bilan kelishing.`;
      }
    }
    if (!t) {
      throw new CalcError(
        `p/st ${ld.name}: transformator topilmadi — talab qilingan quvvat Sn ≥ ${Sreq.toFixed(1)} MVA (${U} kV katalogida PK tarafi 10 kV bo'lgan mos transformator yo'q).`,
        'wire'
      );
    }
    return { ...t, n, k, Sreq, note, kz: S / (n * t.Sn), kAv: n === 2 ? S / t.Sn : null };
  }

  function selectStepUp(Sg, U, data) {
    const cat = trafoCatalog(U, data);
    let cands = cat.filter((t) => t.Sn >= Sg - 1e-9);
    // qo'llanma 5.3.а: ko'taruvchi transformator nol shahobchasi 1.1·U_nom (242/121/38.5 kV)
    const hv = cands.filter((t) => t.UnYuK >= 1.05 * U);
    if (hv.length) cands = hv;
    if (!cands.length) throw new CalcError(`Generator (${Sg.toFixed(1)} MVA) uchun ko'taruvchi transformator topilmadi.`);
    const minSn = Math.min(...cands.map((t) => t.Sn));
    const t = cands.filter((c) => c.Sn === minSn).sort((a, b) => b.UnYuK - a.UnYuK)[0];
    return { ...t, n: 1, kz: Sg / t.Sn };
  }

  // ---------------------------------------------------------------- oqim hisobi
  /** Podstansiya + unga olib boruvchi liniya: oxiridan boshiga (qo'llanma 5.6). Qk — PK dagi kompensatsiya */
  function pstChain(ld, tr, ln, U, f, Qk) {
    const P = ld.P * f;
    const Q = Math.max(0, ld.Q - (Qk || 0)) * f;
    const n = tr.n;
    const Rt = tr.Rt / n, Xt = tr.Xt / n;
    const dPx = n * tr.dPpul / 1000, dQx = n * tr.dQpul / 1000;
    const kt = (P * P + Q * Q) / (U * U);
    const dPt = kt * Rt, dQt = kt * Xt;
    const S1 = cplx(P + dPt + dPx, Q + dQt + dQx);
    const S2 = cplx(S1.p, S1.q - ln.Qc / 2);
    const kl = (S2.p * S2.p + S2.q * S2.q) / (U * U);
    const dPl = kl * ln.R, dQl = kl * ln.X;
    const S3 = cplx(S2.p + dPl, S2.q + dQl);
    const S4 = cplx(S3.p, S3.q - ln.Qc / 2);
    return {
      f, Qk: (Qk || 0) * f, Syuk: cplx(P, Q), Rt, Xt, dPx, dQx, dPt, dQt,
      ST: cplx(P + dPt, Q + dQt),   // transformator cho'lg'amlariga kirayotgan quvvat (po'lat isrofisiz)
      dSt: cplx(dPt + dPx, dQt + dQx), S1, S2, dPl, dQl, S3, S4
    };
  }

  /**
   * Stansiya shinasi balansi va HL-6 oqimi (qo'llanma 5.6, 21–27-bandlar).
   * Generatorlar nominal cosφ bilan ishlaydi; HL-6 da ortiqcha reaktiv quvvat cosφ_min dan pastga
   * tushirsa — generator Q kamaytiriladi (qo'llanma 3.3: «generator cosφ ini ko'tarish»).
   */
  function stationSolve(ctx, chains, gensOn) {
    const { U, tgM, kx, stepUps, tgTie } = ctx;
    const Pg = sum(gensOn, (g) => g);
    const P_xus = kx * Pg;
    const Q_xus = P_xus * tgM;
    const need = PST.reduce((acc, p) => ({ p: acc.p + chains[p].S4.p, q: acc.q + chains[p].S4.q }), { p: 0, q: 0 });
    const Qg_nom = Pg * tgM;

    const flows = (Qg) => {
      const ups = gensOn.map((pg) => {
        const t = stepUps.find((s) => s.Pg === pg).trafo;
        const share = pg / Pg;
        const p = pg - P_xus * share, q = (Qg - Q_xus) * share;
        const k = (p * p + q * q) / (U * U);
        return { Pg: pg, trafo: t, p, q, dPload: k * t.Rt, dP: k * t.Rt + t.dPpul / 1000, dQ: k * t.Xt + t.dQpul / 1000 };
      });
      const dPup = sum(ups, (u) => u.dP), dQup = sum(ups, (u) => u.dQ);
      return { ups, dPup, dQup, P6: Pg - P_xus - dPup - need.p, Q6: Qg - Q_xus - dQup - need.q };
    };

    let Qg = Qg_nom;
    let fl = flows(Qg);
    let genQreduced = false;
    const limit = Math.abs(fl.P6) * tgTie;
    if (fl.Q6 > limit + 1e-9) {
      // generator reaktiv quvvatini kamaytiramiz: Q6 = |P6|·tgφ_tie
      genQreduced = true;
      for (let it = 0; it < 30; it++) {
        const target = Math.abs(fl.P6) * tgTie;
        const QgNew = need.q + target + Q_xus + fl.dQup;
        fl = flows(QgNew);
        if (Math.abs(QgNew - Qg) < 1e-8) { Qg = QgNew; break; }
        Qg = QgNew;
      }
    }
    const S6 = cplx(fl.P6, fl.Q6);
    const cos6 = S6.s > 1e-9 ? Math.abs(S6.p) / S6.s : 1;
    // ekvivalent sxema uchun: ko'taruvchi transformatorlar guruhi (parallel) — po'lat va cho'lg'am isroflari alohida
    const pulUp = cplx(sum(fl.ups, (u) => u.trafo.dPpul / 1000), sum(fl.ups, (u) => u.trafo.dQpul / 1000));
    const windUp = cplx(fl.dPup - pulUp.p, fl.dQup - pulUp.q);
    const RtUp = 1 / sum(fl.ups, (u) => 1 / u.trafo.Rt);
    const XtUp = 1 / sum(fl.ups, (u) => 1 / u.trafo.Xt);
    const SG = cplx(Pg, Qg);
    const Sxus = cplx(P_xus, Q_xus);
    const afterXus = cplx(Pg - P_xus, Qg - Q_xus);
    const afterPul = cplx(afterXus.p - pulUp.p, afterXus.q - pulUp.q);
    const toBus = cplx(afterPul.p - windUp.p, afterPul.q - windUp.q);
    return {
      gensOn, Pg, Qg, Qg_nom, Qg_reserve: Qg_nom - Qg, cosGen: Pg / Math.hypot(Pg, Qg), genQreduced,
      P_xus, Q_xus, need: cplx(need.p, need.q), ups: fl.ups, dPup: fl.dPup, dQup: fl.dQup,
      pulUp, windUp, RtUp, XtUp, SG, Sxus, afterXus, afterPul, toBus,
      S6, cos6,
      I6_norm: S6.s * 1000 / (SQ3 * U * 2),
      I6_one: S6.s * 1000 / (SQ3 * U),
      direction: S6.p >= 0 ? 'export' : 'import'
    };
  }

  /** HL-6 dagi quvvat isrofi (HL-6 oqimi uning simiga bog'liq emas, shuning uchun alohida) */
  function addHl6Losses(s, hl6, U) {
    const Qc6 = hl6.Qc;
    const Sp = cplx(s.S6.p, s.S6.q + Qc6 / 2);
    const k6 = (Sp.p * Sp.p + Sp.q * Sp.q) / (U * U);
    s.Sp = Sp;
    s.dP6 = k6 * hl6.R;
    s.dQ6 = k6 * hl6.X;
    // sistema tomon yo'nalishda (manfiy — sistemadan olinadi)
    s.Ssys = cplx(Sp.p - s.dP6, Sp.q - s.dQ6 + Qc6 / 2);
    return s;
  }

  // ---------------------------------------------------------------- validatsiya
  function validate(input) {
    const errs = [];
    const gens = input.generators || [];
    if (!gens.length || gens.some((g) => !(g > 0))) errs.push("Manba generatorlari quvvati noto'g'ri kiritilgan (masalan: 3x100+2x50).");
    if (!(input.cosManba > 0 && input.cosManba <= 1)) errs.push("Manba cosφ 0 va 1 oralig'ida bo'lishi kerak.");
    if (!K_XUS[input.manba]) errs.push("Manba turi GES, DIES yoki IES bo'lishi kerak.");
    PST.forEach((p) => {
      const d = input.pst && input.pst[p];
      if (!d) { errs.push(`p/st ${p} ma'lumotlari yo'q.`); return; }
      if (!(d.P > 0)) errs.push(`p/st ${p}: P > 0 bo'lishi kerak.`);
      if (!(d.cos > 0 && d.cos <= 1)) errs.push(`p/st ${p}: cosφ 0 va 1 oralig'ida bo'lishi kerak.`);
      if (![1, 2, 3].includes(d.kat)) errs.push(`p/st ${p}: kategoriya I, II yoki III bo'lishi kerak.`);
      if (!(d.W > 0)) errs.push(`p/st ${p}: W > 0 bo'lishi kerak.`);
      else if (d.P > 0) {
        const Tm = d.W * 1000 / d.P;
        if (Tm > 8760) errs.push(`p/st ${p}: Tm = W·10³/P = ${Tm.toFixed(0)} soat > 8760 soat (yildagi soatlar soni) — W yoki P noto'g'ri. Qiymatni metodik qo'llanma jadvali bilan solishtirib, jadvalda tuzating.`);
      }
    });
    LINES.forEach((l) => {
      const v = input.lengths && input.lengths[l.id];
      if (!(v > 0)) errs.push(`${l.id}: masofa (km) 0 dan katta bo'lishi kerak.`);
    });
    if (input.U !== 'auto' && !STD_U.includes(Number(input.U))) errs.push('Nominal kuchlanish 35, 110 yoki 220 kV bo\'lishi kerak.');
    if (errs.length) throw new CalcError(errs);
  }

  // ================================================================ ASOSIY HISOB
  /**
   * «Avtomatik» kuchlanishda: formula tavsiyasi bilan sim/transformator tanlab bo'lmasa,
   * qo'llanma 5.2 ga ko'ra nominal kuchlanish keyingi standart qiymatgacha oshiriladi.
   */
  function calculate(input, data) {
    validate(input);
    if (input.U !== 'auto') return calculateAt(input, data, null);
    let Utry = null, lastErr = null;
    const failed = [];
    for (let i = 0; i < STD_U.length; i++) {
      try {
        const r = calculateAt(input, data, Utry);
        r.autoRaised = failed.length ? { from: failed, reason: lastErr.messages[0] } : null;
        return r;
      } catch (e) {
        if (!(e instanceof CalcError) || e.kind !== 'wire') throw e;
        lastErr = e;
        const cur = e.U;
        failed.push(cur);
        Utry = STD_U.find((u) => u > cur);
        if (!Utry) throw e;
      }
    }
    throw lastErr;
  }

  let currentU = null;   // xato qaysi kuchlanishda chiqqanini bilish uchun
  function calculateAt(input, data, Uforce) {
    currentU = null;
    try {
      return calculateCore(input, data, Uforce);
    } catch (e) {
      if (e instanceof CalcError) e.U = currentU;
      throw e;
    }
  }

  function calculateCore(input, data, Uforce) {
    const o = Object.assign({}, DEFAULT_OPTS, input.opts || {});
    const gens = input.generators.slice();
    const cosM = input.cosManba, tgM = tgOf(cosM);
    const tgTie = tgOf(o.cosTieMin);
    const kx = o.kXusPct != null && o.kXusPct !== '' ? o.kXusPct / 100 : K_XUS[input.manba];

    // --- yuklamalar
    const loads = {};
    PST.forEach((p) => {
      const d = input.pst[p];
      const tg = tgOf(d.cos);
      loads[p] = {
        name: p, P: d.P, kat: d.kat, cos: d.cos, W: d.W, tg,
        Q: d.P * tg, S: d.P / d.cos,
        Tm: d.W * 1000 / d.P,
        n: d.kat === 1 ? 2 : (d.kat === 2 ? o.lineKat2 : 1)
      };
    });
    const sumP = sum(PST, (p) => loads[p].P);
    const sumQ = sum(PST, (p) => loads[p].Q);
    const sumW = sum(PST, (p) => loads[p].W);
    const P_st = sum(gens, (g) => g);
    const Pg_max = Math.max(...gens);

    // =========== 1-bosqich: aktiv quvvat balansi (qo'llanma 3.2)
    const P_xus = P_st * kx;
    const dP_tar = sumP * o.dPtarPct / 100;
    const P_rez = P_st - (sumP + P_xus + dP_tar);

    // HL-6 rejimlari (taxminiy — faqat kuchlanishni tanlash uchun)
    const f = o.minLoadFactor;
    const hl6Modes = { max: P_rez, min: P_st - P_xus - sumP * f - dP_tar * f * f };

    // =========== 2-bosqich: nominal kuchlanish (qo'llanma 5.1; formula bir zanjir uchun)
    const voltage = LINES.map((l) => {
      const L = input.lengths[l.id];
      const n = l.pst ? loads[l.pst].n : 2;
      const Ptot = l.pst ? loads[l.pst].P : Math.max(Math.abs(hl6Modes.max), Math.abs(hl6Modes.min));
      const P = Ptot / n;
      const Uh = 4.34 * Math.sqrt(L + 0.016 * P * 1e3);
      return { id: l.id, pst: l.pst, l: L, n, Ptot, P, Uh, Ustd: nearestStd(Uh) };
    });
    const U_rec = Math.max(...voltage.map((v) => v.Ustd));
    const U = Uforce || (input.U === 'auto' ? U_rec : Number(input.U));
    currentU = U;

    // 1-bosqich davomi: reaktiv quvvat balansi (qo'llanma 3.3)
    const nOf = (l) => (l.pst ? loads[l.pst].n : 2);
    const sumLn = sum(LINES, (l) => input.lengths[l.id] * nOf(l));
    const qkm = Q_ZAR_KM[U];
    const Q_gen = P_st * tgM;
    const Q_xus = P_xus * tgM;
    const dQ_pul = sumP * o.dQpulPct / 100;
    const dQ_M = 3 * dP_tar;
    const dQ_tar = dQ_pul + dQ_M;
    const Q_zar = qkm * sumLn;
    const Q_rez = Q_gen + Q_zar - sumQ - Q_xus - dQ_tar;
    const bkUnit = data.regulation.kondensator_batareyalari.filter((b) => b.Un_kV === 10).sort((a, b) => b.Q_MVAr - a.Q_MVAr)[0]
      || data.regulation.kondensator_batareyalari[0];
    const distribute = (Qtot) => {
      const out = {};
      PST.forEach((p) => { out[p] = Qtot * loads[p].Q / sumQ; });
      return out;
    };
    const comp1 = Q_rez < 0 ? distribute(-Q_rez) : null;
    const balance = {
      kx, sumP, sumQ, sumW, P_st, P_xus, dP_tar, P_rez,
      Q_xus, dQ_pul, dQ_M, dQ_tar, Q_zar, qkm, sumLn, Q_gen, Q_rez, tgM, cosM,
      compensation: comp1 ? { Qdef: -Q_rez, unit: bkUnit, perPst: PST.map((p) => ({ pst: p, Qk: comp1[p], count: Math.ceil(comp1[p] / bkUnit.Q_MVAr) })) } : null,
      hl6Modes
    };

    // =========== 3-bosqich: simlar (qo'llanma 5.2)
    const makeLine = (l, modes) => {
      const L = input.lengths[l.id];
      let P, Q, S, cos, n, Tm;
      if (l.pst) {
        const ld = loads[l.pst];
        P = ld.P; Q = ld.Q; S = ld.S; cos = ld.cos; n = ld.n; Tm = ld.Tm;
      } else {
        // bog'lovchi liniya: kesim maksimal rejim bo'yicha, T = 5000 soat
        n = 2; Tm = o.tieTm;
        S = modes.Smax; P = modes.Pmax; Q = modes.Qmax; cos = S > 0 ? Math.abs(P) / S : 1;
      }
      const I_max = S * 1000 / (SQ3 * U * n);
      let I_heat;
      if (l.pst) I_heat = n === 2 ? S * 1000 / (SQ3 * U) : I_max;
      // HL-6: maksimal rejimda bitta zanjir o'chganda; minimal va avariya (generator o'chgan) rejimlarida ikki zanjir bilan
      else I_heat = Math.max(modes.Smax * 1000 / (SQ3 * U), Math.max(modes.Smin, modes.Sav) * 1000 / (SQ3 * U * 2));
      const j = economicDensity(Tm, data);
      const row = { id: l.id, pst: l.pst, l: L, P, Q, S, cos, n, Tm, j, I_max, I_heat, modes: modes || null };
      const sel = selectWire(row, U, data);
      const w = sel.wire;
      Object.assign(row, {
        F_calc: sel.F_calc, econ: sel.econ.marka, increasedForHeating: sel.increasedForHeating, minF: sel.minF,
        wire: w,
        R: w.r0 * L / n, X: w.x0 * L / n, B: w.b0 * L * n, Qc: w.q0 * L * n,
        R1: w.r0 * L, X1: w.x0 * L, Qc1: w.q0 * L,
        heatOk: I_heat <= w.Iruh
      });
      return row;
    };
    const lines = LINES.filter((l) => l.pst).map((l) => makeLine(l));
    const lineOf = (pst) => lines.find((x) => x.pst === pst);

    // =========== 4-bosqich: transformatorlar (qo'llanma 5.3)
    const trafos = {};
    PST.forEach((p) => { trafos[p] = selectStepDown(loads[p], o, U, data); });
    const gensUnique = [...new Set(gens)];
    const stepUps = gensUnique.map((pg) => {
      const Sg = pg / cosM;
      return { Pg: pg, Sg, count: gens.filter((g) => g === pg).length, trafo: selectStepUp(Sg, U, data) };
    });

    // =========== 5-bosqich: quvvat isrofi (oxiridan boshiga) + kompensatsiya iteratsiyasi
    const ctx = { U, tgM, kx, stepUps, tgTie };
    const gensAv = gens.slice(); gensAv.splice(gens.indexOf(Pg_max), 1);
    const chainsFor = (factorOf, comp) => {
      const c = {};
      PST.forEach((p) => { c[p] = pstChain(loads[p], trafos[p], lineOf(p), U, factorOf(loads[p]), comp[p]); });
      return c;
    };
    const fMax = () => 1, fMin = () => f, fAv = (ld) => (ld.kat === 1 ? 1 : o.avLoadFactor);

    // qo'llanma 5.6, 27–28-bandlar: HL-6 da cosφ < cosφ_min va reaktiv quvvat sistemadan olinsa —
    // podstansiyalarga kompensatsiya qurilmalari qo'yilib, hisob qaytadan bajariladi
    const comp = {};
    PST.forEach((p) => { comp[p] = comp1 ? comp1[p] : 0; });
    let chains, stMax, compIter = 0;
    for (; compIter < 8; compIter++) {
      chains = chainsFor(fMax, comp);
      stMax = stationSolve(ctx, chains, gens);
      const deficit = -stMax.S6.q - Math.abs(stMax.S6.p) * tgTie;
      if (deficit <= 0.01) break;
      const add = distribute(deficit);
      PST.forEach((p) => { comp[p] = Math.min(loads[p].Q, comp[p] + add[p]); });
    }
    const compTotal = sum(PST, (p) => comp[p]);
    const compensation = compTotal > 0.01 ? {
      total: compTotal, fromBalance: !!comp1, unit: bkUnit,
      perPst: PST.map((p) => ({ pst: p, Qk: comp[p], count: Math.ceil(comp[p] / bkUnit.Q_MVAr - 1e-9) }))
    } : null;

    const chainsMin = chainsFor(fMin, comp);
    const chainsAv = chainsFor(fAv, comp);
    const station = {
      max: stMax,
      min: stationSolve(ctx, chainsMin, gens),
      av: stationSolve(ctx, chainsAv, gensAv)
    };
    // HL-6 simi — Kirxgof bo'yicha aniqlangan haqiqiy oqimlardan (3-bosqich davomi)
    const hl6 = makeLine(LINES[5], {
      Smax: station.max.S6.s, Pmax: station.max.S6.p, Qmax: station.max.S6.q,
      Smin: station.min.S6.s, Sav: station.av.S6.s
    });
    lines.push(hl6);
    Object.values(station).forEach((s) => addHl6Losses(s, hl6, U));
    const hl6Check = ['max', 'min', 'av'].map((m) => {
      const s = station[m];
      const oneOff = m === 'max';
      const Iworst = oneOff ? s.I6_one : s.I6_norm;
      return { mode: m, P: s.S6.p, Q: s.S6.q, S: s.S6.s, cos6: s.cos6, I_norm: s.I6_norm, I_one: s.I6_one, oneOff, Iworst, ok: Iworst <= hl6.wire.Iruh };
    });

    const lossTotals = (() => {
      let dPl = 0, dQl = 0, dPt = 0, dQt = 0;
      PST.forEach((p) => {
        const c = chains[p];
        dPl += c.dPl; dQl += c.dQl; dPt += c.dPt + c.dPx; dQt += c.dQt + c.dQx;
      });
      const m = station.max;
      dPl += m.dP6; dQl += m.dQ6; dPt += m.dPup; dQt += m.dQup;
      return { dPl, dQl, dPt, dQt, dP: dPl + dPt, dQ: dQl + dQt, pct: (dPl + dPt) / sumP * 100 };
    })();
    // uzatish FIK: iste'molchilarga + sistemaga yetkazilgan / stansiyadan (xususiy ehtiyojdan keyin) + sistemadan olingan
    const efficiency = (() => {
      const m = station.max;
      const Psys = m.Ssys.p;
      const delivered = sumP + Math.max(Psys, 0);
      const sent = m.Pg - m.P_xus + Math.max(-m.S6.p, 0);
      return { delivered, sent, eta: delivered / sent * 100 };
    })();

    // =========== 6-bosqich: yillik energiya isrofi (qo'llanma 5.7)
    const energy = { rows: [] };
    PST.forEach((p) => {
      const ld = loads[p], c = chains[p], tr = trafos[p], ln = lineOf(p);
      const cosL = c.S3.s > 0 ? c.S3.p / c.S3.s : ld.cos;
      const tl = tauLookup(ld.Tm, cosL, data);
      energy.rows.push({ el: ln.id, kind: 'line', Tm: ld.Tm, cos: cosL, tau: tl.tau, tauMethod: tl.method, dP: c.dPl, dPx: 0, dW: c.dPl * tl.tau });
      const cosT = c.Syuk.s > 0 ? c.Syuk.p / c.Syuk.s : ld.cos;
      const tt = tauLookup(ld.Tm, cosT, data);
      energy.rows.push({
        el: `T-${p} (${tr.n}×${tr.marka})`, kind: 'trafo', Tm: ld.Tm, cos: cosT, tau: tt.tau, tauMethod: tt.method,
        dP: c.dPt, dPx: c.dPx, dW: c.dPt * tt.tau + c.dPx * 8760
      });
    });
    {
      const m = station.max;
      const t6 = tauLookup(o.tieTm, m.cos6, data);
      energy.rows.push({ el: 'HL-6', kind: 'line', Tm: o.tieTm, cos: m.cos6, tau: t6.tau, tauMethod: t6.method, dP: m.dP6, dPx: 0, dW: m.dP6 * t6.tau });
      const tg = tauLookup(o.tieTm, m.cosGen, data);
      const dPload = sum(m.ups, (u) => u.dPload);
      const dPx = sum(m.ups, (u) => u.trafo.dPpul / 1000);
      energy.rows.push({
        el: `Ko'taruvchi T (${stepUps.map((s) => s.count + '×' + s.trafo.marka).join(' + ')})`, kind: 'trafo',
        Tm: o.tieTm, cos: m.cosGen, tau: tg.tau, tauMethod: tg.method, dP: dPload, dPx, dW: dPload * tg.tau + dPx * 8760
      });
    }
    energy.dWlines = sum(energy.rows.filter((r) => r.kind === 'line'), (r) => r.dW);
    energy.dWtrafo = sum(energy.rows.filter((r) => r.kind === 'trafo'), (r) => r.dW);
    energy.dW = energy.dWlines + energy.dWtrafo;
    energy.Tst = o.tieTm;
    energy.Wst = P_st * o.tieTm;           // qo'llanma: W_DIES = P_max·T, T = 5000 soat
    energy.pct = energy.dW / energy.Wst * 100;
    energy.Wyuk = sumW * 1000;
    energy.pctYuk = energy.dW / energy.Wyuk * 100;

    // =========== 7-bosqich: kuchlanish yo'qotilishi va RPN (qo'llanma 7.2–7.3)
    const Ubus = o.uBusCoef * U;
    // ko'taruvchi transformatorlar: generator kuchlanishi va ПБВ shahobchasi (±2×2.5%)
    const m = station.max;
    const stepUpVolt = stepUps.map((su) => {
      const u = m.ups.find((x) => x.Pg === su.Pg);
      const t = su.trafo;
      const p = u.p, q = u.q;
      const dU = (p * t.Rt + q * t.Xt) / Ubus;
      const Ug_ref = Ubus + dU;
      const UnG = pickUnPK(t.UnPK);
      const opts = [-5, -2.5, 0, 2.5, 5].map((pct) => {
        const Uotv = t.UnYuK * (1 + pct / 100);
        return { pct, Uotv, Ug: Ug_ref * UnG / Uotv };
      });
      const best = opts.reduce((b, x) => (Math.abs(x.Ug - UnG) < Math.abs(b.Ug - UnG) ? x : b), opts[0]);
      return { Pg: su.Pg, marka: t.marka, Rt: t.Rt, Xt: t.Xt, p, q, dU, Ug_ref, UnG, UnYuK: t.UnYuK, tap: best, ok: Math.abs(best.Ug - UnG) / UnG <= 0.05 };
    });
    const taps = (data.regulation.RPN_shahobchalari[TAP_KEY[U]] || []).map((t) => t['pogona_%']);
    const sks = data.regulation.sinxron_kompensatorlar.slice().sort((a, b) => a.Q_MVAr - b.Q_MVAr);
    const volt = PST.map((p) => {
      const c = chains[p], tr = trafos[p], ln = lineOf(p);
      const dUl = (c.S3.p * ln.R + c.S3.q * ln.X) / Ubus;
      const Uend = Ubus - dUl;
      const Pp = c.Syuk.p + c.dPt, Qp = c.Syuk.q + c.dQt;
      const dUt = (Pp * c.Rt + Qp * c.Xt) / Uend;
      const Uref = Uend - dUt;                        // PK kuchlanishi, YuK tarafiga keltirilgan
      const UnPK = pickUnPK(tr.UnPK);
      const Unet = UnPK >= 9 ? 10 : 6;
      const Udes = 1.05 * Unet;                      // qo'llanma 7.3.а: PK da 10.5 kV
      const lo = 0.95 * Udes, hi = 1.05 * Udes;
      const U0 = Uref * UnPK / tr.UnYuK;
      const options = taps.map((pct) => {
        const Uotv = tr.UnYuK * (1 + pct / 100);
        return { pct, Uotv, Kt: Uotv / UnPK, Upk: Uref * UnPK / Uotv };
      });
      const best = options.reduce((b, x) => (Math.abs(x.Upk - Udes) < Math.abs(b.Upk - Udes) ? x : b), options[0] || { pct: 0, Uotv: tr.UnYuK, Kt: tr.UnYuK / UnPK, Upk: U0 });
      const needRPN = U0 < lo || U0 > hi;
      const ok = best.Upk >= lo - 1e-9 && best.Upk <= hi + 1e-9;
      let comp = null;
      if (!ok && best.Upk < lo) {
        // qo'llanma 7.3.б: RPN yetmasa — PK tomonida sinxron kompensator yoki BK
        const Uref_req = Udes * best.Uotv / UnPK;
        const dUreq = Uref_req - Uref;
        const Xsum = ln.X + c.Xt;
        const Qk = dUreq * Uend / Xsum;
        const sk = sks.find((s) => s.Q_MVAr >= Qk);
        if (Qk > 20 && sk) comp = { type: 'SK', Qk, device: sk, count: 1 };
        else comp = { type: 'BK', Qk, device: bkUnit, count: Math.ceil(Qk / bkUnit.Q_MVAr) };
      }
      return {
        pst: p, line: ln.id, Ubus, P3: c.S3.p, Q3: c.S3.q, R: ln.R, X: ln.X, dUl, Uend,
        Pp, Qp, Rt: c.Rt, Xt: c.Xt, dUt, Uref, UnPK, UnYuK: tr.UnYuK, Udes, lo, hi,
        U0, needRPN, tap: best, ok, comp,
        dUpct: (Ubus - Uref) / U * 100
      };
    });
    const dU6 = (m.Sp.p * hl6.R + m.Sp.q * hl6.X) / Ubus;
    const voltHL6 = { Ubus, P: m.Sp.p, Q: m.Sp.q, dU: dU6, Usys: Ubus - dU6 };

    return {
      input: JSON.parse(JSON.stringify(input)), opts: o,
      U, U_rec, loads, balance, voltage, lines, trafos, stepUps,
      chains, chainsMin, chainsAv, station, hl6Check, lossTotals, efficiency, energy,
      compensation, compIter,
      volt, voltHL6, stepUpVolt, P_st, gens
    };
  }

  // ---------------------------------------------------------------- formatlash
  const fmt = {
    n(x, d = 2) {
      if (x == null || isNaN(x)) return '—';
      const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x;
      return v.toFixed(d);
    },
    i(x) { return fmt.n(x, 0); },
    c(p, q, d = 2) {
      if (q == null) { q = p.q; p = p.p; }
      return `${fmt.n(p, d)} ${q < 0 ? '−' : '+'} j${fmt.n(Math.abs(q), d)}`;
    },
    kat(k) { return ['', 'I', 'II', 'III'][k] || k; }
  };

  return {
    PST, LINES, STD_U, K_XUS, DEFAULT_OPTS, CalcError,
    parseGenerators, tgOf, tauLookup, economicDensity, wireCatalog, trafoCatalog,
    selectStepDown, selectStepUp, trafoRule, pickUnPK, calculate, fmt
  };
});
