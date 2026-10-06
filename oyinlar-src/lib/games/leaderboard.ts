// Reyting abstraksiyasi. Hozir faqat LocalLeaderboard (localStorage, "bu qurilmadagi natijalar").
// Keyingi bosqichda SupabaseLeaderboard xuddi shu `Leaderboard` interfeysini amalga oshiradi va
// pastdagi `leaderboard` eksporti almashtiriladi — sahifa va o'yin kodi o'zgarmaydi.
import { readJSON, writeJSON } from "./storage";

export interface LeaderboardEntry {
  id: string;
  game: string;
  name: string;
  score: number;
  /** Qo'shimcha matn: masalan "24 harakat · 01:12" */
  detail?: string;
  /** Unix ms */
  at: number;
}

export type Period = "day" | "week" | "all";

export interface Leaderboard {
  submit(entry: Omit<LeaderboardEntry, "id" | "at">): Promise<LeaderboardEntry>;
  top(game: string, period: Period, limit?: number): Promise<LeaderboardEntry[]>;
  rename(id: string, name: string): Promise<void>;
  clear(): Promise<void>;
}

const KEY = "leaderboard";
const DAY = 24 * 60 * 60 * 1000;
const MAX_PER_GAME = 120;

type Store = Record<string, LeaderboardEntry[]>;
const EMPTY: Store = {};

function since(period: Period, now: number): number {
  if (period === "all") return 0;
  if (period === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return now - 7 * DAY;
}

function byScore(a: LeaderboardEntry, b: LeaderboardEntry) {
  return b.score - a.score || a.at - b.at;
}

export class LocalLeaderboard implements Leaderboard {
  private load(): Store {
    const s = readJSON<Store>(KEY, EMPTY);
    return s && typeof s === "object" ? s : {};
  }

  async submit(e: Omit<LeaderboardEntry, "id" | "at">): Promise<LeaderboardEntry> {
    const now = Date.now();
    const entry: LeaderboardEntry = {
      ...e,
      name: e.name.trim().slice(0, 24) || "O'yinchi",
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: now,
    };
    const store = this.load();
    const list = [...(store[e.game] ?? []), entry];
    // Hammasi uchun eng yaxshi 10 tani va so'nggi 7 kundagilarni saqlaymiz (kun/hafta filtri uchun).
    const best = new Set(list.slice().sort(byScore).slice(0, 10).map((x) => x.id));
    const kept = list
      .filter((x) => best.has(x.id) || x.at >= now - 7 * DAY)
      .sort(byScore)
      .slice(0, MAX_PER_GAME);
    writeJSON(KEY, { ...store, [e.game]: kept });
    return entry;
  }

  async top(game: string, period: Period, limit = 10): Promise<LeaderboardEntry[]> {
    const from = since(period, Date.now());
    return (this.load()[game] ?? []).filter((x) => x.at >= from).sort(byScore).slice(0, limit);
  }

  async rename(id: string, name: string): Promise<void> {
    const store = this.load();
    const clean = name.trim().slice(0, 24) || "O'yinchi";
    const next: Store = {};
    for (const [g, list] of Object.entries(store)) next[g] = list.map((x) => (x.id === id ? { ...x, name: clean } : x));
    writeJSON(KEY, next);
  }

  async clear(): Promise<void> {
    writeJSON(KEY, {});
  }
}

// TODO(keyingi bosqich): class SupabaseLeaderboard implements Leaderboard
//   - jadval: scores(id uuid, game text, name text, score numeric, detail text, created_at timestamptz)
//   - submit -> insert (RLS: faqat insert, score chegaralari serverda tekshiriladi)
//   - top -> select ... where game = $1 and created_at >= $2 order by score desc limit $3
// So'ng shu yerda: export const leaderboard: Leaderboard = new SupabaseLeaderboard(client);
export const leaderboard: Leaderboard = new LocalLeaderboard();
