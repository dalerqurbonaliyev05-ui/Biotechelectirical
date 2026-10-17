import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage, STORAGE_PREFIX } from "../lib/storage";

export type GameMode = "training" | "practice" | "exam";
export type Difficulty = 1 | 2 | 3 | 4;

export interface SettingsState {
  language: "uz";
  mode: GameMode;
  difficulty: Difficulty;
  sound: boolean;
  animations: boolean;
  showLabels: boolean;
  /** Reyting uchun o'yinchi ismi (bo'sh bo'lsa — "O'yinchi") */
  playerName: string;
  setMode: (mode: GameMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setSound: (v: boolean) => void;
  setAnimations: (v: boolean) => void;
  setShowLabels: (v: boolean) => void;
  setPlayerName: (v: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: "uz",
      mode: "training",
      difficulty: 1,
      sound: false,
      animations: true,
      showLabels: true,
      playerName: "",
      setMode: (mode) => set({ mode }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setSound: (sound) => set({ sound }),
      setAnimations: (animations) => set({ animations }),
      setShowLabels: (showLabels) => set({ showLabels }),
      setPlayerName: (playerName) => set({ playerName: playerName.slice(0, 24) }),
    }),
    // Statik eksportda server HTML bilan mos kelishi uchun qayta tiklash Providers ichida qo'lda.
    { name: `${STORAGE_PREFIX}settings`, storage: persistStorage, skipHydration: true },
  ),
);
