import { describe, expect, it } from "vitest";
import { getModel, type TransformerModel } from "../data/transformers";
import { checkParallel } from "./parallel";

const base = getModel("TDTN-25000/110");
const variant = (over: Partial<TransformerModel>): TransformerModel => ({ ...base, ...over });

describe("parallel ishlash shartlari", () => {
  it("bir xil transformatorlar, bir xil pog'ona — shartlar bajariladi, yuklama teng", () => {
    const r = checkParallel({ model: base, tap: 0 }, { model: base, tap: 0 });
    expect(r.ok).toBe(true);
    expect(r.circulatingCurrentPct).toBeCloseTo(0, 9);
    expect(r.loadShare[0]).toBeCloseTo(0.5, 9);
  });

  it("pog'onalar farqi katta — koeffitsient sharti buziladi va aylanma tok paydo bo'ladi", () => {
    const r = checkParallel({ model: base, tap: 0 }, { model: base, tap: 3 });
    expect(r.issues).toContain("ratio");
    expect(r.circulatingCurrentPct).toBeGreaterThan(10);
  });

  it("ulanish guruhi har xil — parallel ulash mumkin emas", () => {
    const r = checkParallel({ model: base, tap: 0 }, { model: variant({ vectorGroup: { ...base.vectorGroup, value: "Yn/Yn/Δ-0-1" } }), tap: 0 });
    expect(r.issues).toContain("vectorGroup");
    expect(r.circulatingCurrentPct).toBe(Infinity);
  });

  it("uk% va quvvatlar nisbati", () => {
    const small = variant({ ratedMva: { ...base.ratedMva, value: 6.3 }, ukPct: { ...base.ukPct, value: { "hv-lv": 10.5 } } });
    const r = checkParallel({ model: base, tap: 0 }, { model: small, tap: 0 });
    expect(r.issues).toEqual(expect.arrayContaining(["uk", "powerRatio"]));
  });
});
