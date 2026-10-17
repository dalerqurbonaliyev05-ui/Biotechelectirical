import { describe, expect, it } from "vitest";
import { isLevelUnlocked, type ScenarioMeta } from "./catalog";

const cat: ScenarioMeta[] = [
  { id: "A", level: 1, title: "", objective: "", playable: true },
  { id: "B", level: 1, title: "", objective: "", playable: true },
  { id: "C", level: 2, title: "", objective: "", playable: true },
  { id: "D", level: 3, title: "", objective: "", playable: false },
];

describe("isLevelUnlocked", () => {
  it("1-daraja doim ochiq", () => {
    expect(isLevelUnlocked(1, () => false, cat)).toBe(true);
  });
  it("oldingi daraja to'liq bajarilmasa yopiq", () => {
    expect(isLevelUnlocked(2, (id) => id === "A", cat)).toBe(false);
    expect(isLevelUnlocked(2, (id) => id === "A" || id === "B", cat)).toBe(true);
  });
  it("zanjir bo'yicha tekshiradi", () => {
    expect(isLevelUnlocked(3, (id) => id === "C", cat)).toBe(false);
    expect(isLevelUnlocked(3, () => true, cat)).toBe(true);
  });
});
