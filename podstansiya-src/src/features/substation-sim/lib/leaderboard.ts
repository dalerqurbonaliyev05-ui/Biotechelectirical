// Reyting: `Leaderboard` interfeysi va LocalLeaderboard (shu qurilmadagi natijalar, localStorage).
// Server reytingi kerak bo'lsa (masalan Supabase): `SupabaseLeaderboard implements Leaderboard` yoziladi —
// submit → insert, top/overall → select ... order by score desc, time asc — va pastdagi `leaderboard`
// eksporti almashtiriladi. Sahifa va o'yin kodi o'zgarmaydi (hamma usullar asinxron).

import type { GameMode } from "../store/settings";
import { STORAGE_PREFIX } from "./storage";

export interface LeaderboardEntry {
  id: string;
  scenarioId: string;
  name: string;
  score: number;
  stars: number;
  timeSec: number;
  mode: GameMode;
  /** Unix ms */
  at: number;
}

export type Period = "day" | "week" | "all";
export type ModeFilter = "all" | GameMode;

export interface OverallRow {
  name: string;
  /** Har stsenariy bo'yicha eng yaxshi ballar yig'indisi */
  total: number;
  stars: number;
  scenarios: number;
  lastAt: number;
}

export interface Leaderboard {
  submit(entry: Omit<LeaderboardEntry, "id" | "at">): Promise<LeaderboardEntry>;
  top(scenarioId: string, period: Period, mode: ModeFilter, limit?: number): Promise<LeaderboardEntry[]>;
  overall(period: Period, mode: ModeFilter, limit?: number): Promise<OverallRow[]>;
  rename(id: string, name: string): Promise<void>;
  clear(): Promise<void>;
}

export const DEFAULT_NAME = "O'yinchi";
const KEY = `${STORAGE_PREFIX}leaderboard`;
const DAY = 24 * 60 * 60 * 1000;
/** Saqlanadigan yozuvlar chegarasi (localStorage hajmi uchun) */
const MAX_ENTRIES = 600;

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 24) || DEFAULT_NAME;
}

export function periodStart(period: Period, now: number): number {
  if (period === "all") return 0;
  if (period === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return now - 7 * DAY;
}

/** Ball (kamayish), vaqt (o'sish), sana (avvalgisi) bo'yicha. */
export function byRank(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.score - a.score || a.timeSec - b.timeSec || a.at - b.at;
}

const inFilter = (e: LeaderboardEntry, period: Period, mode: ModeFilter, now: number) => e.at >= periodStart(period, now) && (mode === "all" || e.mode === mode);

/** Stsenariy reytingi: har o'yinchidan eng yaxshi natija. */
export function rankScenario(entries: LeaderboardEntry[], scenarioId: string, period: Period, mode: ModeFilter, now: number, limit = 10): LeaderboardEntry[] {
  const best = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    if (e.scenarioId !== scenarioId || !inFilter(e, period, mode, now)) continue;
    const prev = best.get(e.name);
    if (!prev || byRank(e, prev) < 0) best.set(e.name, e);
  }
  return [...best.values()].sort(byRank).slice(0, limit);
}

/** Umumiy reyting: o'yinchi bo'yicha har stsenariydagi eng yaxshi ball yig'indisi. */
export function rankOverall(entries: LeaderboardEntry[], period: Period, mode: ModeFilter, now: number, limit = 20): OverallRow[] {
  const per = new Map<string, Map<string, LeaderboardEntry>>();
  for (const e of entries) {
    if (!inFilter(e, period, mode, now)) continue;
    const m = per.get(e.name) ?? new Map<string, LeaderboardEntry>();
    const prev = m.get(e.scenarioId);
    if (!prev || byRank(e, prev) < 0) m.set(e.scenarioId, e);
    per.set(e.name, m);
  }
  const rows: OverallRow[] = [...per.entries()].map(([name, m]) => {
    const list = [...m.values()];
    return {
      name,
      total: list.reduce((a, x) => a + x.score, 0),
      stars: list.reduce((a, x) => a + x.stars, 0),
      scenarios: list.length,
      lastAt: Math.max(...list.map((x) => x.at)),
    };
  });
  return rows.sort((a, b) => b.total - a.total || b.stars - a.stars || a.lastAt - b.lastAt).slice(0, limit);
}

/**
 * Saqlashdan oldin qisqartirish: har (o'yinchi, stsenariy, rejim) uchun eng yaxshi natija va
 * so'nggi 7 kundagi barcha natijalar qoladi (kun/hafta filtri uchun), umumiy son chegaralanadi.
 */
export function prune(entries: LeaderboardEntry[], now: number): LeaderboardEntry[] {
  const best = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    const k = `${e.name}|${e.scenarioId}|${e.mode}`;
    const prev = best.get(k);
    if (!prev || byRank(e, prev) < 0) best.set(k, e);
  }
  const keep = new Set([...best.values()].map((e) => e.id));
  return entries
    .filter((e) => keep.has(e.id) || e.at >= now - 7 * DAY)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ENTRIES);
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage xavfsiz o'ramasi: mavjud bo'lmasa yoki taqiqlangan bo'lsa — jim o'tadi. */
const browserStorage: KeyValueStorage = {
  getItem: (k) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* saqlab bo'lmadi */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* e'tiborsiz */
    }
  },
};

export class LocalLeaderboard implements Leaderboard {
  constructor(
    private storage: KeyValueStorage = browserStorage,
    private now: () => number = Date.now,
  ) {}

  private load(): LeaderboardEntry[] {
    try {
      const v: unknown = JSON.parse(this.storage.getItem(KEY) ?? "[]");
      return Array.isArray(v) ? (v as LeaderboardEntry[]).filter((e) => e && typeof e.score === "number" && typeof e.name === "string") : [];
    } catch {
      return [];
    }
  }

  private save(list: LeaderboardEntry[]) {
    this.storage.setItem(KEY, JSON.stringify(list));
  }

  async submit(e: Omit<LeaderboardEntry, "id" | "at">): Promise<LeaderboardEntry> {
    const at = this.now();
    const entry: LeaderboardEntry = { ...e, name: cleanName(e.name), id: `${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, at };
    this.save(prune([...this.load(), entry], at));
    return entry;
  }

  async top(scenarioId: string, period: Period, mode: ModeFilter, limit = 10) {
    return rankScenario(this.load(), scenarioId, period, mode, this.now(), limit);
  }

  async overall(period: Period, mode: ModeFilter, limit = 20) {
    return rankOverall(this.load(), period, mode, this.now(), limit);
  }

  async rename(id: string, name: string) {
    this.save(this.load().map((e) => (e.id === id ? { ...e, name: cleanName(name) } : e)));
  }

  async clear() {
    this.storage.removeItem(KEY);
  }
}

export const leaderboard: Leaderboard = new LocalLeaderboard();
