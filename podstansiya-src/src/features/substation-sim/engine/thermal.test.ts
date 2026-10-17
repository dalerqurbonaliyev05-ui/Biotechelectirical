import { describe, expect, it } from "vitest";
import { THERMAL } from "../data/norms";
import { agingRate, effectiveCooling, fansShouldRun, hotSpot, steadyTopOil, stepTopOil, thermalStatus, ultimateTopOilRise } from "./thermal";

describe("thermal", () => {
  it("nominal yuklamada moy ortishi nominal qiymatga teng", () => {
    expect(ultimateTopOilRise(1, THERMAL.D)).toBeCloseTo(THERMAL.D.topOilRiseK.value, 6);
  });

  it("yuklama oshsa harorat oshadi", () => {
    expect(steadyTopOil(25, 1.2, THERMAL.D)).toBeGreaterThan(steadyTopOil(25, 1.0, THERMAL.D));
  });

  it("inersiya: bir vaqt doimiysidan keyin farqning ~63% i bosib o'tiladi", () => {
    const p = THERMAL.D;
    const target = steadyTopOil(25, 1, p);
    const after = stepTopOil(25, 25, 1, p, p.tauOilMin.value * 60);
    expect((after - 25) / (target - 25)).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it("ventilyatorlar o'chiq — ekvivalent quvvat kamayadi va M parametrlari ishlatiladi", () => {
    const off = effectiveCooling("D", false);
    expect(off.ratingFactor).toBeLessThan(1);
    expect(off.params).toBe(THERMAL.M);
    expect(effectiveCooling("D", true).ratingFactor).toBe(1);
  });

  it("eskirish: 98 °C da 1, har 6 K da ikki barobar", () => {
    expect(agingRate(98)).toBeCloseTo(1, 9);
    expect(agingRate(104)).toBeCloseTo(2, 9);
  });

  it("eng qizigan nuqta moydan yuqori", () => {
    expect(hotSpot(80, 1, THERMAL.D)).toBeCloseTo(80 + THERMAL.D.hotSpotGradientK.value, 9);
  });

  it("ventilyator avtomatikasi va harorat holati", () => {
    expect(fansShouldRun(40, 0.5)).toBe(false);
    expect(fansShouldRun(60, 0.5)).toBe(true);
    expect(fansShouldRun(40, 1.05)).toBe(true);
    expect(thermalStatus(60, "D")).toBe("normal");
    expect(thermalStatus(90, "D")).toBe("alarm");
    expect(thermalStatus(96, "D")).toBe("overLimit");
  });
});
