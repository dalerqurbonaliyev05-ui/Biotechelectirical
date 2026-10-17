// "Yangi hayot" 35/10 kV podstansiyasi sxemasining chizma koordinatalari (S18).
import type { BusGlyph, DeviceGlyph, EarthGlyph, InstrumentGlyph, LoadGlyph, SldLayout, WireDef } from "./layout";

const G = 14;
const wires: WireDef[] = [];
const devices: DeviceGlyph[] = [];

function vbay(x: number, yTop: number, yBottom: number, items: Array<{ id: string; y: number }>, nodes: string[], labelSide: DeviceGlyph["labelSide"] = "right") {
  let y = yTop;
  items.forEach((it, i) => {
    wires.push({ node: nodes[i], points: [[x, y], [x, it.y - G]] });
    devices.push({ id: it.id, x, y: it.y, orient: "v", labelSide });
    y = it.y + G;
  });
  wires.push({ node: nodes[nodes.length - 1], points: [[x, y], [x, yBottom]] });
}

const buses: BusGlyph[] = [
  { node: "B35", x1: 150, x2: 560, y: 210, label: "35 kV shina" },
  { node: "B10", x1: 200, x2: 700, y: 675, label: "10 kV shina" },
];

vbay(300, 30, 210, [
  { id: "QS-W35L", y: 80 },
  { id: "Q-W35", y: 125 },
  { id: "QS-W35B", y: 170 },
], ["W35", "W35:a", "W35:b", "B35"], "left");

vbay(420, 210, 386, [
  { id: "QS-T3-35B", y: 250 },
  { id: "Q-T3-35", y: 295 },
  { id: "QS-T3-35T", y: 340 },
], ["B35", "T3-35:b", "T3-35:a", "T3:H"], "left");

wires.push({ node: "T3:L", points: [[420, 470], [420, 531]] });
vbay(420, 531, 675, [
  { id: "QS-T3-10T", y: 545 },
  { id: "Q-T3-10", y: 590 },
  { id: "QS-T3-10B", y: 635 },
], ["T3:L", "T3-10:a", "T3-10:b", "B10"], "left");

const loads: LoadGlyph[] = [];
for (const [f, x] of [
  ["F10-5", 300],
  ["F10-6", 560],
] as const) {
  vbay(x, 675, 842, [
    { id: `QS-${f}B`, y: 715 },
    { id: `Q-${f}`, y: 760 },
  ], ["B10", `${f}:b`, f], "right");
  loads.push({ id: `L-${f}`, x, y: 842 });
}

const earths: EarthGlyph[] = [
  { id: "QSG-W35L", node: "W35", from: [300, 48], x: 342, y: 64 },
  { id: "QSG-T3-35", node: "T3:H", from: [420, 362], x: 462, y: 378 },
  { id: "QSG-T3-10", node: "T3:L", from: [420, 500], x: 462, y: 516 },
  { id: "QSG-F10-5", node: "F10-5", from: [300, 800], x: 338, y: 812 },
  { id: "QSG-F10-6", node: "F10-6", from: [560, 800], x: 598, y: 812 },
];

const instruments: InstrumentGlyph[] = [
  { id: "TN-35", kind: "VT", node: "B35", from: [520, 210], x: 520, y: 180 },
  { id: "TN-10", kind: "VT", node: "B10", from: [660, 675], x: 660, y: 645 },
  { id: "OPN-T3-35", kind: "SA", node: "T3:H", from: [420, 352], x: 378, y: 368 },
  { id: "TT-T3-35", kind: "CT", node: "T3-35:a", x: 420, y: 318 },
];

export const SLD_35: SldLayout = {
  width: 800,
  height: 920,
  buses,
  lines: [{ node: "W35", x: 300, y: 24, label: "W35 «Yangi liniya»" }],
  wires,
  devices,
  earths,
  transformers: [{ id: "T-3", x: 420, y: 410, mvSide: "none" }],
  loads,
  instruments,
};
