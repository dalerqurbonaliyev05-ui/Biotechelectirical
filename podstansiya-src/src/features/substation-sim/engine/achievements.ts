// Yutuqlarni baholash (UI'siz): hodisa + to'plangan statistika → bajarilgan yutuqlar ro'yxati.

import { ACHIEVEMENT_RULES as R } from "../data/achievements";

export type AchievementEvent =
  | {
      type: "scenario";
      scenarioId: string;
      mode: "training" | "practice" | "exam";
      score: number;
      stars: number;
      completed: boolean;
      timeSec: number;
      penaltyCodes: string[];
      journalRequired: boolean;
    }
  | { type: "minigame"; kind: string; score: number }
  | { type: "quiz"; right: number; total: number };

export interface AchievementStats {
  /** Jurnal xatosiz bajarilgan stsenariylar */
  journalClean: string[];
  /** Mini-o'yinlar bo'yicha eng yaxshi ball */
  minigameBest: Record<string, number>;
}

export interface ProgressView {
  results: Record<string, { completed: boolean; bestStars: number }>;
  catalog: Array<{ id: string; level: number; playable: boolean }>;
}

/** Hodisani statistikaga qo'shadi (yangi obyekt qaytaradi). */
export function updateStats(stats: AchievementStats, ev: AchievementEvent): AchievementStats {
  if (ev.type === "scenario" && ev.completed && ev.journalRequired && !ev.penaltyCodes.some((c) => c.startsWith("journal")) && !stats.journalClean.includes(ev.scenarioId)) {
    return { ...stats, journalClean: [...stats.journalClean, ev.scenarioId] };
  }
  if (ev.type === "minigame" && ev.score > (stats.minigameBest[ev.kind] ?? -1)) {
    return { ...stats, minigameBest: { ...stats.minigameBest, [ev.kind]: ev.score } };
  }
  return stats;
}

/** Shu hodisa va holatda bajarilgan yutuqlar (oldin ochilganlari ham kirishi mumkin — saqlovchi filtrlaydi). */
export function earnedAchievements(ev: AchievementEvent, stats: AchievementStats, progress: ProgressView): string[] {
  const out: string[] = [];
  const done = (id: string) => progress.results[id]?.completed ?? false;
  const playable = progress.catalog.filter((s) => s.playable);

  if (ev.type === "scenario" && ev.completed && ev.stars > 0) {
    out.push("firstShift");
    if (ev.score >= 100) out.push("flawless");
    if (ev.timeSec <= R.fastSec && ev.stars >= R.fastMinStars) out.push("fastDispatcher");
    if (ev.mode === "exam" && ev.stars >= R.examMinStars) out.push("examPassed");
    if (ev.scenarioId === "S21" && ev.stars >= R.shiftMinStars) out.push("shiftMaster");
    if (ev.scenarioId === "S16") out.push("emergency");
  }
  if (stats.journalClean.length >= R.journalCleanCount) out.push("journalMaster");
  if ([1, 2, 3, 4].every((lv) => playable.some((s) => s.level === lv && done(s.id)))) out.push("allLevels");
  if (playable.filter((s) => (progress.results[s.id]?.bestStars ?? 0) >= 3).length >= R.threeStarCount) out.push("threeStars");
  if (playable.length > 0 && playable.every((s) => done(s.id))) out.push("chief");

  const best = stats.minigameBest;
  if ((best.inspection ?? 0) >= 100) out.push("inspector");
  if ((best.megger ?? 0) >= 100) out.push("meggerPro");
  if ((best.oilSample ?? 0) >= R.labMin && (best.gasSample ?? 0) >= R.labMin) out.push("labTech");
  if (ev.type === "quiz" && ev.right >= R.quizMin) out.push("markExpert");
  return out;
}
