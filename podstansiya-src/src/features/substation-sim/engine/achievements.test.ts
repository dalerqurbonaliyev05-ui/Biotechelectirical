import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_RULES as R, ACHIEVEMENTS } from "../data/achievements";
import { SCENARIO_CATALOG } from "../data/scenarios/catalog";
import { earnedAchievements, updateStats, type AchievementEvent, type AchievementStats, type ProgressView } from "./achievements";

const empty: AchievementStats = { journalClean: [], minigameBest: {} };
const prog = (results: ProgressView["results"] = {}): ProgressView => ({ results, catalog: SCENARIO_CATALOG });
const sc = (o: Partial<Extract<AchievementEvent, { type: "scenario" }>> = {}): AchievementEvent => ({
  type: "scenario",
  scenarioId: "S01",
  mode: "training",
  score: 80,
  stars: 2,
  completed: true,
  timeSec: 900,
  penaltyCodes: ["wrongOrder"],
  journalRequired: false,
  ...o,
});

describe("yutuqlar", () => {
  it("barcha yutuq identifikatorlari ro'yxatda bor va takrorlanmaydi", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("birinchi smena, xatosiz, tez dispetcher, imtihon", () => {
    expect(earnedAchievements(sc(), empty, prog())).toEqual(["firstShift"]);
    expect(earnedAchievements(sc({ score: 100, penaltyCodes: [] }), empty, prog())).toContain("flawless");
    expect(earnedAchievements(sc({ timeSec: R.fastSec }), empty, prog())).toContain("fastDispatcher");
    expect(earnedAchievements(sc({ timeSec: R.fastSec, stars: 1 }), empty, prog())).not.toContain("fastDispatcher");
    expect(earnedAchievements(sc({ mode: "exam" }), empty, prog())).toContain("examPassed");
    expect(earnedAchievements(sc({ completed: false, stars: 0 }), empty, prog())).toEqual([]);
  });
  it("jurnal ustasi: jurnal xatosiz stsenariylar hisoblanadi, takror hisoblanmaydi", () => {
    let st = empty;
    for (const id of ["S02", "S02", "S03", "S04", "S05"]) st = updateStats(st, sc({ scenarioId: id, journalRequired: true, penaltyCodes: [] }));
    st = updateStats(st, sc({ scenarioId: "S06", journalRequired: true, penaltyCodes: ["journalTime"] }));
    expect(st.journalClean).toEqual(["S02", "S03", "S04", "S05"]);
    expect(earnedAchievements(sc(), st, prog())).not.toContain("journalMaster");
    st = updateStats(st, sc({ scenarioId: "S07", journalRequired: true, penaltyCodes: [] }));
    expect(earnedAchievements(sc(), st, prog())).toContain("journalMaster");
  });
  it("darajalar va barcha stsenariylar", () => {
    const one = Object.fromEntries(["S01", "S06", "S11", "S16"].map((id) => [id, { completed: true, bestStars: 3 }]));
    const got = earnedAchievements(sc(), empty, prog(one));
    expect(got).toContain("allLevels");
    expect(got).not.toContain("chief");
    const all = Object.fromEntries(SCENARIO_CATALOG.map((s) => [s.id, { completed: true, bestStars: 3 }]));
    expect(earnedAchievements(sc(), empty, prog(all))).toEqual(expect.arrayContaining(["chief", "threeStars", "allLevels"]));
  });
  it("mini-o'yinlar va viktorina", () => {
    let st = updateStats(empty, { type: "minigame", kind: "oilSample", score: R.labMin });
    expect(earnedAchievements({ type: "minigame", kind: "oilSample", score: R.labMin }, st, prog())).not.toContain("labTech");
    st = updateStats(st, { type: "minigame", kind: "gasSample", score: 100 });
    st = updateStats(st, { type: "minigame", kind: "gasSample", score: 10 });
    expect(st.minigameBest.gasSample).toBe(100);
    expect(earnedAchievements({ type: "minigame", kind: "gasSample", score: 10 }, st, prog())).toContain("labTech");
    expect(earnedAchievements({ type: "quiz", right: R.quizMin, total: 10 }, empty, prog())).toEqual(["markExpert"]);
  });
});
