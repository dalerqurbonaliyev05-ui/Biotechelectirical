import { describe, expect, it } from "vitest";
import { availableSteps, matchStep, missingRequired, validateSteps } from "./sequence";
import type { StepDef } from "./scenario";

const steps: StepDef[] = [
  { id: "a", label: "A", match: { type: "switch", deviceId: "Q-T1-10", to: "open" }, explain: "" },
  { id: "b", label: "B", match: { type: "switch", deviceId: "Q-T1-35", to: "open" }, explain: "" },
  { id: "c", label: "C", match: { type: "switch", deviceId: "Q-T1-110", to: "open" }, after: ["a", "b"], explain: "" },
  { id: "o", label: "O", optional: true, match: { type: "checkPosition", deviceId: "Q-T1-110" }, after: ["c"], explain: "" },
  { id: "d", label: "D", match: [{ type: "journal" }, { type: "report", messageId: "m" }], after: ["c", "o"], explain: "" },
];

describe("sequence", () => {
  it("bir nechta to'g'ri tartib: a→b→c va b→a→c", () => {
    expect(matchStep(steps, ["a", "b"], { type: "switch", deviceId: "Q-T1-110", to: "open" }).missingBefore).toEqual([]);
    expect(matchStep(steps, ["b"], { type: "switch", deviceId: "Q-T1-10", to: "open" }).step?.id).toBe("a");
  });

  it("noto'g'ri tartib aniqlanadi", () => {
    const m = matchStep(steps, ["a"], { type: "switch", deviceId: "Q-T1-110", to: "open" });
    expect(m.step?.id).toBe("c");
    expect(m.missingBefore).toEqual(["b"]);
  });

  it("ixtiyoriy qadam tartibga ta'sir qilmaydi", () => {
    expect(matchStep(steps, ["a", "b", "c"], { type: "journal", entry: { time: "", from: "", orderText: "", doneText: "", executor: "" } }).missingBefore).toEqual([]);
  });

  it("anyOf muqobillar", () => {
    expect(matchStep(steps, ["a", "b", "c"], { type: "report", messageId: "m" }).step?.id).toBe("d");
  });

  it("takror va mos kelmaydigan amal", () => {
    expect(matchStep(steps, ["a"], { type: "switch", deviceId: "Q-T1-10", to: "open" }).repeat).toBe(true);
    expect(matchStep(steps, [], { type: "switch", deviceId: "Q-F10-1", to: "open" }).step).toBeNull();
  });

  it("qolgan va mavjud qadamlar", () => {
    expect(missingRequired(steps, ["a"]).map((s) => s.id)).toEqual(["b", "c", "d"]);
    expect(availableSteps(steps, ["a", "b"]).map((s) => s.id)).toEqual(["c"]);
  });

  it("validateSteps sikl va noma'lum havolani topadi", () => {
    expect(validateSteps(steps)).toEqual([]);
    expect(validateSteps([{ ...steps[0], after: ["x"] }]).length).toBe(1);
    expect(
      validateSteps([
        { ...steps[0], after: ["b"] },
        { ...steps[1], after: ["a"] },
      ]),
    ).toContain("qadamlar orasida sikl bor");
  });
});
