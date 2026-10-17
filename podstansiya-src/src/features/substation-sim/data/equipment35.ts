// "Yangi hayot" 35/10 kV podstansiyasi (shartli, o'quv uchun) — S18 (yangi transformatorni o'rnatish va
// ishga tushirish) uchun. Bitta 35 kV kirish liniyasi, bitta transformator T-3 (ТМН-6300/35), 10 kV shina va fiderlar.

import type { EarthSwitchDef, InstrumentDef, LoadDef, NodeDef, SwitchDef, Topology } from "../engine/types";

const nodes: NodeDef[] = [
  { id: "W35", kv: 35, kind: "line", label: "W35 liniya" },
  { id: "W35:a", kv: 35, kind: "point" },
  { id: "W35:b", kv: 35, kind: "point" },
  { id: "B35", kv: 35, kind: "bus", label: "35 kV shina" },
  { id: "T3-35:a", kv: 35, kind: "point" },
  { id: "T3-35:b", kv: 35, kind: "point" },
  { id: "T3:H", kv: 35, kind: "point", label: "T-3 35 kV chiqishi" },
  { id: "T3:L", kv: 10, kind: "point", label: "T-3 10 kV chiqishi" },
  { id: "T3-10:a", kv: 10, kind: "point" },
  { id: "T3-10:b", kv: 10, kind: "point" },
  { id: "B10", kv: 10, kind: "bus", label: "10 kV shina" },
  { id: "F10-5", kv: 10, kind: "line", label: "F10-5 kabel liniya" },
  { id: "F10-5:b", kv: 10, kind: "point" },
  { id: "F10-6", kv: 10, kind: "line", label: "F10-6 kabel liniya" },
  { id: "F10-6:b", kv: 10, kind: "point" },
];

const switches: SwitchDef[] = [
  { id: "QS-W35L", kind: "disconnector", a: "W35", b: "W35:a", label: "QS-W35L", side: "equipment", bay: "W35" },
  { id: "Q-W35", kind: "breaker", a: "W35:a", b: "W35:b", label: "Q-W35", bay: "W35" },
  { id: "QS-W35B", kind: "disconnector", a: "W35:b", b: "B35", label: "QS-W35B", side: "bus", bay: "W35" },
  { id: "QS-T3-35T", kind: "disconnector", a: "T3:H", b: "T3-35:a", label: "QS-T3-35T", side: "equipment", bay: "T3-35" },
  { id: "Q-T3-35", kind: "breaker", a: "T3-35:a", b: "T3-35:b", label: "Q-T3-35", bay: "T3-35" },
  { id: "QS-T3-35B", kind: "disconnector", a: "T3-35:b", b: "B35", label: "QS-T3-35B", side: "bus", bay: "T3-35" },
  { id: "QS-T3-10T", kind: "disconnector", a: "T3:L", b: "T3-10:a", label: "QS-T3-10T", side: "equipment", bay: "T3-10" },
  { id: "Q-T3-10", kind: "breaker", a: "T3-10:a", b: "T3-10:b", label: "Q-T3-10", bay: "T3-10" },
  { id: "QS-T3-10B", kind: "disconnector", a: "T3-10:b", b: "B10", label: "QS-T3-10B", side: "bus", bay: "T3-10" },
  { id: "Q-F10-5", kind: "breaker", a: "F10-5", b: "F10-5:b", label: "Q-F10-5", bay: "F10-5" },
  { id: "QS-F10-5B", kind: "disconnector", a: "F10-5:b", b: "B10", label: "QS-F10-5B", side: "bus", bay: "F10-5" },
  { id: "Q-F10-6", kind: "breaker", a: "F10-6", b: "F10-6:b", label: "Q-F10-6", bay: "F10-6" },
  { id: "QS-F10-6B", kind: "disconnector", a: "F10-6:b", b: "B10", label: "QS-F10-6B", side: "bus", bay: "F10-6" },
];

const earthSwitches: EarthSwitchDef[] = [
  { id: "QSG-W35L", kind: "earthSwitch", node: "W35", label: "QSG-W35L", bay: "W35" },
  { id: "QSG-T3-35", kind: "earthSwitch", node: "T3:H", label: "QSG-T3-35", bay: "T3-35" },
  { id: "QSG-T3-10", kind: "earthSwitch", node: "T3:L", label: "QSG-T3-10", bay: "T3-10" },
  { id: "QSG-F10-5", kind: "earthSwitch", node: "F10-5", label: "QSG-F10-5", bay: "F10-5" },
  { id: "QSG-F10-6", kind: "earthSwitch", node: "F10-6", label: "QSG-F10-6", bay: "F10-6" },
];

const instruments: InstrumentDef[] = [
  { id: "TN-35", kind: "VT", node: "B35", label: "TN-35" },
  { id: "TN-10", kind: "VT", node: "B10", label: "TN-10" },
  { id: "OPN-T3-35", kind: "SA", node: "T3:H", label: "OPN-T3-35" },
  { id: "TT-T3-35", kind: "CT", node: "T3-35:a", label: "TT-T3-35" },
];

const loads: LoadDef[] = [
  { id: "L-F10-5", node: "F10-5", label: "«Yangi hayot» mahallasi", category: 3, mw: 2 },
  { id: "L-F10-6", node: "F10-6", label: "Fermer xo'jaligi nasoslari", category: 2, mw: 1.5 },
];

export const TOPOLOGY_35: Topology = {
  nodes,
  switches,
  earthSwitches,
  transformers: [{ id: "T-3", label: "T-3", model: "TMN-6300/35", hv: "T3:H", lv: "T3:L" }],
  sources: [{ id: "SRC-W35", node: "W35", label: "W35 — yangi 35 kV liniya" }],
  loads,
  instruments,
};
