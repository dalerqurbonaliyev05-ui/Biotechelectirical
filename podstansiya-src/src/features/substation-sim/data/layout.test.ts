import { describe, expect, it } from "vitest";
import { TOPOLOGY } from "./equipment";
import { SLD } from "./layout";

describe("sxema chizmasi topologiyaga mos", () => {
  const nodeIds = new Set(TOPOLOGY.nodes.map((n) => n.id));
  it("har bir apparat va yerlagich chizilgan", () => {
    const drawn = new Set([...SLD.devices.map((d) => d.id), ...SLD.earths.map((e) => e.id)]);
    for (const s of TOPOLOGY.switches) expect(drawn.has(s.id), s.id).toBe(true);
    for (const e of TOPOLOGY.earthSwitches) expect(drawn.has(e.id), e.id).toBe(true);
  });
  it("simlar mavjud tugunlarga tegishli", () => {
    for (const w of SLD.wires) expect(nodeIds.has(w.node), w.node).toBe(true);
  });
  it("transformator, iste'molchi va asboblar chizilgan", () => {
    expect(SLD.transformers.map((t) => t.id).sort()).toEqual(TOPOLOGY.transformers.map((t) => t.id).sort());
    expect(SLD.loads.map((l) => l.id).sort()).toEqual(TOPOLOGY.loads.map((l) => l.id).sort());
    for (const i of TOPOLOGY.instruments) expect(SLD.instruments.some((x) => x.id === i.id), i.id).toBe(true);
  });
  it("apparat ikki tomonidagi simlar uning tugunlariga mos", () => {
    for (const d of SLD.devices) {
      const sw = TOPOLOGY.switches.find((s) => s.id === d.id)!;
      const touching = SLD.wires.filter((w) =>
        w.points.some(([x, y]) => (d.orient === "v" ? x === d.x && Math.abs(Math.abs(y - d.y) - 14) < 0.01 : y === d.y && Math.abs(Math.abs(x - d.x) - 14) < 0.01)),
      );
      expect(new Set(touching.map((w) => w.node)), d.id).toEqual(new Set([sw.a, sw.b]));
    }
  });
});
