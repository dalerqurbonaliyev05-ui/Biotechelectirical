// Iqtisodiy hisob-kitoblar (ta'mir / almashtirish / energiya tejash). Barcha narxlar namunaviy (config.json).
import { clamp } from '../util.js';

export const tariff = (cfg) => cfg.economy.TARIF_SOM_KWH;

export function annualHours(def, cfg) {
  return def.typical?.hours ?? cfg.economy.annualHoursDefault;
}

/** Qayta o'rash FIK ni pasaytiradi: η_eff = η − Δ·rewinds */
export function etaEffective(np, cfg) {
  return np.eta - cfg.economy.etaLossPerRewind * (np.rewinds || 0);
}

/** Yillik energiya xarajati (so'm): Pval/η·soat·tarif */
export function annualEnergyCost(Pshaft_kW, eta, hours, cfg) {
  return (Pshaft_kW / eta) * hours * tariff(cfg);
}

/** Yillik tejash: P_nom·L·(1/η_eski − 1/η_yangi)·soat·tarif */
export function annualSaving(Pnom, etaOld, etaNew, hours, cfg, L = 1) {
  return Pnom * L * (1 / etaOld - 1 / etaNew) * hours * tariff(cfg);
}

/** O'zini qoplash (yil): (yangi_narx − ta'mir_narxi) / yillik_tejash */
export function paybackYears(newPrice, repairCost, saving) {
  const extra = newPrice - repairCost;
  if (extra <= 0) return 0;
  return saving > 0 ? extra / saving : Infinity;
}

export const downtimeLoss = (hours, lossPerHour) => hours * lossPerHour;

// ---------- Dvigatel katalogi ----------

function tableRow(cfg, P) {
  const rows = cfg.economy.motorTable.rows;
  return rows.find((r) => r.P === P) || rows.find((r) => r.P >= P) || rows[rows.length - 1];
}

export function motorPrice(cfg, P, cls = 'IE2') {
  const r = tableRow(cfg, P);
  return cls === 'IE3' ? Math.round(r.price2 * cfg.economy.motorTable.ie3PriceFactor) : r.price2;
}

export function motorEta(cfg, P, cls = 'IE2') {
  const r = tableRow(cfg, P);
  return cls === 'IE3' ? r.eta3 : r.eta2;
}

/**
 * Almashtirish uchun dvigatellar katalogi: shu quvvat va keyingi quvvat (IE2/IE3, 4 qutb) + ikkita «tuzoq»
 * (kichik quvvat, 2 qutbli — noto'g'ri tezlik).
 */
export function replacementCatalog(np, cfg, spare) {
  const rows = cfg.economy.motorTable.rows;
  const idx = Math.max(0, rows.findIndex((r) => r.P >= np.P));
  const same = rows[idx];
  const next = rows[Math.min(idx + 1, rows.length - 1)];
  const prev = rows[Math.max(idx - 1, 0)];
  const out = [];
  const mk = (row, cls, poles) => {
    const rpm = poles === 2 ? 2950 : poles === 6 ? 980 : 1475;
    const eta = cls === 'IE3' ? row.eta3 : row.eta2;
    const price = cls === 'IE3' ? Math.round(row.price2 * cfg.economy.motorTable.ie3PriceFactor) : row.price2;
    const inStock = !!spare && row.P === same.P && cls === 'IE2' && poles === 4;
    return { id: `${row.P}_${cls}_${poles}`, P: row.P, cls, poles, rpm, eta, price, inStock, leadDays: inStock ? 0 : cfg.economy.replaceLeadDays };
  };
  for (const row of same === next ? [same] : [same, next]) for (const cls of ['IE2', 'IE3']) out.push(mk(row, cls, 4));
  if (prev !== same) out.push(mk(prev, 'IE3', 4));
  out.push(mk(same, 'IE3', 2));
  return out;
}

/** Almashtirishga yaroqlilik: tezlik va quvvat */
export function checkReplacement(row, np, requiredShaftKW) {
  if (row.poles !== (np.poles || 4)) return { ok: false, reason: 'speed' };
  if (row.P < Math.max(np.P, requiredShaftKW) - 1e-9) return { ok: false, reason: 'power' };
  return { ok: true };
}

export function replaceDowntimeHours(row, cfg) {
  return row.inStock ? cfg.economy.replaceStockHours : row.leadDays * cfg.economy.hoursPerWorkDay;
}

// ---------- Xarajat spetsifikatsiyasi ----------

/** cost: {fixed} | {fracNew} | {perMeter, section} | {vfd} | {perMoved} */
export function actionCost(cost, { np, cfg, cableLength = 0, moved = 0 }) {
  if (!cost) return 0;
  if (cost.fixed != null) return cost.fixed;
  if (cost.fracNew != null) return Math.round(cost.fracNew * motorPrice(cfg, np.P, 'IE2'));
  if (cost.perMeter != null) {
    const pm = cfg.economy.cable.perMeter[String(cost.section)] ?? cost.perMeter;
    return Math.round(pm * (cost.length ?? cableLength));
  }
  if (cost.vfd) return Math.round(cfg.economy.vfd.perKw * np.P + cfg.economy.vfd.fixed);
  if (cost.perMoved != null) return cost.perMoved * moved;
  return 0;
}

// ---------- Variantlarni solishtirish ----------

/**
 * «Xarajat» rejimi (nosozlikni bartaraf etish): variantlarning TCO si.
 * items: [{id, valid, capex, downtimeLoss, energyYear}]
 * TCO = capex + to'xtash + H·(energiya − eng_yaxshi_energiya)
 */
export function evaluateCostOptions(items, cfg) {
  const H = cfg.economy.horizonYears;
  const valid = items.filter((i) => i.valid);
  const bestE = valid.length ? Math.min(...valid.map((i) => i.energyYear ?? 0)) : 0;
  const withTco = items.map((i) => ({ ...i, tco: i.capex + i.downtimeLoss + H * ((i.energyYear ?? 0) - bestE) }));
  const best = withTco.filter((i) => i.valid).reduce((m, i) => (m == null || i.tco < m.tco ? i : m), null);
  return withTco.map((i) => {
    let quality = 0;
    if (i.valid && best) {
      const ex = (i.tco - best.tco) / Math.max(best.tco, cfg.economy.costFloorSom);
      quality = i.tco <= best.tco + 1e-6 ? 1 : clamp(1 - ex, cfg.economy.qualityFloor, 1);
    }
    return { ...i, quality, isBest: !!best && i.id === best.id };
  });
}

/**
 * «Foyda» rejimi (energiya tejash): net = H·yillik_tejash − capex − to'xtash.
 * items: [{id, valid, capex, downtimeLoss, annualSaving, isNoop}]
 * Hech narsa qilmaslik (isNoop) net = 0. Eng yaxshi variantga nisbat.
 */
export function evaluateBenefitOptions(items, cfg) {
  const H = cfg.economy.horizonYears;
  const withNet = items.map((i) => ({ ...i, net: i.isNoop ? 0 : H * (i.annualSaving || 0) - i.capex - (i.downtimeLoss || 0) }));
  const bestNet = Math.max(0, ...withNet.filter((i) => i.valid).map((i) => i.net));
  return withNet.map((i) => {
    let quality = 0;
    if (i.valid) {
      if (bestNet <= 0) quality = i.isNoop ? 1 : 0;
      else if (i.isNoop) quality = 0;
      else if (i.net <= 0) quality = 0;
      else quality = clamp(i.net / bestNet, 0.3, 1);
    }
    return { ...i, quality, paybackYears: i.isNoop || !(i.annualSaving > 0) ? Infinity : i.capex / i.annualSaving, isBest: !!(bestNet > 0 ? i.net === bestNet : i.isNoop) };
  });
}

// ---------- Nasos va ventilyator (VFD / taymer / kurak kesish) ----------

/** Nasos kirish quvvati (nominal oqimda) nisbatan: drossel va VFD */
export function pumpFractionThrottle(q, cfg) {
  const m = cfg.economy.pumpModel;
  return m.throttleBase + m.throttleSlope * q;
}
export function pumpFractionVfd(q, cfg) {
  const s = cfg.economy.pumpModel.vfdStatic;
  return s * q + (1 - s) * q ** 3;
}

/** Nasos VFD tejashi (kW) berilgan oqimda */
export function pumpVfdSavingKw(np, q, cfg) {
  const Pfull = np.P / np.eta;
  const loss = cfg.economy.fanModel.vfdFixedLoss;
  return Math.max(0, Pfull * (pumpFractionThrottle(q, cfg) - pumpFractionVfd(q, cfg) - loss));
}

/** Ventilyator: doimiy tezlikdagi quvvat (kW) */
export function fanBaseKw(np, load) {
  return (np.P * load) / np.eta;
}
/** Ventilyator VFD quvvati (kW) berilgan sarfda */
export function fanVfdKw(baseKw, q, cfg) {
  const qm = cfg.economy.vfd.minSpeed;
  return baseKw * (Math.max(q, qm) ** 3 + cfg.economy.fanModel.vfdFixedLoss);
}

/**
 * Yillik tejash (so'm) — process: {kind:'pump'|'fan', segments:[{h,q}], trimFactor?}
 * mode: 'vfd' | 'timer' | 'trim'
 */
export function processAnnualSaving(mode, np, load, process, cfg) {
  const t = tariff(cfg);
  const segs = process.segments || [{ h: process.hours, q: process.q }];
  let kwh = 0;
  if (process.kind === 'pump') {
    for (const s of segs) {
      const sv = pumpVfdSavingKw(np, s.q, cfg);
      if (mode === 'vfd') kwh += sv * s.h;
      else if (mode === 'trim') kwh += (process.trimFactor ?? 0.55) * sv * s.h;
      // timer nasosda ishlatilmaydi
    }
  } else {
    const base = fanBaseKw(np, load);
    for (const s of segs) {
      if (mode === 'vfd') kwh += Math.max(0, base - fanVfdKw(base, s.q, cfg)) * s.h;
      else if (mode === 'timer' && s.q <= 0) kwh += base * s.h;
    }
  }
  return kwh * t;
}

export function vfdCapex(np, cfg) {
  return Math.round(cfg.economy.vfd.perKw * np.P + cfg.economy.vfd.fixed);
}

// ---------- Kondensator ----------

export function capacitorCapex(kvar, cfg) {
  const c = cfg.economy.capacitor;
  return Math.round(kvar * c.pricePerKvar + c.install);
}

export function roundUpToStep(kvar, cfg) {
  const step = cfg.economy.capacitor.stepKvar;
  return Math.max(step, Math.ceil(kvar / step - 1e-9) * step);
}
