import { describe, expect, it } from "vitest";
import { apvAttempt, blindReclosePenaltyApplies, earthFaultPhaseVoltages, earthFaultTimeLeftSec } from "./faults";
import { createRng, dailyLoadFactor, randomWeather } from "./events";

describe("yerga tutashuv (6–35 kV)", () => {
  it("metall tutashuv: shikastlangan faza 0, qolganlari chiziqli kuchlanishga ko'tariladi", () => {
    const u = earthFaultPhaseVoltages(10, "A", 1);
    expect(u.A).toBeCloseTo(0, 9);
    expect(u.B).toBeCloseTo(10, 9);
    expect(u.C).toBeCloseTo(10, 9);
  });
  it("tutashuv yo'q: hammasi fazaviy kuchlanish", () => {
    const u = earthFaultPhaseVoltages(10, "B", 0);
    expect(u.B).toBeCloseTo(10 / Math.sqrt(3), 9);
  });
  it("taymer kamayadi", () => {
    expect(earthFaultTimeLeftSec(0, 600)).toBeLessThan(earthFaultTimeLeftSec(0, 0));
  });
});

describe("110 kV QT va APV", () => {
  it("seed bilan takrorlanuvchi", () => {
    expect(apvAttempt(createRng(42))).toBe(apvAttempt(createRng(42)));
  });
  it("ehtimollik chegaralari", () => {
    expect(apvAttempt(createRng(1), 1)).toBe("success");
    expect(apvAttempt(createRng(1), 0)).toBe("fail");
  });
  it("APV muvaffaqiyatsizdan keyin ko'r-ko'rona ulash jazolanadi", () => {
    expect(blindReclosePenaltyApplies("fail", false, false)).toBe(true);
    expect(blindReclosePenaltyApplies("fail", true, true)).toBe(false);
    expect(blindReclosePenaltyApplies("success", false, false)).toBe(false);
  });
});

describe("hodisalar generatori", () => {
  it("RNG 0..1 oralig'ida va takrorlanuvchi", () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("yozda qor yo'q", () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) expect(randomWeather(rng, "summer")).not.toBe("snow");
  });
  it("yuklama grafigi interpolyatsiyasi", () => {
    expect(dailyLoadFactor(18, "winter")).toBe(1);
    expect(dailyLoadFactor(12.5, "summer")).toBeCloseTo(1, 9);
  });
});
