// ABR (avtomatik zaxirani ulash). Faqat avtomatik o'chishlardan (himoya, manba yo'qolishi) keyin
// chaqiriladi — operator qo'lda o'chirgan seksiyada ABR ishlamaydi (amaldagidek kalit bilan bloklanadi).

import { ABR_CONFIG } from "../data/automation";
import { computeNetwork, isNodeEnergized } from "./network";
import { raiseAlarm } from "./alarms";
import type { SimState, Topology } from "./types";

export function runAbr(topology: Topology, s: SimState): void {
  if (!s.abr.enabled) return;
  for (const cfg of ABR_CONFIG) {
    if (!topology.switches.some((x) => x.id === cfg.sv)) continue;
    if (s.devices[cfg.sv] !== "open") continue;
    const sw = topology.switches.find((x) => x.id === cfg.sv)!;
    const svDisc = topology.switches.filter((x) => x.kind === "disconnector" && (x.a === sw.a || x.b === sw.a || x.a === sw.b || x.b === sw.b));
    if (svDisc.some((d) => s.devices[d.id] !== "closed")) continue;
    const net = computeNetwork(topology, { devices: s.devices, sourcesAvailable: s.sourcesAvailable, loadFactor: s.loadFactor });
    const buses = Object.keys(cfg.inputs);
    const dead = buses.filter((b) => !isNodeEnergized(net, b));
    const live = buses.filter((b) => isNodeEnergized(net, b));
    if (dead.length !== 1 || live.length !== 1) continue;
    if (net.sections[net.sectionOf[dead[0]]].grounded) continue;
    if (s.abr.failed) {
      raiseAlarm(s, "abrFail", { sv: cfg.sv, bus: dead[0] });
      continue;
    }
    for (const q of cfg.inputs[dead[0]]) s.devices[q] = "open";
    s.devices[cfg.sv] = "closed";
    raiseAlarm(s, "abrWorked", { sv: cfg.sv, bus: dead[0] });
  }
}
