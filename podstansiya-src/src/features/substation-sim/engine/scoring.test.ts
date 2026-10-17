import { describe, expect, it } from "vitest";
import { NORMS } from "../data/norms";
import { TOPOLOGY } from "../data/equipment";
import { createInitialState } from "./state";
import { computeScore, outageSummary, starsFor } from "./scoring";

describe("scoring", () => {
  it("100 dan boshlanadi, 0 dan tushmaydi", () => {
    expect(computeScore([])).toBe(100);
    expect(computeScore([{ t: 0, code: "x", points: 30 }])).toBe(70);
    expect(computeScore([{ t: 0, code: "x", points: 300 }])).toBe(0);
  });
  it("yulduzlar", () => {
    expect(starsFor(95, false)).toBe(3);
    expect(starsFor(75, false)).toBe(2);
    expect(starsFor(55, false)).toBe(1);
    expect(starsFor(30, false)).toBe(0);
    expect(starsFor(100, true)).toBe(0);
  });

  it("uzilish zarari: daqiqa × MVt × toifa narxi, rejali uzilish hisobga olinmaydi", () => {
    const l = TOPOLOGY.loads[0];
    const other = TOPOLOGY.loads[1];
    const st = createInitialState(TOPOLOGY);
    st.outageMin = { [l.id]: 10, [other.id]: 5 };
    const price = NORMS.outageCostPerMwMin.value as Record<number, number>;
    const r = outageSummary(TOPOLOGY, st, [other.id]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows.find((x) => x.loadId === other.id)?.planned).toBe(true);
    expect(r.totalCost).toBeCloseTo(10 * l.mw * price[l.category]);
  });
});
