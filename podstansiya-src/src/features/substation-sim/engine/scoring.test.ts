import { describe, expect, it } from "vitest";
import { computeScore, starsFor } from "./scoring";

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
});
