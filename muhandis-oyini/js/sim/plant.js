// Zavod yuklamasini yig'ish: uskunalar → sex → transformator → umumiy (kW, kVA, cosφ, K, kuchlanishlar).
// Faza toklari skalyar yig'iladi (fazor burchaklarsiz) — soddalashtirilgan.
import { SQRT3, motorPQ, tanOf, cableDropPct, cosFromPQ, busVoltage, unbalancePct } from './electrical.js';
import { getNp, nomCurrentOf, isPowered, isIsolated, PAIRS, stOf } from './world.js';
import { classifyCaseTemp, classifyVibration, classifyCurrentRatio, classifyUnbalance, classifyBearingTemp, classifyTerminalTemp, worst } from './limits.js';
import { motorSteadyTemps, welderSteadyTemps, cableSteadyTemps, stepTemp, hazardRate } from './thermal.js';
import { cableAmpacity } from './electrical.js';

const LINE_OF = { AB: 0, BC: 1, CA: 2 };
const zero = () => ({ P: 0, Q: 0, S: 0, I: [0, 0, 0], powered: false, Uavg: 0 });
const mean3 = (a) => (a[0] + a[1] + a[2]) / 3;

export function supplyTm(world, ws) {
  const base = world.data.equipment.workshops[ws].tm;
  const other = base === 'TM1' ? 'TM2' : 'TM1';
  if (world.dyn.tm[base].inService) return base;
  if (world.dyn.tie && world.dyn.tm[other].inService) return other;
  return null;
}

/** Bitta uskunaning elektr ko'rsatkichlari berilgan kuchlanishda */
export function eqElectrics(world, id, Uline) {
  const def = world.defs[id];
  const st = world.dyn.st[id];
  const np = getNp(def, st);
  const cfg = world.cfg;
  if (def.type === 'motor') {
    if (!isPowered(world, id) || st.phaseMissing) return { ...zero(), Uavg: mean3(Uline) };
    const { P, Q, S } = motorPQ(np, st.load, cfg.motor);
    const Uavg = mean3(Uline);
    // past kuchlanishda tok biroz oshadi (soddalashtirilgan: (U_nom/U)^0,5)
    const Iavg = ((S * 1000) / (SQRT3 * np.U)) * Math.sqrt(np.U / Uavg);
    const I = st.phaseMult.map((m) => Iavg * m);
    return { P, Q, S, I, Iavg, Uavg, powered: true, rotating: !st.stalled, cos: P / S, Irat: Iavg / nomCurrentOf(def, st) };
  }
  if (def.type === 'welder') {
    if (!isPowered(world, id)) return { ...zero(), Uavg: mean3(Uline) };
    const cos = np.cosphi;
    const S = (st.P / cos) * st.faulty;
    const P = st.P * (1 + 0.3 * (st.faulty - 1));
    const Q = Math.sqrt(Math.max(0, S * S - P * P));
    const Upair = Uline[LINE_OF[st.pair]];
    const Iline = (S * 1000) / Upair; // bitta apparat liniyalaridagi haqiqiy tok
    const I = [0, 0, 0];
    const [p0, p1] = PAIRS[st.pair];
    // yig'indida o'rtacha uch fazali ekvivalentga mos kelishi uchun √3/2 koeffitsiyenti
    I[p0] = I[p1] = Iline * (SQRT3 / 2);
    return { P, Q, S, I, Iline, Uavg: mean3(Uline), powered: true, rotating: true, cos: P / S, pair: st.pair };
  }
  return { ...zero(), Uavg: mean3(Uline) };
}

function assemble(world, Uline) {
  const { cfg, defs } = world;
  const wsDefs = world.data.equipment.workshops;
  const wsIds = Object.keys(wsDefs);
  const eqOut = {};
  const wsOut = {};

  for (const ws of wsIds) {
    const panelId = wsDefs[ws].panel;
    const panelSt = world.dyn.st[panelId];
    const tm = supplyTm(world, ws);
    const alive = !!tm && !panelSt.isolated && !panelSt.burned;
    let P = 0, Q = 0;
    const I = [0, 0, 0];
    const loads = [];
    for (const id of Object.keys(defs)) {
      const d = defs[id];
      if (d.workshop !== ws || (d.type !== 'motor' && d.type !== 'welder')) continue;
      const e = alive ? eqElectrics(world, id, Uline[id]) : { ...zero(), Uavg: mean3(Uline[id]) };
      eqOut[id] = e;
      loads.push(e);
    }
    const bg = wsDefs[ws].background;
    const bgs = [];
    if (alive && bg.P > 0) bgs.push({ P: bg.P, Q: bg.P * tanOf(bg.cosphi) });
    if (alive && panelSt.extraKW > 0) bgs.push({ P: panelSt.extraKW, Q: panelSt.extraKW * 0.2 });
    for (const l of loads) {
      P += l.P; Q += l.Q;
      for (let k = 0; k < 3; k++) I[k] += l.I[k];
    }
    // fon yuklamalari (uch fazali, simmetrik) — tokni S dan hisoblaymiz
    const U0 = alive ? mean3(Uline[panelId]) : cfg.plant.uNom;
    for (const b of bgs) {
      P += b.P; Q += b.Q;
      const Ib = (Math.hypot(b.P, b.Q) * 1000) / (SQRT3 * U0);
      for (let k = 0; k < 3; k++) I[k] += Ib;
    }

    // kompensatsiya qurilmasi (regulyator)
    let Qc = 0;
    let bank = null;
    for (const id of Object.keys(defs)) {
      const d = defs[id];
      if (d.workshop !== ws || d.type !== 'capbank') continue;
      const st = world.dyn.st[id];
      const np = getNp(d, st);
      let n = 0;
      if (alive && st.installed && st.controller === 'auto' && !st.burned && !isIsolated(world, id)) {
        const need = Math.max(0, Q - P * tanOf(cfg.economy.capacitor.target));
        n = Math.min(st.stagesOk, Math.ceil(need / np.kvarStage - 1e-9));
      }
      Qc += n * np.kvarStage;
      bank = { id, stagesActive: n, kvarActive: n * np.kvarStage, kvarTotal: np.stages * np.kvarStage, stagesOk: st.stagesOk };
      eqOut[id] = { P: 0, Q: -n * np.kvarStage, S: n * np.kvarStage, I: [0, 0, 0], powered: alive && n > 0, Uavg: U0, kvar: n * np.kvarStage };
    }
    const Sbefore = Math.hypot(P, Q);
    const Qafter = Q - Qc;
    const Safter = Math.hypot(P, Qafter);
    const scale = Sbefore > 1e-9 ? Safter / Sbefore : 1;
    const Ia = I.map((x) => x * scale);

    wsOut[ws] = { id: ws, tm, alive, P, Q: Qafter, Qbefore: Q, S: Safter, cos: cosFromPQ(P, Qafter), cosBefore: cosFromPQ(P, Q), I: Ia, Ipre: I.slice(), scale, Iavg: mean3(Ia), bank, panelId };
    wsOut[ws].unbal = unbalancePct(Ia);
  }

  // transformatorlar
  const tmOut = {};
  for (const [tmId, tmCfg] of Object.entries(cfg.transformers)) {
    let P = 0, Q = 0;
    const feeds = [];
    for (const ws of wsIds) if (wsOut[ws].tm === tmId) { P += wsOut[ws].P; Q += wsOut[ws].Q; feeds.push(ws); }
    const S = Math.hypot(P, Q);
    const K = S / tmCfg.sNom;
    tmOut[tmId] = { id: tmId, P, Q, S, K, sNom: tmCfg.sNom, feeds, inService: world.dyn.tm[tmId].inService, cos: cosFromPQ(P, Q), Ubus: busVoltage(K, cfg.plant) };
  }

  // kuchlanishlar
  const nextU = {};
  for (const ws of wsIds) {
    const w = wsOut[ws];
    const panelSt = world.dyn.st[w.panelId];
    const panelDef = defs[w.panelId];
    const np = getNp(panelDef, panelSt);
    const Ubus = w.tm ? tmOut[w.tm].Ubus : 0;
    const skew = panelSt.voltageSkew || [0, 0, 0];
    const busLines = skew.map((s) => Ubus * (1 + s / 100));
    const dropCablePct = cableDropPct(w.Iavg, np.cable.section, np.cable.length, Math.max(w.cos, 0.5), cfg.plant.uNom, cfg.plant);
    const contactV = SQRT3 * w.Iavg * panelSt.contactR;
    const dropFactor = 1 - dropCablePct / 100;
    const schLines = busLines.map((u) => (w.alive ? u * dropFactor - contactV : 0));
    w.Ubus = Ubus;
    w.busLines = busLines;
    w.schLines = schLines;
    w.Usch = mean3(schLines);
    w.dropPct = Ubus > 0 ? ((Ubus - w.Usch) / Ubus) * 100 : 0;
    w.dropCablePct = dropCablePct;
    w.contactV = contactV;
    for (const id of Object.keys(defs)) {
      const d = defs[id];
      if (d.workshop !== ws) continue;
      const e = eqOut[id];
      const Ieq = e ? (e.Iline ?? e.Iavg ?? 0) : 0;
      const cr = world.dyn.st[id].contactR || 0;
      const bf = 1 - cfg.plant.branchDropPct / 100;
      nextU[id] = schLines.map((u) => (w.alive ? Math.max(0, u * bf - SQRT3 * Ieq * cr * (d.type === 'welder' ? 0.6 : 1)) : 0));
      if (!w.alive) nextU[id] = schLines.map(() => 0);
    }
    nextU[w.panelId] = schLines.slice();
  }
  // RU liniyalari va transformatorlar uchun shina kuchlanishi
  for (const id of Object.keys(defs)) {
    const d = defs[id];
    if (d.type === 'ruFeeder') nextU[id] = wsOut[d.serves].busLines.slice();
    if (d.type === 'transformer') {
      const tm = tmOut[d.id === 'tp_tm1' ? 'TM1' : 'TM2'];
      nextU[id] = [tm.Ubus, tm.Ubus, tm.Ubus];
    }
  }
  return { wsOut, tmOut, eqOut, nextU };
}

export function computePlant(world) {
  const U0 = world.cfg.plant.uNom;
  let Uline = {};
  for (const id of Object.keys(world.defs)) Uline[id] = [U0, U0, U0];
  let res = null;
  for (let pass = 0; pass < 3; pass++) {
    res = assemble(world, Uline);
    for (const id of Object.keys(world.defs)) if (res.nextU[id]) Uline[id] = res.nextU[id].map((u) => (u > 0 ? u : u));
    // o'chirilgan yo'llarda 0 qoladi, hisoblash uchun nominal ishlatamiz
    for (const id of Object.keys(Uline)) if (Uline[id].every((u) => u === 0)) Uline[id] = [U0, U0, U0];
  }
  const { wsOut, tmOut, eqOut } = res;
  let P = 0, Q = 0;
  for (const w of Object.values(wsOut)) { P += w.P; Q += w.Q; }
  const S = Math.hypot(P, Q);
  const cos = cosFromPQ(P, Q);
  const L = world.cfg.limits;
  const penaltyFactor = 1 + world.cfg.economy.penaltyPerCosPoint * Math.max(0, L.cosphiTarget - cos);
  // uskunalar uchun yakuniy kuchlanishlar (o'chiq bo'lsa ham hisoblangan qiymat)
  const U = {};
  for (const id of Object.keys(world.defs)) U[id] = res.nextU[id] || [U0, U0, U0];
  return { ws: wsOut, tm: tmOut, eq: eqOut, U, total: { P, Q, S, cos, penaltyFactor } };
}

// ---------- Holat (rangli belgi) ----------

/** 'ok' | 'warn' | 'bad' | 'down' | 'off' */
export function eqStatus(world, plant, id) {
  const def = world.defs[id];
  const st = world.dyn.st[id];
  const L = world.cfg.limits;
  if (st.burned) return 'bad';
  if (isIsolated(world, id)) return 'off';
  if (def.type === 'motor') {
    if (!isPowered(world, id) || st.phaseMissing) return 'down';
    const e = plant.eq[id];
    const s = worst(classifyCaseTemp(st.T.case ?? 40, L), classifyVibration(st.vib, L), classifyCurrentRatio(e.Irat, L), classifyBearingTemp(st.T.bearing ?? 40, L), classifyTerminalTemp(st.T.terminal ?? 40, L));
    return s === 'good' ? 'ok' : s;
  }
  if (def.type === 'welder') {
    if (!isPowered(world, id)) return 'down';
    return classifyCaseTemp(st.T.case ?? 40, L) === 'good' ? 'ok' : classifyCaseTemp(st.T.case, L);
  }
  if (def.type === 'panel') {
    const w = plant.ws[def.workshop];
    const dev = Math.abs((w.Usch / world.cfg.plant.uNom - 1) * 100);
    const s = worst(classifyTerminalTemp(st.T.terminal ?? 40, L), dev <= L.voltageDevWarnPct ? 'good' : dev <= L.voltageDevBadPct ? 'warn' : 'bad', classifyUnbalance(w.unbal, L));
    return s === 'good' ? 'ok' : s;
  }
  if (def.type === 'cable') {
    const s = worst(classifyTerminalTemp(st.T.terminal ?? 40, L), classifyTerminalTemp(st.T.cable ?? 40, L));
    return s === 'good' ? 'ok' : s;
  }
  if (def.type === 'capbank') {
    return st.installed && st.controller === 'auto' && st.stagesOk === (def.typical.stagesOk) ? 'ok' : 'warn';
  }
  return 'ok';
}

export function workshopStatus(world, plant, ws) {
  const order = { ok: 0, off: 0, down: 1, warn: 2, bad: 3 };
  let best = 'ok';
  for (const id of Object.keys(world.defs)) {
    if (world.defs[id].workshop !== ws) continue;
    const s = eqStatus(world, plant, id);
    if (order[s] > order[best]) best = s;
  }
  const w = plant.ws[ws];
  if (w.unbal > world.cfg.limits.unbalanceOkPct && order.warn > order[best]) best = 'warn';
  if (w.cos < 0.8 && order.warn > order[best]) best = 'warn';
  const tm = w.tm ? plant.tm[w.tm] : null;
  if (tm && tm.K > world.cfg.limits.trMaxK && order.warn > order[best]) best = 'warn';
  return best;
}

// ---------- Vaqt bo'yicha qadam ----------

function targetTemps(world, plant, id) {
  const def = world.defs[id];
  const st = world.dyn.st[id];
  const cfg = world.cfg;
  const e = plant.eq[id];
  const powered = isPowered(world, id);
  if (def.type === 'motor') {
    return motorSteadyTemps({ Irat: e?.Irat ?? 0, I: e?.Iavg ?? 0, cooling: st.cooling, heatWinding: st.heatWinding, heatBearing: st.heatBearing, heatTerminal: st.heatTerminal || 0, vib: st.vib, stalled: st.stalled, contactR: st.contactR, powered: powered && !st.phaseMissing }, cfg.plant, cfg.thermal);
  }
  if (def.type === 'welder') {
    return welderSteadyTemps({ S: e?.S ?? 0, Srated: getNp(def, st).S, heatWinding: st.heatWinding, contactR: st.contactR, I: e?.Iline ?? 0, powered }, cfg.plant, cfg.thermal);
  }
  if (def.type === 'cable') {
    const feed = plant.eq[def.feeds];
    const np = getNp(def, st);
    return cableSteadyTemps({ I: feed?.Iline ?? 0, section: np.cable.section, contactR: st.contactR, powered: powered && feed?.powered }, cfg.plant, cfg.thermal);
  }
  if (def.type === 'panel') {
    const w = plant.ws[def.workshop];
    const np = getNp(def, st);
    const r = w.Iavg / cableAmpacity(np.cable.section);
    const amb = cfg.plant.ambientC;
    const cable = amb + Math.min(cfg.thermal.cableDeltaNomC * r * r, 85);
    return { cable, terminal: amb + 6 + Math.min(cfg.thermal.contactHeatCPerW * w.Iavg * w.Iavg * st.contactR, 90) };
  }
  if (def.type === 'capbank') {
    return { case: cfg.plant.ambientC + (plant.eq[id]?.kvar ? 12 : 3) + (st.stagesOk < def.typical.stagesOk ? 20 : 0) };
  }
  if (def.type === 'transformer') {
    const tm = plant.tm[id === 'tp_tm1' ? 'TM1' : 'TM2'];
    return { oil: cfg.plant.ambientC + 22 + 45 * tm.K * tm.K };
  }
  return {};
}

/** Boshlang'ich haroratlarni turg'un holatga keltirish */
export function settleTemps(world, plant = computePlant(world)) {
  for (const id of Object.keys(world.defs)) world.dyn.st[id].T = targetTemps(world, plant, id);
  return plant;
}

/**
 * Dunyoni dtMin daqiqaga oldinga siljitish. Hodisalarni qaytaradi: {type:'burn', id}
 * hazardScale — qiyinlik ko'paytiruvchisi.
 */
export function stepWorld(world, dtMin, hazardScale = 1) {
  const events = [];
  const tau = world.cfg.thermal.tauMin;
  const plant = computePlant(world);
  for (const id of Object.keys(world.defs)) {
    const st = world.dyn.st[id];
    const target = targetTemps(world, plant, id);
    for (const k of Object.keys(target)) st.T[k] = stepTemp(st.T[k] ?? target[k], target[k], dtMin, tau);
    const def = world.defs[id];
    if ((def.type === 'motor' || def.type === 'welder') && !st.burned && isPowered(world, id)) {
      const rate = hazardRate(st.T.case ?? 0, st.hazardPerMin, world.cfg.hazard) * hazardScale;
      if (rate > 0) {
        st.damage = Math.min(1, st.damage + rate * dtMin);
        if (st.damage >= 1) events.push({ type: 'burn', id });
      }
    }
  }
  return { events, plant };
}

/** Sarflangan yo'qotish (so'm/soat) — to'xtab turgan/pasaygan uskunalar bo'yicha */
export function lossRatePerHour(world, plant) {
  const acc = world.cfg.economy.lossAccrual;
  let rate = 0;
  for (const id of Object.keys(world.defs)) {
    const d = world.defs[id];
    if (!d.lossPerHour) continue;
    const s = eqStatus(world, plant, id);
    if (s === 'down' || s === 'off' || world.dyn.st[id].burned) rate += d.lossPerHour * acc.down;
    else if (s === 'bad') rate += d.lossPerHour * acc.degraded;
  }
  return rate;
}

export { stOf };
