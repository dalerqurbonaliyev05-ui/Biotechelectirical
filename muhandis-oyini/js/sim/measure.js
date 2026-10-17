// O'lchov asboblari: uskuna holatidan (sim) o'qishlarni hisoblaydi (±2 % shovqin bilan). DOM ga tegmaydi.
import { hashUnit } from '../util.js';
import { SQRT3, unbalancePct, voltageDevPct } from './electrical.js';
import { getNp, nomCurrentOf, isPowered, isIsolated, isRotating } from './world.js';
import * as Lim from './limits.js';

export const TOOLS = ['clamp', 'clampStart', 'multimeter', 'megger', 'thermal', 'vibration', 'visual', 'analyzer'];

const mean3 = (a) => (a[0] + a[1] + a[2]) / 3;

/** Megger uchun xavfsizlik shartlari: o'chirilgan + blokirovka + kuchlanish yo'qligi tekshirilgan */
export function meggerGate(world, id) {
  const st = world.dyn.st[id];
  const done = st.safety.done;
  const ok = ['disconnect', 'lock', 'verify'].every((s) => done.includes(s));
  if (ok) return { ok: true };
  if (isPowered(world, id) && !st.isolated) return { ok: false, kind: 'live' };
  return { ok: false, kind: 'unverified' };
}

/** Jonli zonada (kuchlanish ostida) o'lchash kerakmi — PPE talab qilinadi */
export function isLiveMeasurement(world, id, tool) {
  if (!['clamp', 'clampStart', 'multimeter'].includes(tool)) return false;
  return !isIsolated(world, id);
}

/**
 * Asbob bilan o'lchash.
 * Qaytaradi: {ok:true, lines:[{k,v,u,st,txt}], notes:[...], effect?} yoki {ok:false, blocked:'live'|'unverified'|'notRotating'|'unsupported'}
 */
export function measure(world, plant, id, tool, { n = 0, tolerance = 0.02 } = {}) {
  const def = world.defs[id];
  const st = world.dyn.st[id];
  if (!def || !def.tools.includes(tool)) return { ok: false, blocked: 'unsupported' };
  const L = world.cfg.limits;
  const seed = world.seed;
  const noise = (k, v, pct = tolerance) => {
    if (typeof v !== 'number' || v === 0) return v;
    return v * (1 + pct * (2 * hashUnit(seed, `${id}:${tool}:${k}:${n}`) - 1));
  };
  const lines = [];
  const notes = [];
  const add = (k, v, u, status = null, extra = {}) => lines.push({ k, v: typeof v === 'number' ? noise(k, v, extra.pct) : v, u, st: status, ...extra });
  const np = getNp(def, st);
  const inom = nomCurrentOf(def, st);
  const e = plant.eq[id];
  const U = plant.U[id] || [world.cfg.plant.uNom, world.cfg.plant.uNom, world.cfg.plant.uNom];
  const powered = isPowered(world, id);
  const w = def.workshop && plant.ws[def.workshop];

  switch (tool) {
    case 'clamp': {
      if (def.type === 'motor') {
        const I = e?.I || [0, 0, 0];
        const Iavg = mean3(I);
        add('I_A', I[0], 'A'); add('I_B', I[1], 'A'); add('I_C', I[2], 'A');
        const ratio = Iavg / inom;
        add('ratio', ratio * 100, '%', Lim.classifyCurrentRatio(ratio, L));
        add('unbal', unbalancePct(I), '%', Iavg > 0 ? Lim.classifyUnbalance(unbalancePct(I), L) : null);
        if (!powered || st.phaseMissing) notes.push('clamp.noCurrent');
      } else if (def.type === 'welder') {
        add('I_line', e?.Iline ?? 0, 'A');
        add('pair', st.pair, '', null);
        if (!powered) notes.push('clamp.noCurrent');
      } else if (def.type === 'cable') {
        const f = plant.eq[def.feeds];
        add('I_line', f?.Iline ?? 0, 'A');
        if (!f?.powered) notes.push('clamp.noCurrent');
      } else if (def.type === 'capbank') {
        const kv = e?.kvar ?? 0;
        const Ic = (kv * 1000) / (SQRT3 * mean3(U));
        add('I_cap', Ic, 'A');
        add('kvar_active', kv, 'kvar');
      } else if (def.type === 'panel' || def.type === 'ruFeeder') {
        const ww = plant.ws[def.type === 'panel' ? def.workshop : def.serves];
        add('I_A', ww.I[0], 'A'); add('I_B', ww.I[1], 'A'); add('I_C', ww.I[2], 'A');
        const ratioB = ww.Iavg / np.protection.breakerIn;
        add('ratio_breaker', ratioB * 100, '%', ratioB <= 1 ? 'good' : 'bad');
        add('unbal', ww.unbal, '%', Lim.classifyUnbalance(ww.unbal, L));
      } else if (def.type === 'transformer') {
        const tm = plant.tm[id === 'tp_tm1' ? 'TM1' : 'TM2'];
        const I = (tm.S * 1000) / (SQRT3 * tm.Ubus);
        add('I_A', I, 'A'); add('I_B', I, 'A'); add('I_C', I, 'A');
        add('K', tm.K, '', Lim.classifyTrK(tm.K, L), { dec: 2 });
      }
      break;
    }
    case 'clampStart': {
      const cannot = (st.trip === 'relay' && !st.stalled) || st.trip === 'earth' || st.phaseMissing || st.burned || isIsolated(world, id) || st.on === false;
      if (cannot) {
        add('I_start', 0, 'A'); notes.push('start.cannot');
        return { ok: true, lines, notes, effect: null };
      }
      const Ustart = mean3(U) / world.cfg.plant.uNom;
      const Ist = (st.stalled ? 6.8 : st.startMult) * inom * Math.min(1, Ustart + 0.02);
      const prot = np.protection;
      const thr = (prot.breakerIn || 1e9) * (prot.magMult || 10);
      const trips = st.stalled ? true : st.startTrips != null ? !!st.startTrips : Ist > thr;
      add('I_start', Ist, 'A');
      add('start_ratio', Ist / inom, '×', null, { dec: 1 });
      notes.push(trips ? 'start.tripped' : 'start.ok');
      return { ok: true, lines, notes, effect: trips ? { trip: 'magnetic' } : { clearTrip: true } };
    }
    case 'multimeter': {
      if (def.type === 'motor' || def.type === 'welder' || def.type === 'cable' || def.type === 'capbank') {
        const isoOrDead = isIsolated(world, id) || !(plant.ws[def.workshop]?.alive);
        const sch = plant.ws[def.workshop].schLines;
        const bf = 1 - world.cfg.plant.branchDropPct / 100;
        const uin = isoOrDead ? [0, 0, 0] : sch.map((u) => u * bf);
        let umot = isoOrDead || !powered ? [0, 0, 0] : U.slice();
        if (st.phaseMissing && !isoOrDead) {
          const pm = st.phaseMissing; // 'A' | 'B' | 'C'
          const idxs = pm === 'A' ? [0, 2] : pm === 'B' ? [0, 1] : [1, 2];
          umot = uin.slice();
          for (const i of idxs) umot[i] = uin[i] * 0.45;
        }
        if (def.type === 'motor' || def.type === 'welder') {
          add('Uin_AB', uin[0], 'V'); add('Uin_BC', uin[1], 'V'); add('Uin_CA', uin[2], 'V');
          const lines2 = umot;
          add('U_AB', lines2[0], 'V', uvStatus(lines2[0], L, world)); add('U_BC', lines2[1], 'V', uvStatus(lines2[1], L, world)); add('U_CA', lines2[2], 'V', uvStatus(lines2[2], L, world));
        } else {
          add('U_AB', umot[0], 'V', uvStatus(umot[0], L, world)); add('U_BC', umot[1], 'V', uvStatus(umot[1], L, world)); add('U_CA', umot[2], 'V', uvStatus(umot[2], L, world));
        }
        if (def.type === 'motor') {
          const uavg = mean3(umot);
          add('dev', uavg > 0 ? voltageDevPct(uavg, world.cfg.plant.uNom) : 0, '%', uavg > 0 ? Lim.classifyVoltage(voltageDevPct(uavg, world.cfg.plant.uNom), L) : null, { dec: 1 });
          if (def.hasBrake) add('U_brake', isoOrDead ? 0 : st.brakeCoilV ?? 0, 'V');
        }
        if (isIsolated(world, id)) notes.push('mm.isolated');
      } else {
        // shchit, RU liniyasi, transformator — shina kuchlanishi
        let lines3;
        if (def.type === 'panel') lines3 = plant.ws[def.workshop].schLines;
        else if (def.type === 'ruFeeder') lines3 = plant.ws[def.serves].busLines;
        else lines3 = [plant.tm[id === 'tp_tm1' ? 'TM1' : 'TM2'].Ubus, plant.tm[id === 'tp_tm1' ? 'TM1' : 'TM2'].Ubus, plant.tm[id === 'tp_tm1' ? 'TM1' : 'TM2'].Ubus];
        if (isIsolated(world, id)) lines3 = [0, 0, 0];
        add('U_AB', lines3[0], 'V', uvStatus(lines3[0], L, world)); add('U_BC', lines3[1], 'V', uvStatus(lines3[1], L, world)); add('U_CA', lines3[2], 'V', uvStatus(lines3[2], L, world));
        const uavg = mean3(lines3);
        add('dev', uavg > 0 ? voltageDevPct(uavg, world.cfg.plant.uNom) : 0, '%', uavg > 0 ? Lim.classifyVoltage(voltageDevPct(uavg, world.cfg.plant.uNom), L) : null, { dec: 1 });
        add('uunbal', uavg > 0 ? unbalancePct(lines3) : 0, '%', uavg > 0 ? Lim.classifyUnbalance(unbalancePct(lines3), L) : null, { dec: 1 });
      }
      break;
    }
    case 'megger': {
      const gate = meggerGate(world, id);
      if (!gate.ok) return { ok: false, blocked: gate.kind };
      const R = st.burned ? 0.05 : st.insMOhm ?? 300;
      add('R_ins', R, 'MΩ', Lim.classifyInsulation(R, L), { dec: R < 10 ? 2 : 0, pct: 0.05 });
      break;
    }
    case 'thermal': {
      const T = st.T || {};
      if (def.type === 'motor') {
        add('T_case', T.case, '°C', Lim.classifyCaseTemp(T.case, L), { dec: 0 });
        add('T_bearing', T.bearing, '°C', Lim.classifyBearingTemp(T.bearing, L), { dec: 0 });
        add('T_terminal', T.terminal, '°C', Lim.classifyTerminalTemp(T.terminal, L), { dec: 0 });
      } else if (def.type === 'welder') {
        add('T_case', T.case, '°C', Lim.classifyCaseTemp(T.case, L), { dec: 0 });
        add('T_terminal', T.terminal, '°C', Lim.classifyTerminalTemp(T.terminal, L), { dec: 0 });
      } else if (def.type === 'cable') {
        add('T_cable', T.cable, '°C', Lim.classifyTerminalTemp(T.cable, L), { dec: 0 });
        add('T_terminal', T.terminal, '°C', Lim.classifyTerminalTemp(T.terminal, L), { dec: 0 });
      } else if (def.type === 'panel') {
        add('T_terminal', T.terminal, '°C', Lim.classifyTerminalTemp(T.terminal, L), { dec: 0 });
        add('T_cable', T.cable, '°C', Lim.classifyTerminalTemp(T.cable, L), { dec: 0 });
      } else if (def.type === 'capbank') {
        add('T_case', T.case, '°C', Lim.classifyCaseTemp(T.case, L), { dec: 0 });
      } else if (def.type === 'transformer') {
        add('T_oil', T.oil, '°C', T.oil > 85 ? 'bad' : T.oil > 70 ? 'warn' : 'good', { dec: 0 });
      } else {
        add('T_terminal', world.cfg.plant.ambientC + 12, '°C', 'good', { dec: 0 });
      }
      break;
    }
    case 'vibration': {
      if (!isRotating(world, id)) return { ok: false, blocked: 'notRotating' };
      add('v_mms', st.vib, 'mm/s', Lim.classifyVibration(st.vib, L), { dec: 1 });
      add('freq', st.vibKind, '', null);
      break;
    }
    case 'visual': {
      const items = [];
      let hidden = 0;
      const iso = isIsolated(world, id) && st.safety.done.includes('disconnect');
      if (st.isolated) items.push({ key: 'vis.isolated' });
      if (st.burned) items.push({ key: 'vis.burned' });
      if (st.trip === 'relay') items.push({ key: 'vis.relayTripped' });
      if (st.trip === 'magnetic') items.push({ key: 'vis.breakerTripped' });
      if (st.trip === 'earth') items.push({ key: 'vis.earthTripped' });
      for (const it of st.visual || []) {
        if (it.iso && !iso) hidden++;
        else items.push({ text: it.text, deep: !!it.iso });
      }
      if (id === 'weld_sch') items.push({ key: 'vis.weldPairs', vars: weldPairsSummary(world) });
      if (items.length === 0) items.push({ key: 'vis.nothing' });
      return { ok: true, lines: [], notes, items, hidden };
    }
    case 'analyzer': {
      const wsId = def.type === 'panel' ? def.workshop : def.type === 'ruFeeder' ? def.serves : null;
      if (wsId) {
        const ww = plant.ws[wsId];
        add('P', ww.P, 'kW', null, { dec: 1 });
        add('Q', ww.Q, 'kvar', null, { dec: 1 });
        add('S', ww.S, 'kVA', null, { dec: 1 });
        add('cos', ww.cos, '', Lim.classifyCosphi(ww.cos, L), { dec: 2 });
        add('I_A', ww.I[0], 'A'); add('I_B', ww.I[1], 'A'); add('I_C', ww.I[2], 'A');
        add('unbal', ww.unbal, '%', Lim.classifyUnbalance(ww.unbal, L), { dec: 1 });
        const lines3 = def.type === 'panel' ? ww.schLines : ww.busLines;
        const uavg = mean3(lines3);
        add('U_avg', uavg, 'V', uavg > 0 ? Lim.classifyVoltage(voltageDevPct(uavg, world.cfg.plant.uNom), L) : null, { dec: 0 });
        add('uunbal', uavg > 0 ? unbalancePct(lines3) : 0, '%', uavg > 0 ? Lim.classifyUnbalance(unbalancePct(lines3), L) : null, { dec: 1 });
        if (ww.bank) add('bank_kvar', ww.bank.kvarActive, 'kvar', null, { dec: 0 });
      } else if (def.type === 'transformer') {
        const tm = plant.tm[id === 'tp_tm1' ? 'TM1' : 'TM2'];
        add('P', tm.P, 'kW', null, { dec: 1 });
        add('Q', tm.Q, 'kvar', null, { dec: 1 });
        add('S', tm.S, 'kVA', null, { dec: 1 });
        add('cos', tm.cos, '', Lim.classifyCosphi(tm.cos, L), { dec: 2 });
        add('K', tm.K, '', Lim.classifyTrK(tm.K, L), { dec: 2 });
        add('U_avg', tm.Ubus, 'V', null, { dec: 0 });
      }
      break;
    }
    default:
      return { ok: false, blocked: 'unsupported' };
  }
  return { ok: true, lines, notes };
}

function uvStatus(u, L, world) {
  if (u <= 0) return null;
  return Lim.classifyVoltage(voltageDevPct(u, world.cfg.plant.uNom), L);
}

function weldPairsSummary(world) {
  const c = { AB: 0, BC: 0, CA: 0 };
  for (const id of Object.keys(world.defs)) if (world.defs[id].type === 'welder') c[world.dyn.st[id].pair]++;
  return c;
}
