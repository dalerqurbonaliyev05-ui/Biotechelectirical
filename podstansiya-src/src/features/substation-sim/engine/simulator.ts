// Simulyator "reduktori": holat + amal → yangi holat va natija (sof funksiya, testlanadi).
// Blokirovka, tartib, rejim qoidalari, iste'molchilar uzilishi, jurnal va hisobotni birlashtiradi.

import { MODE_RULES, PENALTY, SEVERITY } from "../data/rules";
import { NORMS } from "../data/norms";
import { getModel } from "../data/transformers";
import { evaluateSwitch, maxSeverity, type InterlockIssue } from "./interlocks";
import { checkJournalEntry, parseTime, type JournalOp } from "./journal";
import { computeNetwork, isNodeEnergized, parallelPairs, type NetworkState } from "./network";
import { hasActiveAlarm } from "./alarms";
import { checkBlank, nextBlankStep } from "./blank";
import { createRng } from "./events";
import { checkParallel } from "./parallel";
import { runProtection } from "./protection";
import { processTimeline } from "./timeline";
import { checkPermit, withinPermitTime, workplaceGaps } from "./permit";
import { checkProtocol } from "./protocol";
import { checkTap, lvVoltage, nextTap } from "./rpn";
import { matchStep, missingRequired } from "./sequence";
import { createInitialState } from "./state";
import { agingRate, effectiveCooling, fansShouldRun, hotSpot, stepTopOil } from "./thermal";
import type { DispatcherMessage, Goal, ScenarioDef } from "./scenario";
import type { Action, ActionOutcome, GameMode, Penalty, Severity, SimState, Topology } from "./types";

export interface SimContext {
  topology: Topology;
  scenario: ScenarioDef;
  mode: GameMode;
}

const RANK: Record<Severity, number> = { ok: 0, info: 1, violation: 2, critical: 3 };

export function networkOf(ctx: SimContext, state: SimState): NetworkState {
  return computeNetwork(ctx.topology, {
    devices: state.devices,
    sourcesAvailable: state.sourcesAvailable,
    loadFactor: state.loadFactor,
    powerFactor: NORMS.powerFactor.value,
  });
}

/** Transformator yuklama koeffitsienti K = S / Snom. */
export function loadFactorOf(ctx: SimContext, state: SimState, net: NetworkState, transformerId: string): number {
  const t = ctx.topology.transformers.find((x) => x.id === transformerId)!;
  return net.transformerMva[transformerId] / getModel(t.model).ratedMva.value;
}

/** Tugundagi kuchlanish, kV: 110 kV — manba; 35/10 kV — ta'minlovchi transformator(lar) bo'yicha o'rtacha. */
export function nodeVoltageKv(ctx: SimContext, state: SimState, net: NetworkState, nodeId: string): number {
  if (!isNodeEnergized(net, nodeId)) return 0;
  const node = ctx.topology.nodes.find((n) => n.id === nodeId);
  const maxKv = Math.max(...ctx.topology.nodes.map((n) => n.kv));
  if (!node || node.kv >= maxKv) return state.sourceKv;
  const sec = net.sectionOf[nodeId];
  const values: number[] = [];
  for (const t of ctx.topology.transformers) {
    if (!isNodeEnergized(net, t.hv)) continue;
    const model = getModel(t.model);
    const k = loadFactorOf(ctx, state, net, t.id);
    if (node.kv === 10 && net.sectionOf[t.lv] === sec) values.push(transformerLvKv(ctx, state, net, t.id));
    if (node.kv === 35 && t.mv && net.sectionOf[t.mv] === sec && model.mvKv) {
      const hvTap = model.hvKv.value * (1 + (state.taps[t.id] * model.rpn.value.stepPct) / 100);
      values.push(((state.sourceKv * model.mvKv.value) / hvTap) * (1 - (k * NORMS.loadDropAtNominalPct.value) / 100));
    }
  }
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : node.kv;
}

/** Transformatorning past (10 kV) tomonidagi kuchlanish, kV (o'chiq bo'lsa 0). */
export function transformerLvKv(ctx: SimContext, state: SimState, net: NetworkState, transformerId: string): number {
  const t = ctx.topology.transformers.find((x) => x.id === transformerId)!;
  if (!isNodeEnergized(net, t.hv)) return 0;
  return lvVoltage({ sourceKv: state.sourceKv, tap: state.taps[t.id], model: getModel(t.model), k: loadFactorOf(ctx, state, net, t.id) });
}

function messagesFor(scenario: ScenarioDef, trigger: (m: DispatcherMessage) => boolean): string[] {
  return scenario.messages.filter(trigger).map((m) => m.id);
}

export function createSession(ctx: SimContext, seed = 1): SimState {
  const s = createInitialState(ctx.topology, ctx.scenario);
  s.seed = seed;
  s.deliveredMessages = messagesFor(ctx.scenario, (m) => m.trigger === "start");
  for (const id of s.deliveredMessages) s.messageTimes[id] = s.time;
  processTimeline(ctx, s);
  runProtection(ctx, s, networkOf(ctx, s));
  updateAvailability(ctx, s);
  return s;
}

/** Qadamlar qachon bajarilishi mumkin bo'lganini qayd etadi (muddatlar va maslahatlar uchun). */
function updateAvailability(ctx: SimContext, s: SimState): void {
  for (const step of ctx.scenario.steps) {
    if (s.stepAvailableAt[step.id] !== undefined) continue;
    if ((step.after ?? []).every((a) => s.doneSteps.includes(a))) s.stepAvailableAt[step.id] = s.time;
  }
}

/** Dunyoni dt soniyaga oldinga suradi: 60 s bo'laklar bilan harorat, hodisalar va himoya. */
function stepWorld(ctx: SimContext, s: SimState, dtSec: number): void {
  let left = dtSec;
  while (left > 0 && s.status === "running") {
    const chunk = Math.min(60, left);
    advanceTime(ctx, s, chunk);
    processTimeline(ctx, s);
    runProtection(ctx, s, networkOf(ctx, s));
    left -= chunk;
  }
  if (left > 0) s.time += left;
}

function penaltyPoints(code: string, severity: Severity, applied: boolean): number {
  if (severity === "critical") return applied ? PENALTY.critical : PENALTY.blockedCritical;
  if (severity === "info" || severity === "ok") return 0;
  const specific = (PENALTY as Record<string, unknown>)[code];
  return typeof specific === "number" ? specific : PENALTY.violation;
}

function durationOf(ctx: SimContext, a: Action): number {
  const d = NORMS.actionDurationSec.value as Record<string, number>;
  if (a.type === "wait") return a.sec;
  if (a.type === "measure") return ctx.scenario.measurements?.find((x) => x.id === a.measurementId)?.durationSec ?? d.measure;
  if (a.type === "task") return ctx.scenario.tasks?.find((x) => x.id === a.taskId)?.durationSec ?? 0;
  return d[a.type] ?? 0;
}

/** O'lchov natijasi: belgilangan yoki urug' bo'yicha tasodifiy variant. */
export function pickVariant(def: NonNullable<ScenarioDef["measurements"]>[number], seed: number) {
  if (def.fixed !== undefined) return { category: def.variants[def.fixed].category, values: def.variants[def.fixed].values };
  let h = seed >>> 0;
  for (const c of def.id) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const rng = createRng(h);
  const total = def.variants.reduce((a, v) => a + (v.weight ?? 1), 0);
  let r = rng() * total;
  for (const v of def.variants) {
    r -= v.weight ?? 1;
    if (r <= 0) return { category: v.category, values: v.values };
  }
  const v = def.variants[def.variants.length - 1];
  return { category: v.category, values: v.values };
}

/** Kommutatsiya transformatorlarni parallel ishlashga ulaydimi — shartlar va fazirovka. */
function parallelIssues(ctx: SimContext, s: SimState, before: NetworkState, deviceId: string): InterlockIssue[] {
  const after = computeNetwork(ctx.topology, {
    devices: { ...s.devices, [deviceId]: "closed" },
    sourcesAvailable: s.sourcesAvailable,
    loadFactor: s.loadFactor,
    powerFactor: NORMS.powerFactor.value,
  });
  const was = parallelPairs(ctx.topology, before);
  const out: InterlockIssue[] = [];
  for (const pair of parallelPairs(ctx.topology, after)) {
    if (was.has(pair)) continue;
    const [a, b] = pair.split("|");
    const ta = ctx.topology.transformers.find((x) => x.id === a)!;
    const tb = ctx.topology.transformers.find((x) => x.id === b)!;
    const r = checkParallel({ model: getModel(ta.model), tap: s.taps[a] }, { model: getModel(tb.model), tap: s.taps[b] });
    if (r.issues.includes("vectorGroup")) out.push({ code: "parallelVectorMismatch", severity: SEVERITY.parallelVectorMismatch, params: { pair } });
    else if (r.issues.includes("ratio")) out.push({ code: "parallelRatio", severity: SEVERITY.parallelRatio, params: { pair, circ: r.circulatingCurrentPct.toFixed(0) } });
    const needs = (ctx.scenario.phasingRequired ?? []).some((t) => t === a || t === b);
    if (needs && !s.phasing[pair]) out.push({ code: "parallelWithoutPhasing", severity: SEVERITY.parallelWithoutPhasing, params: { pair } });
  }
  return out;
}

function goalMet(ctx: SimContext, state: SimState, net: NetworkState, g: Goal): boolean {
  switch (g.type) {
    case "device":
      return state.devices[g.deviceId] === g.pos;
    case "loadsSupplied":
      return g.loadIds.every((id) => net.loadSupplied[id]);
    case "inspected":
      return g.ids.every((id) => state.inspected.includes(id));
    case "transformerLoadMax":
      return loadFactorOf(ctx, state, net, g.transformerId) <= g.k;
    case "oilBelow":
      return state.oilTemp[g.transformerId] < g.c;
    case "noActiveAlarm":
      return !hasActiveAlarm(state, g.code);
    case "tapsEqual":
      return state.taps[g.a] === state.taps[g.b];
    case "voltageInRange": {
      const u = transformerLvKv(ctx, state, net, g.transformerId);
      return u >= g.min && u <= g.max;
    }
  }
}

export function unmetGoals(ctx: SimContext, state: SimState): Goal[] {
  const net = networkOf(ctx, state);
  return (ctx.scenario.goals ?? []).filter((g) => !goalMet(ctx, state, net, g));
}

/** Oxirgi jurnal yozuvidan keyin bajarilgan kommutatsiyalar. */
export function opsSinceLastJournal(ctx: SimContext, state: SimState): JournalOp[] {
  let start = 0;
  state.log.forEach((l, i) => {
    if (l.action.type === "journal" && l.applied) start = i + 1;
  });
  const ops: JournalOp[] = [];
  for (const l of state.log.slice(start)) {
    if (l.applied && l.action.type === "switch") {
      const id = l.action.deviceId;
      const dev = ctx.topology.switches.find((s) => s.id === id) ?? ctx.topology.earthSwitches.find((e) => e.id === id);
      if (dev) ops.push({ label: dev.label, t: l.t });
    }
  }
  return ops;
}

function allLabels(topology: Topology): string[] {
  return [...topology.switches.map((s) => s.label), ...topology.earthSwitches.map((e) => e.label)];
}

/** Yakunlash: bajarilmagan qadamlar, bajarilmagan maqsadlar va jurnal uchun jarimalar. */
function finalize(ctx: SimContext, state: SimState): Penalty[] {
  const out: Penalty[] = [];
  for (const s of missingRequired(ctx.scenario.steps, state.doneSteps)) {
    out.push({ t: state.time, code: "missingStep", points: PENALTY.missingStep, params: { step: s.label } });
  }
  for (const g of unmetGoals(ctx, state)) {
    out.push({ t: state.time, code: "goalUnmet", points: PENALTY.missingStep, params: { goal: g.type } });
  }
  if (ctx.scenario.journal?.required && state.journal.length === 0) {
    out.push({ t: state.time, code: "journalMissing", points: PENALTY.journalMissing });
  }
  return out;
}

function isComplete(ctx: SimContext, state: SimState): boolean {
  return missingRequired(ctx.scenario.steps, state.doneSteps).length === 0 && unmetGoals(ctx, state).length === 0;
}

/** Vaqtni oldinga surish: transformatorlar harorati, ventilyatorlar avtomatikasi, eskirish. */
function advanceTime(ctx: SimContext, s: SimState, dtSec: number): void {
  if (dtSec <= 0) return;
  const net = networkOf(ctx, s);
  for (const t of ctx.topology.transformers) {
    const model = getModel(t.model);
    const energized = net.transformerEnergized[t.id];
    const k = loadFactorOf(ctx, s, net, t.id);
    if (model.cooling.value === "D" && energized && !s.fansFailed[t.id] && fansShouldRun(s.oilTemp[t.id], k)) s.fans[t.id] = true;
    const eff = effectiveCooling(model.cooling.value, s.fans[t.id]);
    const kEff = energized ? k / eff.ratingFactor : 0;
    // Kuchlanishsiz transformator atrof harorati tomon soviydi (salt yurish isrofi e'tiborsiz)
    s.oilTemp[t.id] = stepTopOil(s.oilTemp[t.id], s.ambientC, energized ? Math.max(kEff, 0) : 0, eff.params, dtSec);
    if (!energized) s.oilTemp[t.id] = Math.max(s.ambientC, s.oilTemp[t.id]);
    s.agingHours[t.id] += (agingRate(hotSpot(s.oilTemp[t.id], kEff, eff.params)) * dtSec) / 3600;
    const hist = (s.oilHistory[t.id] ??= []);
    const last = hist[hist.length - 1];
    if (!last || s.time + dtSec - last[0] >= 60) {
      hist.push([s.time + dtSec, Math.round(s.oilTemp[t.id] * 10) / 10]);
      if (hist.length > 480) hist.shift();
    }
  }
  for (const l of ctx.topology.loads) {
    if (!net.loadSupplied[l.id]) s.outageMin[l.id] = (s.outageMin[l.id] ?? 0) + dtSec / 60;
  }
  s.time += dtSec;
}

function cloneState(s: SimState): SimState {
  return structuredClone(s);
}

export function applyAction(ctx: SimContext, prev: SimState, action: Action): ActionOutcome {
  if (prev.status !== "running") {
    return { state: prev, severity: "info", code: "finished", applied: false, penalties: [] };
  }
  const s = cloneState(prev);
  const { scenario, topology } = ctx;
  const modeRules = MODE_RULES[ctx.mode];

  if (action.type === "tick") {
    const before = s.penalties.length;
    stepWorld(ctx, s, action.dtSec);
    updateAvailability(ctx, s);
    const pens = s.penalties.slice(before);
    const failed = s.status === "failed";
    return { state: s, severity: failed ? "critical" : pens.length ? "violation" : "ok", code: failed ? (s.failure?.code ?? "tick") : pens[0]?.code ?? "tick", applied: true, penalties: pens };
  }

  if (action.type === "finish") {
    const pens = finalize(ctx, s);
    s.penalties.push(...pens);
    s.status = "completed";
    s.log.push({ t: s.time, action, severity: "ok", code: "finish", applied: true });
    return { state: s, severity: pens.length ? "violation" : "ok", code: "finish", applied: true, penalties: pens };
  }

  const netBefore = networkOf(ctx, s);
  const issues: InterlockIssue[] = [];
  let infoCode: string | null = null;
  let params: Record<string, string> | undefined;

  // ---- 1. Amal turiga xos tekshiruvlar ----
  switch (action.type) {
    case "switch": {
      const r = evaluateSwitch(topology, s, action.deviceId, action.to, {
        orderRequired: scenario.orderRequired,
        powerFactor: NORMS.powerFactor.value,
      });
      params = r.params;
      if (r.code === "alreadyInPosition" || r.code === "unknownDevice") infoCode = r.code;
      issues.push(...r.issues);
      if (!infoCode && action.to === "closed") issues.push(...parallelIssues(ctx, s, netBefore, action.deviceId));
      break;
    }
    case "verifyDead": {
      params = { node: action.nodeId };
      if (isNodeEnergized(netBefore, action.nodeId)) infoCode = "voltagePresent";
      break;
    }
    case "readback": {
      const msg = scenario.messages.find((m) => m.id === action.messageId);
      const opt = msg?.readback?.options.find((o) => o.id === action.optionId);
      if (!opt?.correct) issues.push({ code: "readbackWrong", severity: SEVERITY.readbackWrong, params: { why: opt?.why ?? "" } });
      break;
    }
    case "report": {
      const msg = scenario.messages.find((m) => m.id === action.messageId);
      const need = msg?.expectsReport?.afterStep;
      const goalsPending = msg?.expectsReport?.requireGoals && unmetGoals(ctx, s).length > 0;
      if ((need && !s.doneSteps.includes(need)) || goalsPending) issues.push({ code: "reportEarly", severity: SEVERITY.reportEarly });
      break;
    }
    case "permitIssue": {
      if (scenario.permit) {
        for (const pi of checkPermit(action.permit, scenario.permit)) issues.push({ code: pi.code, severity: SEVERITY[pi.code], params: pi.params });
      }
      break;
    }
    case "admit": {
      if (!s.permit) issues.push({ code: "admitWithoutPermit", severity: SEVERITY.admitWithoutPermit });
      else {
        const gaps = workplaceGaps(s, s.permit, scenario.permit);
        if (gaps.length) issues.push({ code: "admitNotPrepared", severity: SEVERITY.admitNotPrepared, params: { missing: gaps.join(", ") } });
        if (!withinPermitTime(s.permit, s.time)) issues.push({ code: "admitOutsideTime", severity: SEVERITY.admitOutsideTime });
      }
      break;
    }
    case "blankSubmit": {
      if (scenario.blank) {
        for (const bi of checkBlank(action.order, scenario.blank, scenario.steps)) issues.push({ code: bi.code, severity: SEVERITY[bi.code], params: bi.params });
      }
      break;
    }
    case "protocol": {
      if (scenario.protocol) {
        for (const pi of checkProtocol(action.form, scenario.protocol)) issues.push({ code: pi.code, severity: SEVERITY[pi.code], params: pi.params });
      }
      break;
    }
    case "finishWork": {
      if (!s.admitted) infoCode = "finishWithoutAdmit";
      break;
    }
    case "choice": {
      const d = scenario.decisions?.find((x) => x.id === action.decisionId);
      const opt = d?.options.find((o) => o.id === action.optionId);
      if (!d || !opt) {
        infoCode = "unknownDevice";
        break;
      }
      params = { why: opt.why ?? "" };
      let correct = opt.correct ?? false;
      if (opt.correctWhen) {
        const m = s.measurements[opt.correctWhen.measurementId];
        if (!m) {
          issues.push({ code: "decisionWithoutData", severity: SEVERITY.decisionWithoutData });
          break;
        }
        correct = opt.correctWhen.categories.includes(m.category);
      }
      if (!correct) {
        const code = opt.failCode ?? "wrongDecision";
        issues.push({ code, severity: opt.severity ?? SEVERITY[code] ?? "violation", params: { why: opt.why ?? "" } });
      }
      break;
    }
    case "measure":
    case "task":
    case "call":
    case "wait":
      break;
    case "phasing": {
      const ta = topology.transformers.find((x) => x.id === action.a);
      const tb = topology.transformers.find((x) => x.id === action.b);
      if (!ta || !tb || !netBefore.transformerEnergized[ta.id] || !netBefore.transformerEnergized[tb.id]) {
        infoCode = "phasingNotReady";
        break;
      }
      const r = checkParallel({ model: getModel(ta.model), tap: s.taps[ta.id] }, { model: getModel(tb.model), tap: s.taps[tb.id] });
      params = { issues: r.issues.join(", "), circ: Number.isFinite(r.circulatingCurrentPct) ? r.circulatingCurrentPct.toFixed(0) : "∞" };
      if (!r.ok) infoCode = "phasingMismatch";
      break;
    }
    case "tap": {
      const t = topology.transformers.find((x) => x.id === action.transformerId);
      if (!t) {
        infoCode = "unknownDevice";
        break;
      }
      if (s.rpnStuck[t.id]) {
        infoCode = "rpnStuck";
        break;
      }
      const check = checkTap({
        tap: s.taps[t.id],
        dir: action.dir,
        model: getModel(t.model),
        k: loadFactorOf(ctx, s, netBefore, t.id),
        now: s.time,
        busyUntil: s.rpnBusyUntil[t.id] ?? 0,
      });
      if (!check.ok) infoCode = check.code;
      break;
    }
    default:
      break;
  }

  // ---- 2. Tartib (stsenariy qadamlari) ----
  const m = infoCode ? { step: null, repeat: false, missingBefore: [] as string[] } : matchStep(scenario.steps, s.doneSteps, action);
  if (m.step && m.missingBefore.length) {
    issues.push({ code: "wrongOrder", severity: SEVERITY.wrongOrder, params: { missing: m.missingBefore.join(",") } });
  }
  const free = action.type === "switch" && (scenario.freeSwitching ?? []).includes(action.deviceId);
  if (!infoCode && !m.step && !m.repeat && !free && action.type === "switch" && issues.every((i) => i.severity !== "critical")) {
    issues.push({ code: "extraneous", severity: SEVERITY.extraneous, params });
  }
  // Kommutatsiya blankasi: blankasiz yoki blankadagi tartibdan chetga chiqib bajarish
  const bs = scenario.blank;
  if (bs && m.step && !m.step.optional && bs.stepIds.includes(m.step.id)) {
    if (!s.blank) {
      if (bs.required) issues.push({ code: "blankNotReady", severity: SEVERITY.blankNotReady });
    } else if (nextBlankStep(s.blank.order, s.doneSteps, bs) !== m.step.id) {
      issues.push({ code: "blankDeviation", severity: SEVERITY.blankDeviation, params: { step: m.step.label } });
    }
  }

  // ---- 3. Jiddiylik va rejim bo'yicha to'sish ----
  const top = maxSeverity(issues);
  const severity: Severity = infoCode ? (SEVERITY[infoCode] ?? "info") : (top?.severity ?? "ok");
  const code = infoCode ?? top?.code ?? "ok";
  const blocked = !infoCode && modeRules.block.includes(severity);
  const applied = !infoCode && !blocked && !(action.type === "readback" && severity !== "ok");
  if (top?.params) params = { ...params, ...top.params };

  // Jarimalar: har bir muammo alohida (bir amal uchun eng kattasi kritik bo'lsa — faqat u)
  const penalties: Penalty[] = [];
  const counted = severity === "critical" ? issues.filter((i) => i.severity === "critical").slice(0, 1) : issues.filter((i) => RANK[i.severity] >= 2);
  for (const i of counted) {
    const pts = penaltyPoints(i.code, i.severity, applied);
    if (pts > 0) penalties.push({ t: s.time, code: i.code, points: pts, params: { ...params, ...i.params } });
  }

  // ---- 4. Amalni qo'llash ----
  if (applied) {
    switch (action.type) {
      case "switch":
        s.devices[action.deviceId] = action.to;
        break;
      case "verifyDead":
        s.verifiedDead[action.nodeId] = s.time;
        break;
      case "checkPosition":
        s.positionChecked[action.deviceId] = true;
        break;
      case "poster": {
        const cur = new Set(s.posters[action.targetId] ?? []);
        if (action.on) cur.add(action.poster);
        else cur.delete(action.poster);
        s.posters[action.targetId] = [...cur];
        break;
      }
      case "readback": {
        const msg = scenario.messages.find((x) => x.id === action.messageId);
        if (msg?.isOrder && !s.acceptedOrders.includes(msg.id)) s.acceptedOrders.push(msg.id);
        break;
      }
      case "report":
        if (!s.reports.includes(action.messageId)) s.reports.push(action.messageId);
        break;
      case "permitIssue":
        s.permit = action.permit;
        break;
      case "admit":
        s.admitted = true;
        s.workFinished = false;
        s.permitLog.push({ kind: "admit", t: s.time });
        break;
      case "finishWork":
        s.workFinished = true;
        s.admitted = false;
        s.permitLog.push({ kind: "finish", t: s.time });
        break;
      case "blankSubmit":
        // Imtihon/sinov rejimida xatoli blanka ham yoziladi (jarimasi bilan) — talaba unga amal qiladi
        s.blank = { order: [...action.order], approved: issues.length === 0 };
        break;
      case "protocol":
        s.protocols.push(action.form);
        break;
      case "journal": {
        const jIssues = checkJournalEntry(action.entry, opsSinceLastJournal(ctx, s), allLabels(topology), s.time);
        for (const ji of jIssues) {
          const key = ji.code === "journalMissingOps" ? "journalNames" : ji.code === "journalEmpty" ? "journalMissing" : ji.code;
          penalties.push({ t: s.time, code: ji.code, points: (PENALTY as Record<string, unknown>)[key] as number, params: ji.params });
        }
        s.journal.push(action.entry);
        break;
      }
      case "inspect":
        if (!s.inspected.includes(action.targetId)) s.inspected.push(action.targetId);
        break;
      case "tap":
        s.taps[action.transformerId] = nextTap(s.taps[action.transformerId], action.dir);
        s.rpnBusyUntil[action.transformerId] = s.time + NORMS.rpnStepTimeSec.value;
        break;
      case "fans":
        s.fans[action.transformerId] = action.on;
        break;
      case "choice":
        s.decisions[action.decisionId] = action.optionId;
        break;
      case "measure": {
        const def = scenario.measurements?.find((x) => x.id === action.measurementId);
        if (def && !s.measurements[def.id]) s.measurements[def.id] = { ...pickVariant(def, s.seed), t: s.time };
        break;
      }
      case "task":
        if (!s.tasksDone.includes(action.taskId)) s.tasksDone.push(action.taskId);
        break;
      case "call":
        s.calls.push(action.to);
        break;
      case "phasing":
        s.phasing[[action.a, action.b].sort().join("|")] = true;
        break;
      case "wait":
        break;
    }

    if (m.step) s.doneSteps.push(m.step.id);

    // Kuchlanishga tushgan tugunlarda "kuchlanish yo'qligi tekshirilgan" belgisi bekor bo'ladi
    const netAfter = networkOf(ctx, s);
    for (const nodeId of Object.keys(s.verifiedDead)) {
      if (isNodeEnergized(netAfter, nodeId)) delete s.verifiedDead[nodeId];
    }

    // Iste'molchilar uzilishi
    for (const l of topology.loads) {
      if (!netBefore.loadSupplied[l.id] || netAfter.loadSupplied[l.id]) continue;
      if (!(scenario.allowedOutages ?? []).includes(l.id)) {
        penalties.push({ t: s.time, code: "consumerLost", points: PENALTY.lostConsumer[l.category], params: { load: l.label, category: String(l.category) } });
      }
      // Yuklamani cheklash: avval kam muhim (3-toifa) iste'molchilar uziladi
      if (scenario.loadShedding && action.type === "switch") {
        const lessImportant = topology.loads.filter((x) => x.category > l.category && netAfter.loadSupplied[x.id]);
        if (lessImportant.length) {
          penalties.push({ t: s.time, code: "shedPriority", points: PENALTY.shedPriority, params: { load: l.label, other: lessImportant.map((x) => x.label).join(", ") } });
        }
      }
    }

    // Qadamdan keyin keladigan dispetcher xabarlari
    if (m.step) {
      const stepId = m.step.id;
      for (const msg of scenario.messages) {
        if (typeof msg.trigger !== "object" || !("afterStep" in msg.trigger) || msg.trigger.afterStep !== stepId || s.deliveredMessages.includes(msg.id)) continue;
        s.deliveredMessages.push(msg.id);
        const at = msg.at ? parseTime(msg.at) : null;
        if (at !== null && at > s.time) stepWorld(ctx, s, at - s.time);
        s.messageTimes[msg.id] = s.time;
      }
    }

    if (severity === "critical") {
      s.status = "failed";
      s.failure = { code, params };
    }

    // Qadamdan keyingi hodisalar, himoya va qadamlar mavjudligi
    if (s.status === "running") {
      processTimeline(ctx, s, m.step?.id);
      runProtection(ctx, s, networkOf(ctx, s));
      updateAvailability(ctx, s);
    }
  }

  s.penalties.push(...penalties);
  s.log.push({ t: s.time, action, severity, code, applied, stepId: m.step?.id, params });
  if (applied || blocked) stepWorld(ctx, s, durationOf(ctx, action));

  if (s.status === "running" && applied && isComplete(ctx, s)) {
    s.penalties.push(...finalize(ctx, s));
    s.status = "completed";
  }

  return { state: s, severity, code, applied, params, stepId: m.step?.id, missingBefore: m.missingBefore, penalties };
}
