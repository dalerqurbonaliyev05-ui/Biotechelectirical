// O'yin natijalari, statistika va yutuqlarni yagona joyda yangilaydi.
import { useMemo } from "react";
import type { Slug } from "@/data/catalog";
import { ACHIEVEMENTS, type Achievement } from "./achievements";
import { leaderboard, type LeaderboardEntry } from "./leaderboard";
import { readJSON, useStored, writeJSON } from "./storage";

export interface Stats {
  plays: Partial<Record<Slug, number>>;
  best: Partial<Record<Slug, number>>;
  total: number;
  last?: { slug: Slug; at: number };
  counters: Record<string, number>;
  flags: Record<string, boolean>;
  seen: Record<string, string[]>;
}

export interface GameResult {
  score: number;
  detail?: string;
  /** Yutuqlar uchun belgilar, masalan "arqon:hard" */
  flags?: string[];
  /** Reytingga yozilmasin (masalan 2 kishilik rejim) */
  noLeaderboard?: boolean;
}

export interface FinishInfo {
  entry: LeaderboardEntry | null;
  isBest: boolean;
  prevBest?: number;
}

const STATS_KEY = "stats";
const ACH_KEY = "achievements";
export const NAME_KEY = "player-name";

const EMPTY_STATS: Stats = { plays: {}, best: {}, total: 0, counters: {}, flags: {}, seen: {} };
const EMPTY_UNLOCKED: Record<string, number> = {};

function normalize(s: Partial<Stats> | null | undefined): Stats {
  return {
    plays: s?.plays ?? {},
    best: s?.best ?? {},
    total: s?.total ?? 0,
    last: s?.last,
    counters: s?.counters ?? {},
    flags: s?.flags ?? {},
    seen: s?.seen ?? {},
  };
}

export function getStats(): Stats {
  return normalize(readJSON<Partial<Stats>>(STATS_KEY, EMPTY_STATS));
}

export function useStats(): Stats {
  const raw = useStored<Partial<Stats>>(STATS_KEY, EMPTY_STATS);
  return useMemo(() => normalize(raw), [raw]);
}

export function useUnlocked(): Record<string, number> {
  return useStored(ACH_KEY, EMPTY_UNLOCKED);
}

type UnlockListener = (a: Achievement) => void;
const unlockListeners = new Set<UnlockListener>();
export function onUnlock(cb: UnlockListener): () => void {
  unlockListeners.add(cb);
  return () => {
    unlockListeners.delete(cb);
  };
}

function save(s: Stats) {
  writeJSON(STATS_KEY, s);
  const unlocked = { ...readJSON<Record<string, number>>(ACH_KEY, EMPTY_UNLOCKED) };
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked[a.id] && a.test(s)) {
      unlocked[a.id] = Date.now();
      fresh.push(a);
    }
  }
  if (fresh.length) {
    writeJSON(ACH_KEY, unlocked);
    fresh.forEach((a) => unlockListeners.forEach((l) => l(a)));
  }
}

/** Sahifa ochilganda: "Davom eting" uchun oxirgi o'yin. */
export function touchGame(slug: Slug): void {
  const s = getStats();
  writeJSON(STATS_KEY, { ...s, last: { slug, at: Date.now() } });
}

export function getPlayerName(): string {
  return readJSON<string>(NAME_KEY, "");
}

export async function reportResult(slug: Slug, r: GameResult): Promise<FinishInfo> {
  const s = getStats();
  const prevBest = s.best[slug];
  const isBest = !r.noLeaderboard && (prevBest === undefined || r.score > prevBest);
  const flags = { ...s.flags };
  (r.flags ?? []).forEach((f) => (flags[f] = true));
  const next: Stats = {
    ...s,
    total: s.total + 1,
    plays: { ...s.plays, [slug]: (s.plays[slug] ?? 0) + 1 },
    best: isBest ? { ...s.best, [slug]: r.score } : s.best,
    last: { slug, at: Date.now() },
    flags,
  };
  save(next);
  let entry: LeaderboardEntry | null = null;
  if (!r.noLeaderboard) {
    entry = await leaderboard.submit({
      game: slug,
      name: getPlayerName() || "O'yinchi",
      score: r.score,
      detail: r.detail,
    });
  }
  return { entry, isBest, prevBest };
}

/** Yig'iladigan hisoblagich: masalan topilgan topishmoqlar soni. */
export function bump(counter: string, n = 1): void {
  const s = getStats();
  save({ ...s, counters: { ...s.counters, [counter]: (s.counters[counter] ?? 0) + n } });
}

export function addFlag(f: string): void {
  const s = getStats();
  if (s.flags[f]) return;
  save({ ...s, flags: { ...s.flags, [f]: true } });
}

export function addSeen(set: string, item: string): void {
  const s = getStats();
  const list = s.seen[set] ?? [];
  if (list.includes(item)) return;
  save({ ...s, seen: { ...s.seen, [set]: [...list, item] } });
}

export async function resetAll(): Promise<void> {
  writeJSON(STATS_KEY, EMPTY_STATS);
  writeJSON(ACH_KEY, {});
  await leaderboard.clear();
}
