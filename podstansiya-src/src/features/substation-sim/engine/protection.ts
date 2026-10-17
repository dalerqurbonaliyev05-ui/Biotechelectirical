// Himoya va signal mantig'i (har amal va har vaqt qadamidan keyin): yerga tutashuv signali va taymeri,
// ortiqcha yuklanish, moy harorati, avariyaviy ortiqcha yuklash jadvali, qadam muddatlari.

import { NORMS, THERMAL } from "../data/norms";
import { PENALTY } from "../data/rules";
import { getModel } from "../data/transformers";
import { clearAlarm, raiseAlarm } from "./alarms";
import { earthFaultPhaseVoltages, earthFaultTimeLeftSec } from "./faults";
import { isNodeEnergized, type NetworkState } from "./network";
import { parseTime } from "./journal";
import type { ScenarioDef } from "./scenario";
import type { Penalty, SimState, Topology } from "./types";

export interface ProtectionCtx {
  topology: Topology;
  scenario: ScenarioDef;
}

function flagOnce(s: SimState, flag: string): boolean {
  if (s.flags.includes(flag)) return false;
  s.flags.push(flag);
  return true;
}

function penalize(s: SimState, code: string, params?: Record<string, string>): Penalty {
  const pts = (PENALTY as Record<string, unknown>)[code];
  const p: Penalty = { t: s.time, code, points: typeof pts === "number" ? pts : PENALTY.violation, params };
  s.penalties.push(p);
  return p;
}

/** Avariyaviy ortiqcha yuklashda ruxsat etilgan vaqt, daqiqa (jadvaldan; K ≤ birinchi qiymat — cheklanmagan). */
export function allowedOverloadMin(k: number): number {
  const table = NORMS.emergencyOverloadTable.value;
  if (k <= table[0].k) return Infinity;
  for (let i = table.length - 1; i >= 0; i--) if (k >= table[i].k) return table[i].minutes;
  return Infinity;
}

export function runProtection(ctx: ProtectionCtx, s: SimState, net: NetworkState): void {
  // ---- Yerga tutashuv (6–35 kV) ----
  if (s.earthFault) {
    const ef = s.earthFault;
    const node = ctx.topology.nodes.find((n) => n.id === ef.nodeId);
    if (isNodeEnergized(net, ef.nodeId)) {
      const u = earthFaultPhaseVoltages(node?.kv ?? 10, ef.phase, ef.severity);
      raiseAlarm(s, "earthFault", { A: u.A.toFixed(1), B: u.B.toFixed(1), C: u.C.toFixed(1), kv: String(node?.kv ?? 10) });
      if (earthFaultTimeLeftSec(ef.since, s.time) <= 0 && flagOnce(s, "earthFaultTimeout")) penalize(s, "earthFaultTimeout");
    } else {
      clearAlarm(s, "earthFault");
    }
  }

  // ---- Transformatorlar: ortiqcha yuklanish va harorat ----
  let anyOverload = false;
  let anyHot = false;
  for (const t of ctx.topology.transformers) {
    const model = getModel(t.model);
    const k = net.transformerMva[t.id] / model.ratedMva.value;
    if (k > NORMS.overloadAlarmFactor.value) {
      anyOverload = true;
      raiseAlarm(s, "overload", { transformer: t.id, k: k.toFixed(2) });
      s.overloadSince[t.id] ??= s.time;
      const allowed = allowedOverloadMin(k);
      if ((s.time - (s.overloadSince[t.id] ?? s.time)) / 60 > allowed && flagOnce(s, `overload:${t.id}`)) {
        penalize(s, "overloadTooLong", { transformer: t.id });
      }
    } else {
      s.overloadSince[t.id] = null;
    }
    const p = THERMAL[model.cooling.value];
    const oil = s.oilTemp[t.id];
    if (oil >= p.topOilAlarmC.value) {
      anyHot = true;
      raiseAlarm(s, "oilTempHigh", { transformer: t.id, c: oil.toFixed(0) });
    }
    if (oil > p.topOilMaxC.value && flagOnce(s, `oilMax:${t.id}`)) penalize(s, "oilOverLimit", { transformer: t.id });
    if (oil > p.topOilMaxC.value + NORMS.overheatFailMarginK.value && s.status === "running") {
      s.status = "failed";
      s.failure = { code: "transformerOverheat", params: { transformer: t.id } };
    }
  }

  if (!anyOverload) clearAlarm(s, "overload");
  if (!anyHot) clearAlarm(s, "oilTempHigh");

  // ---- Qadam muddatlari ----
  const start = parseTime(ctx.scenario.situation.timeStart) ?? 0;
  for (const step of ctx.scenario.steps) {
    if (!step.deadlineSec || s.doneSteps.includes(step.id)) continue;
    if (s.time - start <= step.deadlineSec || !flagOnce(s, `deadline:${step.id}`)) continue;
    if (step.deadlineCritical && s.status === "running") {
      s.status = "failed";
      s.failure = { code: step.deadlineCritical, params: { step: step.label } };
    } else {
      penalize(s, "stepLate", { step: step.label });
    }
  }
}
