"use client";

// Yutuqlar: ochilganlar va statistika (localStorage). Yangi ochilganlari bildirishnoma uchun navbatda turadi.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SCENARIO_CATALOG } from "../data/scenarios/catalog";
import { earnedAchievements, updateStats, type AchievementEvent, type AchievementStats } from "../engine/achievements";
import { persistStorage, STORAGE_PREFIX } from "../lib/storage";
import { useProgress } from "./progress";

interface AchievementsState extends AchievementStats {
  unlocked: Record<string, string>;
  /** Hali ko'rsatilmagan yangi yutuqlar (saqlanmaydi) */
  fresh: string[];
  report: (ev: AchievementEvent) => string[];
  dismissFresh: () => void;
  reset: () => void;
}

export const useAchievements = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: {},
      journalClean: [],
      minigameBest: {},
      fresh: [],
      report: (ev) => {
        const s = get();
        const stats = updateStats({ journalClean: s.journalClean, minigameBest: s.minigameBest }, ev);
        const earned = earnedAchievements(ev, stats, { results: useProgress.getState().results, catalog: SCENARIO_CATALOG });
        const now = new Date().toISOString();
        const added = earned.filter((id) => !s.unlocked[id]);
        set({
          ...stats,
          unlocked: { ...s.unlocked, ...Object.fromEntries(added.map((id) => [id, now])) },
          fresh: [...s.fresh, ...added],
        });
        return added;
      },
      dismissFresh: () => set({ fresh: [] }),
      reset: () => set({ unlocked: {}, journalClean: [], minigameBest: {}, fresh: [] }),
    }),
    {
      name: `${STORAGE_PREFIX}achievements`,
      storage: persistStorage,
      skipHydration: true,
      partialize: (s) => ({ unlocked: s.unlocked, journalClean: s.journalClean, minigameBest: s.minigameBest }) as AchievementsState,
    },
  ),
);
