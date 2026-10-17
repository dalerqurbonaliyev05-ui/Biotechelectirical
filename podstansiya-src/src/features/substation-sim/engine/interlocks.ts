// Blokirovka qoidalari (5.3-bo'lim). Har bir kommutatsiya amali "agar bajarilsa nima bo'ladi"
// usulida tekshiriladi: amaldan oldingi va keyingi tarmoq holati solishtiriladi.

import { SEVERITY } from "../data/rules";
import { computeNetwork, isNodeEnergized, suppliedObjects, type NetworkState } from "./network";
import type { Severity, SimState, SwitchPos, Topology } from "./types";

export interface InterlockIssue {
  code: string;
  severity: Severity;
  params?: Record<string, string>;
}

export interface InterlockResult {
  severity: Severity;
  code: string;
  params?: Record<string, string>;
  issues: InterlockIssue[];
}

export interface InterlockContext {
  /** Kommutatsiya uchun dispetcher buyrug'i kerakmi (favqulodda holatda — yo'q) */
  orderRequired: boolean;
  powerFactor?: number;
}

const RANK: Record<Severity, number> = { ok: 0, info: 1, violation: 2, critical: 3 };

export function maxSeverity(issues: InterlockIssue[]): InterlockIssue | null {
  let best: InterlockIssue | null = null;
  for (const i of issues) if (!best || RANK[i.severity] > RANK[best.severity]) best = i;
  return best;
}

function issue(code: string, params?: Record<string, string>): InterlockIssue {
  return { code, severity: SEVERITY[code] ?? "violation", params };
}

function net(topology: Topology, state: SimState, devices: Record<string, SwitchPos>, pf?: number): NetworkState {
  return computeNetwork(topology, { devices, sourcesAvailable: state.sourcesAvailable, loadFactor: state.loadFactor, powerFactor: pf });
}

function findDevice(topology: Topology, id: string) {
  return topology.switches.find((s) => s.id === id) ?? topology.earthSwitches.find((e) => e.id === id);
}

/** Tugun seksiyasida kuchlanish yo'qligi tekshirilganmi. */
export function isVerifiedDead(state: SimState, network: NetworkState, nodeId: string): boolean {
  const sec = network.sectionOf[nodeId];
  return Object.keys(state.verifiedDead).some((n) => network.sectionOf[n] === sec);
}

export function evaluateSwitch(
  topology: Topology,
  state: SimState,
  deviceId: string,
  to: SwitchPos,
  ctx: InterlockContext,
): InterlockResult {
  const dev = findDevice(topology, deviceId);
  if (!dev) return { severity: "info", code: "unknownDevice", issues: [] };
  const label = dev.label;
  if (state.devices[deviceId] === to) {
    return { severity: "info", code: "alreadyInPosition", params: { device: label }, issues: [] };
  }

  const issues: InterlockIssue[] = [];
  const before = net(topology, state, state.devices, ctx.powerFactor);
  const afterDevices = { ...state.devices, [deviceId]: to };
  const after = net(topology, state, afterDevices, ctx.powerFactor);
  const workInProgress = state.admitted && !state.workFinished;

  if (ctx.orderRequired && state.acceptedOrders.length === 0) issues.push(issue("switchWithoutOrder", { device: label }));

  if (to === "closed" && (state.posters[deviceId] ?? []).includes("doNotSwitch")) {
    issues.push(issue("switchPostered", { device: label }));
  }

  if (dev.kind === "earthSwitch") {
    if (to === "closed") {
      if (isNodeEnergized(before, dev.node)) issues.push(issue("earthOnLive", { device: label }));
      else if (!isVerifiedDead(state, before, dev.node)) issues.push(issue("earthWithoutVerify", { device: label }));
    } else if (workInProgress) {
      issues.push(issue("removeEarthDuringWork", { device: label }));
    }
  } else {
    // Yerlangan uchastkaga kuchlanish berish — qisqa tutashuv
    if (after.shortCircuit && !before.shortCircuit) issues.push(issue("energizeEarthed", { device: label }));
    // Barqaror qisqa tutashuvli joyga (liniya, transformator) kuchlanish berish — "ko'r-ko'rona" ulash
    if (to === "closed" && (state.faultNodes ?? []).some((n) => isNodeEnergized(after, n) && !isNodeEnergized(before, n))) {
      issues.push(issue("closeOntoFault", { device: label }));
    }

    if (to === "closed" && workInProgress) {
      const newlyEnergized = after.sections.some(
        (s) => s.energized && s.nodes.some((n) => !isNodeEnergized(before, n)),
      );
      if (newlyEnergized) issues.push(issue("switchDuringWork", { device: label }));
    }

    if (to === "closed" && !after.shortCircuit) {
      // Yerlangan, lekin kuchlanishsiz uchastkani boshqasiga ulash
      const merged = after.sections[after.sectionOf[dev.a]];
      const aG = before.sections[before.sectionOf[dev.a]].grounded;
      const bG = before.sections[before.sectionOf[dev.b]].grounded;
      if (merged.grounded && aG !== bG) issues.push(issue("closeOntoEarthedDead", { device: label }));
    }

    if (dev.kind === "disconnector") {
      const objBefore = suppliedObjects(topology, before);
      const objAfter = suppliedObjects(topology, after);
      const changed = to === "open" ? [...objBefore].filter((o) => !objAfter.has(o)) : [...objAfter].filter((o) => !objBefore.has(o));
      const consumers = changed.filter((o) => topology.loads.some((l) => l.id === o));
      const transformers = changed.filter((o) => topology.transformers.some((t) => t.id === o));
      // Parallel ishlayotgan transformatorlar orasida yuklama qayta taqsimlansa — ajratkich orqali yuklama toki o'tgan
      const redistributed = topology.transformers.some(
        (t) => Math.abs((before.transformerMva[t.id] ?? 0) - (after.transformerMva[t.id] ?? 0)) > 0.01,
      );
      if (consumers.length > 0 || (transformers.length === 0 && redistributed)) {
        issues.push(issue("disconnectorUnderLoad", { device: label }));
      } else if (transformers.length > 0) {
        issues.push(issue("disconnectorMagnetizing", { device: label, transformer: transformers.join(", ") }));
      } else {
        // Parallel zanjir: ikki tomoni ham kuchlanishda va kommutatsiyadan keyin ham shunday
        const aE = isNodeEnergized(before, dev.a) && isNodeEnergized(after, dev.a);
        const bE = isNodeEnergized(before, dev.b) && isNodeEnergized(after, dev.b);
        const separateBefore = before.sectionOf[dev.a] !== before.sectionOf[dev.b];
        const separateAfter = after.sectionOf[dev.a] !== after.sectionOf[dev.b];
        if (aE && bE && (to === "open" ? separateAfter : separateBefore)) {
          issues.push(issue("disconnectorLoop", { device: label }));
        }
      }
    }
  }

  const top = maxSeverity(issues);
  return {
    severity: top?.severity ?? "ok",
    code: top?.code ?? "ok",
    params: top?.params ?? { device: label },
    issues,
  };
}

/** Yopiq apparat orqali tok o'tyaptimi (uni ochish yuklama yoki transformator ta'minotini o'zgartiradimi). */
export function deviceCarriesCurrent(topology: Topology, state: SimState, deviceId: string): boolean {
  const dev = topology.switches.find((s) => s.id === deviceId);
  if (!dev || state.devices[deviceId] !== "closed") return false;
  const before = net(topology, state, state.devices);
  const after = net(topology, state, { ...state.devices, [deviceId]: "open" });
  const objB = suppliedObjects(topology, before);
  const objA = suppliedObjects(topology, after);
  if ([...objB].some((o) => !objA.has(o))) return true;
  return topology.transformers.some((t) => Math.abs((before.transformerMva[t.id] ?? 0) - (after.transformerMva[t.id] ?? 0)) > 0.01);
}
