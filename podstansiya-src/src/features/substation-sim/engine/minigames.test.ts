import { describe, expect, it } from "vitest";
import { INSPECTION_CASES, INSPECTION_SPOTS, OIL_PRACTICE } from "../data/minigames";
import { NORMS, THERMAL } from "../data/norms";
import { S10 } from "../data/scenarios/S10";
import { buildShiftScenario } from "../data/scenarios/S21";
import { captureOk, checkInspection, gasTypeOf, oilVerdict, parseNum, rampSeconds, thermoState } from "./minigames";

describe("mini-o'yinlar mantig'i", () => {
  it("sonni matndan o'qish", () => {
    expect(parseNum("29 kV")).toBe(29);
    expect(parseNum("0,07 mg KOH/g")).toBe(0.07);
    expect(parseNum("≈150 sm³")).toBe(150);
    expect(parseNum("yo'q")).toBeNaN();
  });
  it("gaz turi stsenariy natijalaridan aniqlanadi", () => {
    expect(gasTypeOf(S10.measurements![0].variants[0].values)).toBe("paper");
    for (let seed = 1; seed < 30; seed++) {
      for (const m of buildShiftScenario(seed).measurements ?? []) if (m.kind === "gasSample") expect(gasTypeOf(m.variants[0].values)).toBe("air");
    }
    expect(gasTypeOf({ Rangi: "kulrang-oq" })).toBe("carton");
    expect(gasTypeOf({ Rangi: "qora" })).toBe("arc");
  });
  it("moy sinovi: S08 variantlari me'yorlar bilan to'g'ri baholanadi", () => {
    const byCat = Object.fromEntries(OIL_PRACTICE.map((v) => [v.category, oilVerdict(v.values)]));
    expect(byCat.ok.fit).toBe(true);
    expect(byCat.wet.fit).toBe(false);
    expect(byCat.wet.checks.find((c) => c.key === "breakdown")?.ok).toBe(false);
    expect(byCat.aged.checks.find((c) => c.key === "acid")?.ok).toBe(false);
    expect(rampSeconds(NORMS.oilBreakdownRampKvPerSec.value * 10)).toBe(10);
  });
  it("ko'rik: topilgan, o'tkazib yuborilgan, ortiqcha", () => {
    const d = INSPECTION_CASES.leak;
    expect(d.every((x) => INSPECTION_SPOTS.some((s) => s.id === x))).toBe(true);
    expect(checkInspection(d, d).ok).toBe(true);
    const r = checkInspection(["gauge", "fans"], d);
    expect(r.found).toEqual(["gauge"]);
    expect(r.falseAlarms).toEqual(["fans"]);
    expect(r.missed).toEqual(["radiators", "pit"]);
  });
  it("termometr holati THERMAL chegaralari bo'yicha", () => {
    const t = THERMAL.D;
    expect(thermoState(t.topOilAlarmC.value - 1, "D")).toBe("normal");
    expect(thermoState(t.topOilAlarmC.value, "D")).toBe("alarm");
    expect(thermoState(t.topOilMaxC.value + 1, "D")).toBe("over");
  });
  it("megger ko'rsatkichini yozib olish oynasi", () => {
    const w = NORMS.meggerCaptureWindowSec.value;
    expect(captureOk(15 + w, 15)).toBe(true);
    expect(captureOk(15 + w + 1, 15)).toBe(false);
  });
});
