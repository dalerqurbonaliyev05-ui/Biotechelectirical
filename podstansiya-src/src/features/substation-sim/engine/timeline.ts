// Stsenariy vaqt chizig'i: hodisalarni o'z vaqtida qo'llash (yuklama o'zgarishi, signallar, QT, yerga
// tutashuv, transformator nosozligi, ABR rad etishi, ob-havo, dispetcher xabarlari).

import { clearAlarm, raiseAlarm } from "./alarms";
import { runAbr } from "./automation";
import { parseTime } from "./journal";
import { computeNetwork } from "./network";
import type { ScenarioDef, SimEvent, TimelineEvent } from "./scenario";
import type { SimState, Topology } from "./types";

export interface TimelineCtx {
  topology: Topology;
  scenario: ScenarioDef;
}

function startSec(scenario: ScenarioDef): number {
  return parseTime(scenario.situation.timeStart) ?? 0;
}

export function deliverMessage(ctx: TimelineCtx, s: SimState, messageId: string): void {
  if (s.deliveredMessages.includes(messageId)) return;
  s.deliveredMessages.push(messageId);
  s.messageTimes[messageId] = s.time;
}

/** Transformatorning barcha o'chirgichlari (yacheyka nomi "T1-…" bo'yicha). */
export function transformerBreakers(topology: Topology, transformerId: string): string[] {
  const short = transformerId.replace("-", "");
  return topology.switches.filter((x) => x.kind === "breaker" && x.bay?.startsWith(`${short}-`)).map((x) => x.id);
}

export function applyEvent(ctx: TimelineCtx, s: SimState, ev: SimEvent): void {
  const { topology } = ctx;
  switch (ev.kind) {
    case "setLoad":
      s.loadFactor = ev.factor;
      break;
    case "alarm":
      raiseAlarm(s, ev.code, ev.params);
      break;
    case "clearAlarm":
      clearAlarm(s, ev.code);
      break;
    case "earthFault":
      s.earthFault = { nodeId: ev.nodeId, phase: ev.phase, severity: ev.severity, since: s.time, hazard: !!ev.hazard };
      break;
    case "lineFault":
      s.devices[ev.breakerId] = "open";
      raiseAlarm(s, "lineTrip", { breaker: ev.breakerId });
      if (ev.apv === "success") {
        s.devices[ev.breakerId] = "closed";
        raiseAlarm(s, "apvSuccess", { breaker: ev.breakerId });
      } else {
        raiseAlarm(s, "apvFail", { breaker: ev.breakerId });
        if (!s.faultNodes.includes(ev.nodeId)) s.faultNodes.push(ev.nodeId);
        // Barqaror QT: liniyaning qarama-qarshi uchi ham himoya bilan o'chadi
        s.sourcesAvailable[ev.sourceId] = false;
        runAbr(topology, s);
      }
      break;
    case "trip":
      for (const d of ev.deviceIds) s.devices[d] = "open";
      raiseAlarm(s, ev.code, { devices: ev.deviceIds.join(", ") });
      runAbr(topology, s);
      break;
    case "transformerFault": {
      if (ev.onlyIfEnergized) {
        const net = computeNetwork(topology, { devices: s.devices, sourcesAvailable: s.sourcesAvailable, loadFactor: s.loadFactor });
        if (!net.transformerEnergized[ev.transformerId]) break;
      }
      s.trFaults[ev.transformerId] = ev.fault;
      const code = ev.fault === "fire" ? "fire" : ev.fault === "gas" ? "gasTrip" : "diffTrip";
      raiseAlarm(s, code, { transformer: ev.transformerId });
      if (ev.trip) {
        for (const q of transformerBreakers(topology, ev.transformerId)) s.devices[q] = "open";
        if (ev.fault !== "fire") {
          const t = topology.transformers.find((x) => x.id === ev.transformerId);
          for (const n of [t?.hv, t?.mv, t?.lv]) if (n && !s.faultNodes.includes(n)) s.faultNodes.push(n);
        }
        runAbr(topology, s);
      }
      break;
    }
    case "rpnStuck":
      s.rpnStuck[ev.transformerId] = true;
      raiseAlarm(s, "rpnFault", { transformer: ev.transformerId });
      break;
    case "fansFail":
      s.fansFailed[ev.transformerId] = true;
      s.fans[ev.transformerId] = false;
      raiseAlarm(s, "fansFail", { transformer: ev.transformerId });
      break;
    case "abrFail":
      s.abr.failed = true;
      break;
    case "sourceLoss":
      s.sourcesAvailable[ev.sourceId] = false;
      raiseAlarm(s, "sourceLoss", { source: ev.sourceId });
      runAbr(topology, s);
      break;
    case "weather":
      s.weather = ev.weather;
      if (ev.ambientC !== undefined) s.ambientC = ev.ambientC;
      break;
    case "message":
      deliverMessage(ctx, s, ev.messageId);
      break;
    case "sourceKv":
      s.sourceKv = ev.kv;
      break;
  }
}

function due(ctx: TimelineCtx, s: SimState, te: TimelineEvent, stepId?: string): boolean {
  const t = te.trigger;
  if (t === "start") return true;
  if ("afterSec" in t) return s.time - startSec(ctx.scenario) >= t.afterSec;
  if ("at" in t) return s.time >= (parseTime(t.at) ?? Infinity);
  return t.afterStep === stepId || s.doneSteps.includes(t.afterStep);
}

/** Vaqti kelgan (yoki qadamdan keyingi) hodisalarni qo'llaydi va ularga bog'liq xabarlarni yetkazadi. */
export function processTimeline(ctx: TimelineCtx, s: SimState, stepId?: string): void {
  for (const te of ctx.scenario.timeline ?? []) {
    if (s.firedEvents.includes(te.id) || !due(ctx, s, te, stepId)) continue;
    s.firedEvents.push(te.id);
    applyEvent(ctx, s, te.event);
    for (const m of ctx.scenario.messages) {
      if (typeof m.trigger === "object" && "afterEvent" in m.trigger && m.trigger.afterEvent === te.id) deliverMessage(ctx, s, m.id);
    }
  }
}

/** Keyingi vaqtli (soat yoki boshlanishdan keyingi) hodisagacha qolgan soniyalar; bo'lmasa — null. */
export function nextTimedEventIn(ctx: TimelineCtx, s: SimState): number | null {
  let best: number | null = null;
  for (const te of ctx.scenario.timeline ?? []) {
    if (s.firedEvents.includes(te.id) || te.trigger === "start") continue;
    const t = te.trigger;
    let at: number | null = null;
    if ("afterSec" in t) at = startSec(ctx.scenario) + t.afterSec;
    else if ("at" in t) at = parseTime(t.at);
    if (at === null || at <= s.time) continue;
    if (best === null || at - s.time < best) best = at - s.time;
  }
  return best;
}
