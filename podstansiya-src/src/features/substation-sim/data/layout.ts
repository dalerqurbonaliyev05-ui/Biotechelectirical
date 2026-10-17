// Bir chiziqli sxemaning chizma koordinatalari (SVG). Topologiya data/equipment.ts da —
// bu fayl faqat "qayerda chiziladi"ni bildiradi. Har bir sim (wire) bitta tugunga tegishli va
// shu tugun holatiga qarab bo'yaladi.

export type Pt = [number, number];

export interface WireDef {
  node: string;
  points: Pt[];
}
export interface DeviceGlyph {
  id: string;
  x: number;
  y: number;
  orient: "v" | "h";
  labelSide?: "left" | "right" | "top" | "bottom";
}
export interface EarthGlyph {
  id: string;
  node: string;
  from: Pt;
  x: number;
  y: number;
}
export interface BusGlyph {
  node: string;
  x1: number;
  x2: number;
  y: number;
  label: string;
}
export interface TransformerGlyph {
  id: string;
  x: number;
  y: number;
  /** O'rta kuchlanish (35 kV) o'rami qaysi tomonda */
  mvSide: "left" | "right";
}
export interface LoadGlyph {
  id: string;
  x: number;
  y: number;
}
export interface InstrumentGlyph {
  id: string;
  kind: "CT" | "VT" | "SA";
  node: string;
  x: number;
  y: number;
  /** Simdan chiqish nuqtasi (inline TT uchun yo'q) */
  from?: Pt;
}
export interface LineEntry {
  node: string;
  x: number;
  y: number;
  label: string;
}

export const W = 1400;
export const H = 960;
const G = 14; // apparat belgisi yarim balandligi

const wires: WireDef[] = [];
const devices: DeviceGlyph[] = [];
const earths: EarthGlyph[] = [];
const instruments: InstrumentGlyph[] = [];

/** Vertikal yacheyka: yuqoridan pastga apparatlar va ular orasidagi tugunlar. nodes.length = items.length + 1 */
function vbay(x: number, yTop: number, yBottom: number, items: Array<{ id: string; y: number }>, nodes: string[], labelSide: DeviceGlyph["labelSide"] = "right") {
  let y = yTop;
  items.forEach((it, i) => {
    wires.push({ node: nodes[i], points: [[x, y], [x, it.y - G]] });
    devices.push({ id: it.id, x, y: it.y, orient: "v", labelSide });
    y = it.y + G;
  });
  wires.push({ node: nodes[nodes.length - 1], points: [[x, y], [x, yBottom]] });
}

/** Gorizontal seksiya o'chirgichi zanjiri: chap shina tushishi → QS → Q → QS → o'ng shina. */
function svChain(prefix: string, leftBus: string, rightBus: string, xLeftTap: number, yBus: number, xRightTap: number, yRight: number, y: number, xs: [number, number, number], leftPath?: Pt[], rightPath?: Pt[]) {
  const [x1, x2, x3] = xs;
  wires.push({ node: leftBus, points: leftPath ?? [[xLeftTap, yBus], [xLeftTap, y], [x1 - G, y]] });
  devices.push({ id: `QS-${prefix}-1`, x: x1, y, orient: "h", labelSide: "top" });
  wires.push({ node: `${prefix}:a`, points: [[x1 + G, y], [x2 - G, y]] });
  devices.push({ id: `Q-${prefix}`, x: x2, y, orient: "h", labelSide: "bottom" });
  wires.push({ node: `${prefix}:b`, points: [[x2 + G, y], [x3 - G, y]] });
  devices.push({ id: `QS-${prefix}-2`, x: x3, y, orient: "h", labelSide: "top" });
  wires.push({ node: rightBus, points: rightPath ?? [[x3 + G, y], [xRightTap, y], [xRightTap, yRight]] });
}

// ---------------- 110 kV ----------------
const buses: BusGlyph[] = [
  { node: "B110-1", x1: 140, x2: 640, y: 200, label: "110 kV I s." },
  { node: "B110-2", x1: 760, x2: 1260, y: 200, label: "110 kV II s." },
  { node: "B35-1", x1: 40, x2: 340, y: 630, label: "35 kV I s." },
  { node: "B35-2", x1: 1060, x2: 1360, y: 630, label: "35 kV II s." },
  { node: "B10-1", x1: 380, x2: 660, y: 700, label: "10 kV I s." },
  { node: "B10-2", x1: 740, x2: 1020, y: 700, label: "10 kV II s." },
];

const lines: LineEntry[] = [
  { node: "W1", x: 240, y: 24, label: "W1 «Sharq»" },
  { node: "W2", x: 1160, y: 24, label: "W2 «G'arb»" },
];

for (const [w, x, bus, side] of [
  ["W1", 240, "B110-1", 1],
  ["W2", 1160, "B110-2", -1],
] as const) {
  vbay(x, 30, 200, [
    { id: `QS-${w}L`, y: 80 },
    { id: `Q-${w}`, y: 125 },
    { id: `QS-${w}B`, y: 170 },
  ], [w, `${w}:a`, `${w}:b`, bus], side > 0 ? "left" : "right");
  earths.push({ id: `QSG-${w}L`, node: w, from: [x, 48], x: x + 42 * side, y: 64 });
  instruments.push({ id: `OPN-${w}`, kind: "SA", node: w, from: [x, 40], x: x - 40 * side, y: 56 });
}

svChain("SV110", "B110-1", "B110-2", 620, 200, 780, 200, 248, [660, 700, 740]);

// ---------------- Transformatorlar ----------------
const transformers: TransformerGlyph[] = [];
for (const [n, sgn] of [
  [1, 1],
  [2, -1],
] as const) {
  const mirror = (x: number) => (sgn > 0 ? x : W - x);
  const T = `T${n}`;
  const xh = mirror(440);
  // 110 kV yacheyka
  vbay(xh, 200, 376, [
    { id: `QS-${T}-110B`, y: 240 },
    { id: `Q-${T}-110`, y: 285 },
    { id: `QS-${T}-110T`, y: 330 },
  ], [`B110-${n}`, `${T}-110:b`, `${T}-110:a`, `${T}:H`], sgn > 0 ? "left" : "right");
  earths.push({ id: `QSG-${T}-110`, node: `${T}:H`, from: [xh, 356], x: mirror(482), y: 372 });
  instruments.push({ id: `OPN-${T}-110`, kind: "SA", node: `${T}:H`, from: [xh, 346], x: mirror(400), y: 362 });
  instruments.push({ id: `TT-${T}-110`, kind: "CT", node: `${T}-110:a`, x: xh, y: 308 });
  transformers.push({ id: `T-${n}`, x: xh, y: 400, mvSide: sgn > 0 ? "left" : "right" });

  // 35 kV: o'rta o'ram chiqishi chapga (T-1) yoki o'ngga (T-2)
  const xm = mirror(250);
  wires.push({ node: `${T}:M`, points: [[mirror(394), 438], [xm, 438], [xm, 490]] });
  earths.push({ id: `QSG-${T}-35`, node: `${T}:M`, from: [xm, 466], x: mirror(208), y: 482 });
  vbay(xm, 490, 630, [
    { id: `QS-${T}-35T`, y: 504 },
    { id: `Q-${T}-35`, y: 550 },
    { id: `QS-${T}-35B`, y: 596 },
  ], [`${T}:M`, `${T}-35:a`, `${T}-35:b`, `B35-${n}`], sgn > 0 ? "right" : "left");

  // 10 kV: past o'ram chiqishi pastga
  const xl = mirror(462);
  wires.push({ node: `${T}:L`, points: [[xl, 462], [xl, 566]] });
  earths.push({ id: `QSG-${T}-10`, node: `${T}:L`, from: [xl, 520], x: mirror(504), y: 536 });
  vbay(xl, 566, 700, [
    { id: `QS-${T}-10T`, y: 580 },
    { id: `Q-${T}-10`, y: 625 },
    { id: `QS-${T}-10B`, y: 670 },
  ], [`${T}:L`, `${T}-10:a`, `${T}-10:b`, `B10-${n}`], sgn > 0 ? "right" : "left");
}

// ---------------- Seksiya o'chirgichlari 35 va 10 kV ----------------
svChain("SV10", "B10-1", "B10-2", 630, 700, 770, 700, 748, [660, 700, 740]);
svChain("SV35", "B35-1", "B35-2", 60, 630, 1340, 630, 920, [660, 700, 740]);

// ---------------- Fiderlar ----------------
const loads: LoadGlyph[] = [];
for (const [f, x, bus, n] of [
  ["F35-1", 120, "B35-1", 1],
  ["F35-2", 1280, "B35-2", -1],
] as const) {
  vbay(x, 630, 862, [
    { id: `QS-${f}B`, y: 668 },
    { id: `Q-${f}`, y: 712 },
    { id: `QS-${f}L`, y: 756 },
  ], [bus, `${f}:b`, `${f}:a`, f], n > 0 ? "right" : "left");
  earths.push({ id: `QSG-${f}`, node: f, from: [x, 800], x: x + 38 * n, y: 812 });
  loads.push({ id: `L-${f}`, x, y: 862 });
}
for (const [f, x, bus, n] of [
  ["F10-1", 420, "B10-1", 1],
  ["F10-2", 540, "B10-1", 1],
  ["F10-3", 860, "B10-2", -1],
  ["F10-4", 980, "B10-2", -1],
] as const) {
  vbay(x, 700, 862, [
    { id: `QS-${f}B`, y: 740 },
    { id: `Q-${f}`, y: 785 },
  ], [bus, `${f}:b`, f], n > 0 ? "right" : "left");
  earths.push({ id: `QSG-${f}`, node: f, from: [x, 812], x: x + 38 * n, y: 824 });
  loads.push({ id: `L-${f}`, x, y: 862 });
}

// ---------------- Kuchlanish transformatorlari ----------------
for (const [bus, x, y, up] of [
  ["B110-1", 340, 200, true],
  ["B110-2", 1060, 200, true],
  ["B35-1", 300, 630, false],
  ["B35-2", 1100, 630, false],
  ["B10-1", 610, 700, true],
  ["B10-2", 1000, 700, true],
] as const) {
  instruments.push({ id: `TN-${bus.slice(1)}`, kind: "VT", node: bus, from: [x, y], x, y: up ? y - 30 : y + 30 });
}

export const SLD = { width: W, height: H, buses, lines, wires, devices, earths, transformers, loads, instruments };

/** Uskunaning sxemadagi markazi (reja → sxema o'tishi va avtomatik markazlashtirish uchun). */
export function glyphCenter(id: string): Pt | null {
  const d = devices.find((x) => x.id === id) ?? earths.find((x) => x.id === id) ?? transformers.find((x) => x.id === id) ?? loads.find((x) => x.id === id) ?? instruments.find((x) => x.id === id);
  if (d) return [d.x, d.y];
  const b = buses.find((x) => x.node === id);
  if (b) return [(b.x1 + b.x2) / 2, b.y];
  const l = lines.find((x) => x.node === id);
  return l ? [l.x, l.y] : null;
}
