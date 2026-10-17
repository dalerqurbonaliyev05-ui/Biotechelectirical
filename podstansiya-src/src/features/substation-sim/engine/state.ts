// Boshlang'ich simulyatsiya holati.

import { NORMS } from "../data/norms";
import { normalDevicePositions } from "../data/equipment";
import { getModel } from "../data/transformers";
import { computeNetwork } from "./network";
import { parseTime } from "./journal";
import { effectiveCooling, steadyTopOil } from "./thermal";
import type { ScenarioDef } from "./scenario";
import type { SimState, Topology } from "./types";

export function createInitialState(topology: Topology, scenario?: ScenarioDef): SimState {
  const devices = { ...normalDevicePositions(topology), ...(scenario?.initial?.devices ?? {}) };
  const loadFactor = scenario?.situation.loadFactor ?? 1;
  const ambientC = scenario?.situation.ambientC ?? NORMS.ambientDefaultC.value;
  const sourcesAvailable: Record<string, boolean> = {};
  for (const s of topology.sources) sourcesAvailable[s.id] = true;

  const net = computeNetwork(topology, { devices, sourcesAvailable, loadFactor, powerFactor: NORMS.powerFactor.value });
  const taps: Record<string, number> = {};
  const fans: Record<string, boolean> = {};
  const oilTemp: Record<string, number> = {};
  const agingHours: Record<string, number> = {};
  const rpnBusyUntil: Record<string, number> = {};
  for (const t of topology.transformers) {
    const model = getModel(t.model);
    const k = net.transformerMva[t.id] / model.ratedMva.value;
    taps[t.id] = scenario?.initial?.taps?.[t.id] ?? 0;
    // Ventilyatorlar avtomatikasi: yuklama yoki (ventilyatorlar bilan) barqaror moy harorati chegaradan yuqori bo'lsa yoqiq
    const withFans = effectiveCooling(model.cooling.value, true);
    fans[t.id] =
      model.cooling.value === "D" &&
      (k >= NORMS.fanAutoOnLoadFactor.value || steadyTopOil(ambientC, k / withFans.ratingFactor, withFans.params) >= NORMS.fanAutoOnOilC.value);
    const eff = effectiveCooling(model.cooling.value, fans[t.id]);
    oilTemp[t.id] = net.transformerEnergized[t.id] ? steadyTopOil(ambientC, k / eff.ratingFactor, eff.params) : ambientC;
    agingHours[t.id] = 0;
    rpnBusyUntil[t.id] = 0;
  }

  return {
    time: parseTime(scenario?.situation.timeStart ?? "08:00") ?? 8 * 3600,
    devices,
    verifiedDead: {},
    posters: { ...(scenario?.initial?.posters ?? {}) },
    positionChecked: {},
    taps,
    rpnBusyUntil,
    fans,
    oilTemp,
    agingHours,
    sourcesAvailable,
    permit: scenario?.initial?.permit ?? null,
    permitLog: [],
    blank: null,
    protocols: [],
    admitted: scenario?.initial?.admitted ?? false,
    workFinished: false,
    journal: [],
    acceptedOrders: [],
    reports: [],
    deliveredMessages: [],
    messageTimes: {},
    inspected: [],
    doneSteps: [],
    log: [],
    penalties: [],
    status: "running",
    failure: null,
    loadFactor,
    ambientC,
    sourceKv: scenario?.situation.sourceKv ?? 110,
    seed: 1,
    weather: scenario?.situation.weather ?? "clear",
    alarms: [],
    firedEvents: [],
    earthFault: null,
    faultNodes: [],
    abr: { enabled: scenario?.automation?.abr ?? true, failed: false },
    rpnStuck: {},
    fansFailed: {},
    trFaults: {},
    measurements: {},
    decisions: {},
    tasksDone: [],
    calls: [],
    phasing: {},
    oilHistory: {},
    overloadSince: {},
    outageMin: {},
    flags: [],
    stepAvailableAt: {},
    timeScale: scenario?.timeScale ?? 1,
  };
}
