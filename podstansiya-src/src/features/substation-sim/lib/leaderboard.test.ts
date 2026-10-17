import { describe, expect, it } from "vitest";
import { cleanName, DEFAULT_NAME, LocalLeaderboard, periodStart, prune, rankOverall, rankScenario, type KeyValueStorage, type LeaderboardEntry } from "./leaderboard";

const memory = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const NOW = new Date("2026-10-17T12:00:00").getTime();
const DAY = 86400000;
let n = 0;
const e = (o: Partial<LeaderboardEntry>): LeaderboardEntry => ({ id: `e${++n}`, scenarioId: "S01", name: "Ali", score: 80, stars: 2, timeSec: 300, mode: "training", at: NOW, ...o });

describe("reyting", () => {
  it("ism tozalanadi", () => {
    expect(cleanName("  Ali   Valiyev ")).toBe("Ali Valiyev");
    expect(cleanName("   ")).toBe(DEFAULT_NAME);
    expect(cleanName("x".repeat(40))).toHaveLength(24);
  });
  it("stsenariy reytingi: har o'yinchidan eng yaxshisi; teng ballda tezrog'i yuqori", () => {
    const list = [e({ name: "Ali", score: 70 }), e({ name: "Ali", score: 90 }), e({ name: "Vali", score: 90, timeSec: 200 }), e({ name: "Gul", score: 60 }), e({ scenarioId: "S02", name: "Zeb", score: 100 })];
    const r = rankScenario(list, "S01", "all", "all", NOW);
    expect(r.map((x) => `${x.name}:${x.score}`)).toEqual(["Vali:90", "Ali:90", "Gul:60"]);
  });
  it("davr va rejim filtri", () => {
    const list = [e({ name: "Eski", score: 100, at: NOW - 10 * DAY }), e({ name: "Hafta", score: 90, at: NOW - 3 * DAY }), e({ name: "Bugun", score: 50 }), e({ name: "Imtihon", score: 40, mode: "exam" })];
    expect(rankScenario(list, "S01", "all", "all", NOW)).toHaveLength(4);
    expect(rankScenario(list, "S01", "week", "all", NOW).map((x) => x.name)).toEqual(["Hafta", "Bugun", "Imtihon"]);
    expect(rankScenario(list, "S01", "day", "all", NOW).map((x) => x.name)).toEqual(["Bugun", "Imtihon"]);
    expect(rankScenario(list, "S01", "all", "exam", NOW).map((x) => x.name)).toEqual(["Imtihon"]);
    expect(periodStart("day", NOW)).toBe(new Date("2026-10-17T00:00:00").getTime());
  });
  it("umumiy reyting: stsenariylar bo'yicha eng yaxshi ballar yig'indisi", () => {
    const list = [e({ name: "Ali", scenarioId: "S01", score: 80 }), e({ name: "Ali", scenarioId: "S01", score: 90 }), e({ name: "Ali", scenarioId: "S02", score: 70 }), e({ name: "Vali", scenarioId: "S01", score: 100 })];
    const r = rankOverall(list, "all", "all", NOW);
    expect(r.map((x) => [x.name, x.total, x.scenarios])).toEqual([
      ["Ali", 160, 2],
      ["Vali", 100, 1],
    ]);
  });
  it("qisqartirish: eng yaxshisi va so'nggi hafta saqlanadi", () => {
    const old = [e({ score: 100, at: NOW - 30 * DAY }), e({ score: 10, at: NOW - 30 * DAY }), e({ score: 20, at: NOW - DAY })];
    const kept = prune(old, NOW);
    expect(kept.map((x) => x.score).sort()).toEqual([100, 20]);
  });
  it("LocalLeaderboard: yozish, o'qish, nomini o'zgartirish, tozalash; buzilgan ma'lumotga chidamli", async () => {
    const st = memory();
    const lb = new LocalLeaderboard(st, () => NOW);
    const a = await lb.submit({ scenarioId: "S01", name: "  ", score: 85, stars: 2, timeSec: 400, mode: "training" });
    expect(a.name).toBe(DEFAULT_NAME);
    await lb.rename(a.id, "Dilnoza");
    expect((await lb.top("S01", "all", "all"))[0].name).toBe("Dilnoza");
    expect((await lb.overall("all", "all"))[0].total).toBe(85);
    await lb.clear();
    expect(await lb.top("S01", "all", "all")).toEqual([]);
    st.setItem("podstansiya-sim:v1:leaderboard", "{buzilgan");
    expect(await lb.top("S01", "all", "all")).toEqual([]);
  });
});
