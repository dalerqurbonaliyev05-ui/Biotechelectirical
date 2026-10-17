// Kunlik yuklama profillari, tarif, yillik hisob va energiya tejash takliflari. DOM ga tegmaydi.
import { tanOf, capacitorQc } from './electrical.js';
import { processAnnualSaving, vfdCapex, annualSaving, etaEffective, motorEta, motorPrice, capacitorCapex, roundUpToStep, tariff } from './economics.js';
import { getNp } from './world.js';

export function tariffMult(h, cfg) {
  const z = cfg.economy.tariffZones.find((x) => h >= x.from && h < x.to);
  return z ? z.mult : 1;
}

export function profileSet(energy, variantId) {
  const v = energy.variants[variantId] || energy.variants.weld_peak;
  return { ...energy.profiles, ...(v.profiles || {}) };
}

/** Joriy zavod holatiga asoslangan sutkalik kW profillari */
export function baseProfile(world, plant, energy, variantId = 'weld_peak') {
  const prof = profileSet(energy, variantId);
  const byWs = {};
  const total = new Array(24).fill(0);
  for (const ws of Object.keys(prof)) {
    const P = plant.ws[ws]?.P ?? 0;
    byWs[ws] = prof[ws].map((f) => f * P);
    for (let h = 0; h < 24; h++) total[h] += byWs[ws][h];
  }
  const Pmax = Math.max(...total);
  const thr = (energy.peakThreshold ?? 0.9) * Pmax;
  const peakHours = total.map((p, h) => (p >= thr ? h : -1)).filter((h) => h >= 0);
  return { byWs, total, Pmax, peakHours };
}

/** Yillik hisob (so'm) — zonali tarif va cosφ jarimasi bilan */
export function billOf(totalProfile, cos, cfg) {
  const eco = cfg.economy;
  let kwh = 0, cost = 0;
  for (let h = 0; h < 24; h++) {
    kwh += totalProfile[h] * eco.workDays;
    cost += totalProfile[h] * eco.workDays * tariffMult(h, cfg) * eco.TARIF_SOM_KWH;
  }
  const pf = 1 + eco.penaltyPerCosPoint * Math.max(0, cfg.limits.cosphiTarget - cos);
  return { kwh, base: cost, penaltyFactor: pf, total: cost * pf };
}

function ie3Candidates(world) {
  const cfg = world.cfg;
  const out = [];
  for (const id of Object.keys(world.defs)) {
    const d = world.defs[id];
    if (d.type !== 'motor') continue;
    const st = world.dyn.st[id];
    const np = getNp(d, st);
    if (np.effClass !== 'IE1') continue;
    const etaNew = motorEta(cfg, np.P, 'IE3');
    const hours = d.typical.hours ?? cfg.economy.annualHoursDefault;
    const saving = annualSaving(np.P, etaEffective(np, cfg), etaNew, hours, cfg, st.load);
    const capex = motorPrice(cfg, np.P, 'IE3') + cfg.economy.installFixed;
    out.push({ id, saving, capex, kwh: saving / tariff(cfg) });
  }
  return out;
}

function vfdCandidates(world) {
  const cfg = world.cfg;
  const out = [];
  for (const id of Object.keys(world.defs)) {
    const d = world.defs[id];
    const st = world.dyn.st[id];
    const process = st.process ?? d.process;
    if (d.type !== 'motor' || !process) continue;
    const np = getNp(d, st);
    const saving = processAnnualSaving('vfd', np, d.typical.load, process, cfg);
    out.push({ id, saving, capex: vfdCapex(np, cfg) + (st.vfd ? 0 : 0), kwh: saving / tariff(cfg), installed: !!st.vfd });
  }
  return out.filter((c) => !c.installed);
}

/**
 * Takliflar to'plamini baholash (ketma-ket qo'llanadi). ids: ['cap_bank','vfd',...]
 * Qaytaradi: {profile, cos, bill, bill0, capex, opex, annualSaving, annualNet, paybackYears, items}
 */
export function evaluatePortfolio(world, plant, energy, variantId, ids) {
  const cfg = world.cfg;
  const eco = cfg.economy;
  const days = eco.workDays;
  const set = new Set(ids);
  const base = baseProfile(world, plant, energy, variantId);
  const cos0 = plant.total.cos;
  const bill0 = billOf(base.total, cos0, cfg);
  const profile = base.total.slice();
  const shape = base.total.map((p) => p / base.Pmax);
  const shapeSum = shape.reduce((s, x) => s + x, 0);
  let capex = 0, opex = 0;
  const items = {};
  const spread = (kwhYear) => {
    for (let h = 0; h < 24; h++) profile[h] = Math.max(0, profile[h] - ((kwhYear / days) * shape[h]) / shapeSum);
  };
  const prop = (id) => energy.proposals.find((p) => p.id === id);

  if (set.has('idle_off')) {
    const p = prop('idle_off');
    const kw = energy.variants[variantId]?.idleKw ?? 12;
    for (const h of p.hours) profile[h] = Math.max(0, profile[h] - kw);
    capex += p.capex;
    items.idle_off = { capex: p.capex, kw };
  }
  if (set.has('ie3_swap')) {
    const cands = ie3Candidates(world);
    const c = cands.reduce((a, x) => ({ saving: a.saving + x.saving, capex: a.capex + x.capex, kwh: a.kwh + x.kwh }), { saving: 0, capex: 0, kwh: 0 });
    spread(c.kwh);
    capex += c.capex;
    items.ie3_swap = { capex: c.capex, count: cands.length, ids: cands.map((x) => x.id) };
  }
  if (set.has('vfd')) {
    const cands = vfdCandidates(world).filter((c) => c.saving > 0);
    const c = cands.reduce((a, x) => ({ saving: a.saving + x.saving, capex: a.capex + x.capex, kwh: a.kwh + x.kwh }), { saving: 0, capex: 0, kwh: 0 });
    spread(c.kwh);
    capex += c.capex;
    items.vfd = { capex: c.capex, count: cands.length, ids: cands.map((x) => x.id) };
  }
  if (set.has('shift_load')) {
    const p = prop('shift_load');
    const src = base.byWs[p.ws];
    let moved = 0;
    for (const h of p.fromHours) {
      const m = p.fraction * src[h];
      profile[h] -= m;
      moved += m;
    }
    for (const h of p.toHours) profile[h] += moved / p.toHours.length;
    opex += p.nightOpexSom;
    items.shift_load = { capex: 0, opex: p.nightOpexSom, movedKw: moved };
  }
  let cosFinal = cos0;
  if (set.has('cap_bank')) {
    const target = eco.capacitor.target;
    if (cos0 < target) {
      const Pm = Math.max(...profile);
      const kvar = roundUpToStep(capacitorQc(Pm, cos0, target), cfg);
      const c = capacitorCapex(kvar, cfg);
      capex += c;
      cosFinal = target;
      items.cap_bank = { capex: c, kvar };
    } else items.cap_bank = { capex: 0, kvar: 0 };
  }
  const bill = billOf(profile, cosFinal, cfg);
  const annualSavingSom = bill0.total - bill.total;
  const annualNet = annualSavingSom - opex;
  return {
    profile, base, cos: cosFinal, bill, bill0, capex, opex, annualSaving: annualSavingSom, annualNet,
    paybackYears: annualNet > 0 ? capex / annualNet : Infinity, items,
    peakKw: Math.max(...profile), peakKwBase: base.Pmax
  };
}

/** Byudjet doirasidagi eng yaxshi to'plam (5 yillik sof foyda bo'yicha) */
export function bestPortfolio(world, plant, energy, variantId, budget) {
  const ids = energy.proposals.map((p) => p.id);
  const H = world.cfg.economy.horizonYears;
  let best = { ids: [], net: 0, ev: null };
  const results = [];
  for (let mask = 0; mask < 1 << ids.length; mask++) {
    const sel = ids.filter((_, i) => mask & (1 << i));
    const ev = evaluatePortfolio(world, plant, energy, variantId, sel);
    const net = H * ev.annualNet - ev.capex;
    const ok = ev.capex <= budget;
    results.push({ ids: sel, net, capex: ev.capex, ok });
    if (ok && net > best.net) best = { ids: sel, net, ev };
  }
  return { best, results };
}

/** E2: bitta transformator ta'mirga chiqqanda ikkinchisi — oyna ichidagi eng katta K */
export function outageCheck(world, plant, energy, windowId, measureIds = []) {
  const cfg = world.cfg;
  const w = energy.e2.windows[windowId];
  const base = baseProfile(world, plant, energy, 'weld_peak');
  const sel = energy.e2.measures.filter((m) => measureIds.includes(m.id));
  let cos = plant.total.cos;
  let cost = 0;
  for (const m of sel) {
    cost += m.costSom;
    if (m.cosTo) cos = Math.max(cos, m.cosTo);
  }
  let peakS = 0, peakH = w.from;
  for (let h = w.from; h < w.to; h++) {
    let P = 0;
    for (const ws of Object.keys(base.byWs)) {
      let p = base.byWs[ws][h];
      for (const m of sel) if (m.kw?.[ws]) p = Math.max(0, p - m.kw[ws]);
      P += p;
    }
    const S = P / cos;
    if (S > peakS) { peakS = S; peakH = h; }
  }
  const sNom = cfg.transformers.TM1.sNom;
  return { K: peakS / sNom, S: peakS, peakHour: peakH, cos, cost, window: w };
}

export function minimalOutagePlan(world, plant, energy, windowId) {
  const ms = energy.e2.measures;
  const L = world.cfg.limits;
  let best = null;
  for (let mask = 0; mask < 1 << ms.length; mask++) {
    const ids = ms.filter((_, i) => mask & (1 << i)).map((m) => m.id);
    const r = outageCheck(world, plant, energy, windowId, ids);
    if (r.K <= L.trPlanK && (!best || r.cost < best.cost)) best = { ids, ...r };
  }
  return best; // null — hech qanday to'plam yetmaydi
}

export { tanOf };
