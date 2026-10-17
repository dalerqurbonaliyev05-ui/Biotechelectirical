// "Yangiobod" 110/35/10 kV o'quv podstansiyasining topologiyasi (shartli, o'quv uchun).
// Ikki 110 kV kirish liniyasi, 110 kV ikki seksiya + SV, ikkita uch o'ramli transformator
// (T-1, T-2), 35 kV va 10 kV seksiyalar (SV, ABR), fiderlar va iste'molchilar.
// Uskuna nomlari sxemada va jurnalda shu ko'rinishda ishlatiladi.

import type {
  EarthSwitchDef,
  InstrumentDef,
  LoadDef,
  NodeDef,
  SourceDef,
  SwitchDef,
  Topology,
  TransformerDef,
} from "../engine/types";

const nodes: NodeDef[] = [];
const switches: SwitchDef[] = [];
const earthSwitches: EarthSwitchDef[] = [];
const instruments: InstrumentDef[] = [];

function node(id: string, kv: number, kind: NodeDef["kind"] = "point", label?: string) {
  nodes.push({ id, kv, kind, label });
}

/**
 * Standart yacheyka: [equip tugun] —QS(equipment)— a —Q— b —QS(bus)— [shina].
 * equipNode — transformator chiqishi yoki liniya; busNode — shina.
 */
function bay(prefix: string, kv: number, equipNode: string, busNode: string, opts: { equipQs: boolean; bayId: string; equipSuffix?: "T" | "L" }) {
  const a = `${prefix}:a`;
  const b = `${prefix}:b`;
  const sfx = opts.equipSuffix ?? "T";
  node(a, kv);
  node(b, kv);
  if (opts.equipQs) {
    switches.push({ id: `QS-${prefix}${sfx}`, kind: "disconnector", a: equipNode, b: a, label: `QS-${prefix}${sfx}`, side: "equipment", bay: opts.bayId });
  }
  switches.push({ id: `Q-${prefix}`, kind: "breaker", a: opts.equipQs ? a : equipNode, b, label: `Q-${prefix}`, bay: opts.bayId });
  switches.push({ id: `QS-${prefix}B`, kind: "disconnector", a: b, b: busNode, label: `QS-${prefix}B`, side: "bus", bay: opts.bayId });
}

// ---- Shinalar ----
node("B110-1", 110, "bus", "110 kV I seksiya");
node("B110-2", 110, "bus", "110 kV II seksiya");
node("B35-1", 35, "bus", "35 kV I seksiya");
node("B35-2", 35, "bus", "35 kV II seksiya");
node("B10-1", 10, "bus", "10 kV I seksiya");
node("B10-2", 10, "bus", "10 kV II seksiya");

// ---- 110 kV kirish liniyalari ----
for (const [w, bus] of [
  ["W1", "B110-1"],
  ["W2", "B110-2"],
] as const) {
  node(w, 110, "line", `${w} liniya`);
  // Liniya yacheykasi: liniya ajratkichi QS-W1L, o'chirgich Q-W1, shina ajratkichi QS-W1B
  node(`${w}:a`, 110);
  node(`${w}:b`, 110);
  switches.push({ id: `QS-${w}L`, kind: "disconnector", a: w, b: `${w}:a`, label: `QS-${w}L`, side: "equipment", bay: w });
  switches.push({ id: `Q-${w}`, kind: "breaker", a: `${w}:a`, b: `${w}:b`, label: `Q-${w}`, bay: w });
  switches.push({ id: `QS-${w}B`, kind: "disconnector", a: `${w}:b`, b: bus, label: `QS-${w}B`, side: "bus", bay: w });
  earthSwitches.push({ id: `QSG-${w}L`, kind: "earthSwitch", node: w, label: `QSG-${w}L`, bay: w });
}

// ---- Seksiya o'chirgichlari (SV) ----
for (const kv of [110, 35, 10]) {
  const p = `SV${kv}`;
  node(`${p}:a`, kv);
  node(`${p}:b`, kv);
  switches.push({ id: `QS-${p}-1`, kind: "disconnector", a: `B${kv}-1`, b: `${p}:a`, label: `QS-${p}-1`, side: "bus", bay: p });
  switches.push({ id: `Q-${p}`, kind: "breaker", a: `${p}:a`, b: `${p}:b`, label: `Q-${p}`, bay: p });
  switches.push({ id: `QS-${p}-2`, kind: "disconnector", a: `${p}:b`, b: `B${kv}-2`, label: `QS-${p}-2`, side: "bus", bay: p });
}

// ---- Transformatorlar va ularning yacheykalari ----
const transformers: TransformerDef[] = [];
for (const n of [1, 2]) {
  const t = `T${n}`;
  node(`${t}:H`, 110, "point", `T-${n} 110 kV chiqishi`);
  node(`${t}:M`, 35, "point", `T-${n} 35 kV chiqishi`);
  node(`${t}:L`, 10, "point", `T-${n} 10 kV chiqishi`);
  transformers.push({ id: `T-${n}`, label: `T-${n}`, model: "TDTN-25000/110", hv: `${t}:H`, mv: `${t}:M`, lv: `${t}:L` });
  bay(`${t}-110`, 110, `${t}:H`, `B110-${n}`, { equipQs: true, bayId: `${t}-110` });
  bay(`${t}-35`, 35, `${t}:M`, `B35-${n}`, { equipQs: true, bayId: `${t}-35` });
  bay(`${t}-10`, 10, `${t}:L`, `B10-${n}`, { equipQs: true, bayId: `${t}-10` });
  earthSwitches.push({ id: `QSG-${t}-110`, kind: "earthSwitch", node: `${t}:H`, label: `QSG-${t}-110`, bay: `${t}-110` });
  earthSwitches.push({ id: `QSG-${t}-35`, kind: "earthSwitch", node: `${t}:M`, label: `QSG-${t}-35`, bay: `${t}-35` });
  earthSwitches.push({ id: `QSG-${t}-10`, kind: "earthSwitch", node: `${t}:L`, label: `QSG-${t}-10`, bay: `${t}-10` });
  instruments.push({ id: `OPN-${t}-110`, kind: "SA", node: `${t}:H`, label: `OPN-${t}-110` });
  instruments.push({ id: `TT-${t}-110`, kind: "CT", node: `${t}-110:a`, label: `TT-${t}-110` });
}

// ---- Fiderlar ----
// 35 kV: shina ajratkichi + o'chirgich + liniya ajratkichi; 10 kV (KRU): aravacha (shina tomoni) + o'chirgich.
for (const [f, bus] of [
  ["F35-1", "B35-1"],
  ["F35-2", "B35-2"],
] as const) {
  node(f, 35, "line", `${f} liniya`);
  bay(f, 35, f, bus, { equipQs: true, bayId: f, equipSuffix: "L" });
  earthSwitches.push({ id: `QSG-${f}`, kind: "earthSwitch", node: f, label: `QSG-${f}`, bay: f });
}
for (const [f, bus] of [
  ["F10-1", "B10-1"],
  ["F10-2", "B10-1"],
  ["F10-3", "B10-2"],
  ["F10-4", "B10-2"],
] as const) {
  node(f, 10, "line", `${f} kabel liniya`);
  bay(f, 10, f, bus, { equipQs: false, bayId: f });
  earthSwitches.push({ id: `QSG-${f}`, kind: "earthSwitch", node: f, label: `QSG-${f}`, bay: f });
}

// ---- Kuchlanish transformatorlari va razryadniklar (ma'lumot uchun) ----
for (const bus of ["B110-1", "B110-2", "B35-1", "B35-2", "B10-1", "B10-2"]) {
  instruments.push({ id: `TN-${bus.slice(1)}`, kind: "VT", node: bus, label: `TN-${bus.slice(1)}` });
}
instruments.push({ id: "OPN-W1", kind: "SA", node: "W1", label: "OPN-W1" });
instruments.push({ id: "OPN-W2", kind: "SA", node: "W2", label: "OPN-W2" });

const sources: SourceDef[] = [
  { id: "SRC-W1", node: "W1", label: "W1 — 110 kV «Sharq» liniyasi" },
  { id: "SRC-W2", node: "W2", label: "W2 — 110 kV «G'arb» liniyasi" },
];

// Iste'molchilar (shartli). Quvvatlar o'quv namunasi, me'yor emas.
const loads: LoadDef[] = [
  { id: "L-F35-1", node: "F35-1", label: "«Bog'ishamol» 35/10 kV tuman podstansiyasi", category: 2, mw: 6 },
  { id: "L-F35-2", node: "F35-2", label: "Paxta tozalash zavodi", category: 2, mw: 5 },
  { id: "L-F10-1", node: "F10-1", label: "Tuman markaziy kasalxonasi", category: 1, mw: 1.5 },
  { id: "L-F10-2", node: "F10-2", label: "«Navro'z» turar-joy massivi", category: 2, mw: 3 },
  { id: "L-F10-3", node: "F10-3", label: "Suv nasos stansiyasi", category: 1, mw: 2 },
  { id: "L-F10-4", node: "F10-4", label: "Bozor, maktab va do'konlar", category: 3, mw: 2 },
];

export const TOPOLOGY: Topology = { nodes, switches, earthSwitches, transformers, sources, loads, instruments };

/** Normal (rejali) holat: barcha yacheykalar ulangan, SV o'chirgichlari ochiq (ABR kutish holatida). */
export function normalDevicePositions(topology: Topology = TOPOLOGY): Record<string, "open" | "closed"> {
  const pos: Record<string, "open" | "closed"> = {};
  for (const s of topology.switches) pos[s.id] = s.id.startsWith("Q-SV") ? "open" : "closed";
  for (const e of topology.earthSwitches) pos[e.id] = "open";
  return pos;
}
