import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage, STORAGE_PREFIX } from "../lib/storage";
import type { GameMode } from "./settings";

export interface ScenarioResult {
  bestScore: number;
  bestStars: 0 | 1 | 2 | 3;
  bestTimeSec: number | null;
  attempts: number;
  completed: boolean;
  lastMode: GameMode;
  lastPlayedAt: string;
}

export interface AttemptSummary {
  scenarioId: string;
  score: number;
  stars: 0 | 1 | 2 | 3;
  timeSec: number;
  completed: boolean;
  mode: GameMode;
}

interface ProgressState {
  results: Record<string, ScenarioResult>;
  savedAt: string | null;
  recordAttempt: (a: AttemptSummary) => void;
  markSaved: () => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      results: {},
      savedAt: null,
      recordAttempt: (a) =>
        set((s) => {
          const prev = s.results[a.scenarioId];
          const better = !prev || a.score > prev.bestScore;
          const next: ScenarioResult = {
            bestScore: better ? a.score : prev.bestScore,
            bestStars: (Math.max(prev?.bestStars ?? 0, a.stars) as ScenarioResult["bestStars"]),
            bestTimeSec:
              a.completed && (prev?.bestTimeSec == null || a.timeSec < prev.bestTimeSec)
                ? a.timeSec
                : (prev?.bestTimeSec ?? null),
            attempts: (prev?.attempts ?? 0) + 1,
            completed: (prev?.completed ?? false) || a.completed,
            lastMode: a.mode,
            lastPlayedAt: new Date().toISOString(),
          };
          return { results: { ...s.results, [a.scenarioId]: next }, savedAt: new Date().toISOString() };
        }),
      markSaved: () => set({ savedAt: new Date().toISOString() }),
      reset: () => set({ results: {}, savedAt: null }),
    }),
    { name: `${STORAGE_PREFIX}progress`, storage: persistStorage, skipHydration: true },
  ),
);
