// Dunyo (zavod) holati: uskunalarning dinamik holati, nosozlik yamoqlari. DOM ga tegmaydi.
import { hashUnit, rngFor, deepClone, deepMerge, setPath } from '../util.js';
import { nominalCurrent } from './electrical.js';

export const PAIRS = { AB: [0, 1], BC: [1, 2], CA: [2, 0] };

/** Nameplate = statik ma'lumot + holatdagi o'zgartirishlar (st.np) */
export function getNp(def, st) {
  return deepMerge(deepClone(def.nameplate), st?.np || {});
}

export function nomCurrentOf(def, st) {
  const np = getNp(def, st);
  if (def.type === 'motor') return nominalCurrent(np.P, np.U, np.cosphi, np.eta);
  if (def.type === 'welder') return (np.S * 1000) / np.U;
  return np.protection?.breakerIn ?? 0;
}

function rand(seed, key, a, b, d = 0) {
  const v = a + (b - a) * hashUnit(seed, key);
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/** Sog'lom (boshlang'ich) holat */
export function baselineState(def, seed) {
  const st = {
    safety: { done: [], accident: false },
    isolated: false,
    visual: [],
    damage: 0,
    burned: false,
    hazardPerMin: 0,
    np: {},
    T: {},
    on: true,
    trip: null,
    contactR: 0.0005
  };
  switch (def.type) {
    case 'motor':
      Object.assign(st, {
        stalled: false,
        phaseMissing: null,
        load: def.typical.load,
        cooling: 1,
        insMOhm: rand(seed, def.id + ':ins', 150, 450),
        phaseMult: [1, 1, 1],
        vib: rand(seed, def.id + ':vib', 1.0, 1.8, 1),
        vibKind: 'normal',
        heatWinding: 0,
        heatBearing: 0,
        startMult: def.typical.startMult ?? 6.5,
        startTrips: null,
        brakeCoilV: def.hasBrake ? 380 : null
      });
      break;
    case 'welder':
      Object.assign(st, {
        pair: def.typical.pair,
        P: def.typical.P,
        faulty: 1,
        heatWinding: 0,
        insMOhm: rand(seed, def.id + ':ins', 100, 400)
      });
      break;
    case 'panel':
      Object.assign(st, { extraKW: 0, voltageSkew: [0, 0, 0] });
      break;
    case 'capbank':
      Object.assign(st, { installed: def.typical.installed, stagesOk: def.typical.stagesOk, controller: def.typical.controller });
      break;
    default:
      break;
  }
  return st;
}

export function createWorld(data, seed = 1) {
  const defs = {};
  for (const e of data.equipment.equipment) defs[e.id] = e;
  const dyn = { st: {}, tm: { TM1: { inService: true }, TM2: { inService: true } }, tie: false };
  for (const id of Object.keys(defs)) dyn.st[id] = baselineState(defs[id], seed);
  return { data, cfg: data.config, defs, dyn, seed };
}

export const stOf = (world, id) => world.dyn.st[id];

export function isIsolated(world, id) {
  const st = world.dyn.st[id];
  if (!st) return false;
  if (st.isolated) return true;
  const parent = world.defs[id]?.parent;
  return parent ? !!world.dyn.st[parent]?.isolated : false;
}

/** Kuchlanish ostidami (ta'minot bor, kontaktor/avtomat yopiq, uzilmagan) */
export function isPowered(world, id) {
  const st = world.dyn.st[id];
  if (!st) return false;
  if (st.burned || st.on === false || st.trip) return false;
  return !isIsolated(world, id);
}

/** Aylanayaptimi (dvigatel uchun) */
export function isRotating(world, id) {
  const st = world.dyn.st[id];
  const def = world.defs[id];
  if (def?.type !== 'motor') return false;
  return isPowered(world, id) && !st.stalled && !st.phaseMissing;
}

// ---------- Yamoqlar (nosozlik sababi holatga yoziladi) ----------

function resolveVal(v, rng) {
  if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.rand)) {
    const [a, b] = v.rand;
    let x = a + (b - a) * rng();
    if (v.int) x = Math.round(x);
    else if (v.decimals != null) x = Math.round(x * 10 ** v.decimals) / 10 ** v.decimals;
    return x;
  }
  return v;
}

export function resolveTargets(world, target, taskEqId) {
  if (!target || target === '$eq') return [taskEqId];
  if (target === '$panel') return [world.defs[taskEqId].workshop + '_sch'];
  if (target.startsWith('id:')) return [target.slice(3)];
  if (target === 'group:welders') return Object.keys(world.defs).filter((id) => world.defs[id].type === 'welder');
  return [taskEqId];
}

/**
 * Yamoqni qo'llash. patch: {target, state:{...}, nameplate:{"a.b":v}, visual:[{text,iso}], special}
 * Qiymat {rand:[a,b], int:true} ko'rinishida bo'lishi mumkin (seed bilan tanlanadi).
 */
export function applyPatch(world, patch, taskEqId, rng) {
  for (const id of resolveTargets(world, patch.target, taskEqId)) {
    const st = world.dyn.st[id];
    if (!st) continue;
    for (const [k, v] of Object.entries(patch.state || {})) {
      const val = resolveVal(v, rng);
      st[k] = Array.isArray(val) ? val.slice() : val;
    }
    for (const [path, v] of Object.entries(patch.nameplate || {})) setPath(st.np, path, resolveVal(v, rng));
    for (const vis of patch.visual || []) st.visual.push({ ...vis });
    if (patch.T) st.initT = { ...(st.initT || {}), ...patch.T };
  }
  if (patch.special?.welderPairs) {
    const ids = Object.keys(world.defs).filter((id) => world.defs[id].type === 'welder').sort();
    patch.special.welderPairs.forEach((p, i) => {
      if (ids[i]) world.dyn.st[ids[i]].pair = p;
    });
  }
}

/**
 * Nosozlikni bartaraf etish: holatni sog'lom holatga qaytarish (haroratlar va xavfsizlik holati saqlanadi).
 * keepNp — nameplate o'zgarishlarini saqlash (masalan, qayta o'ralganlar soni).
 */
export function restoreHealthy(world, id, { np = null, seedSalt = 'fix' } = {}) {
  const def = world.defs[id];
  const old = world.dyn.st[id];
  const fresh = baselineState(def, world.seed + ':' + seedSalt);
  fresh.T = old.T;
  fresh.safety = old.safety;
  fresh.isolated = old.isolated;
  fresh.np = np ? deepClone(np) : {};
  // pair/P ni welder uchun saqlab qolamiz (qayta taqsimlashni buzmaslik uchun)
  if (def.type === 'welder') {
    fresh.pair = old.pair;
    fresh.P = old.P;
  }
  world.dyn.st[id] = fresh;
  return fresh;
}

export function patchRng(world, taskId, salt = '') {
  return rngFor(world.seed, 'patch:' + taskId + salt);
}
