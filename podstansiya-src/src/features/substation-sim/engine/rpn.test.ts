import { describe, expect, it } from "vitest";
import { getModel } from "../data/transformers";
import { checkTap, lvVoltage, nextTap } from "./rpn";

const model = getModel("TDTN-25000/110");

describe("RPN", () => {
  it("salt yurishda nominal pog'onada 115 kV → 11 kV", () => {
    expect(lvVoltage({ sourceKv: 115, tap: 0, model, k: 0 })).toBeCloseTo(11, 9);
  });

  it("kuchlanishni oshirish (dir=+1) pog'ona raqamini kamaytiradi va U2 ni oshiradi", () => {
    const t = nextTap(0, 1);
    expect(t).toBe(-1);
    expect(lvVoltage({ sourceKv: 110, tap: t, model, k: 0.5 })).toBeGreaterThan(lvVoltage({ sourceKv: 110, tap: 0, model, k: 0.5 }));
  });

  it("yuklama ortsa kuchlanish pasayadi", () => {
    expect(lvVoltage({ sourceKv: 110, tap: 0, model, k: 1 })).toBeLessThan(lvVoltage({ sourceKv: 110, tap: 0, model, k: 0.2 }));
  });

  it("chegaralar: band, oxirgi pog'ona, yuqori tok", () => {
    const base = { tap: 0, dir: 1 as const, model, k: 0.5, now: 100, busyUntil: 0 };
    expect(checkTap(base).ok).toBe(true);
    expect(checkTap({ ...base, busyUntil: 105 })).toEqual({ ok: false, code: "rpnBusy" });
    expect(checkTap({ ...base, tap: -9 })).toEqual({ ok: false, code: "rpnLimit" });
    expect(checkTap({ ...base, k: 1.5 })).toEqual({ ok: false, code: "rpnBlockedHighCurrent" });
  });
});
