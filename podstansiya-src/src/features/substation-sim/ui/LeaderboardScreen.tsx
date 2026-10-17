"use client";

// /reyting: umumiy va stsenariy bo'yicha reyting (shu qurilma), davr va rejim filtrlari.

import { useEffect, useState } from "react";
import { SCENARIO_CATALOG } from "../data/scenarios/catalog";
import { leaderboard, type LeaderboardEntry, type ModeFilter, type OverallRow, type Period } from "../lib/leaderboard";
import { uz } from "../i18n/uz";
import { useHydrated } from "../store/hydration";
import { useSettings } from "../store/settings";
import { formatDuration } from "./format";
import ScreenHeader from "./ScreenHeader";
import Stars from "./Stars";

const L = uz.lb;
const PERIODS: Period[] = ["day", "week", "all"];
const MODES: ModeFilter[] = ["all", "training", "practice", "exam"];
const date = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

export default function LeaderboardScreen() {
  const hydrated = useHydrated();
  const me = useSettings((s) => s.playerName.trim());
  const [board, setBoard] = useState<string>("overall");
  const [period, setPeriod] = useState<Period>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [nonce, setNonce] = useState(0);
  // Natija so'rov kaliti bilan saqlanadi: filtr o'zgarganda eski jadval yangi ko'rinishda chizilmaydi
  const key = `${board}|${period}|${mode}|${nonce}`;
  const [res, setRes] = useState<{ key: string; rows: OverallRow[] | LeaderboardEntry[] } | null>(null);
  const rows = res?.key === key ? res.rows : null;

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    const q = board === "overall" ? leaderboard.overall(period, mode, 50) : leaderboard.top(board, period, mode, 50);
    void q.then((r) => alive && setRes({ key, rows: r }));
    return () => {
      alive = false;
    };
  }, [hydrated, board, period, mode, key]);

  const chip = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? "bg-accent text-white" : "border border-line text-muted hover:text-text"}`;
  const mine = (name: string) => !!me && name === me;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ScreenHeader title={L.title} subtitle={L.subtitle} />
      <section className="card flex flex-col gap-3 p-4" aria-label={L.filters}>
        <label className="text-sm text-muted">
          {L.scenario}
          <select className="mt-1 block w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-text" value={board} onChange={(e) => setBoard(e.target.value)}>
            <option value="overall">{L.overall}</option>
            {SCENARIO_CATALOG.filter((s) => s.playable).map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={uz.lb.date}>
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={period === p} className={chip(period === p)} onClick={() => setPeriod(p)}>
              {L.period[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={L.mode}>
          {MODES.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} className={chip(mode === m)} onClick={() => setMode(m)}>
              {m === "all" ? L.modeAll : uz.modes[m].name}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-4 overflow-x-auto p-4">
        {!rows ? (
          <p className="text-muted">{uz.app.loading}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted">{L.empty}</p>
        ) : board === "overall" ? (
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-2 font-normal">{L.rank}</th>
                <th className="py-1 pr-2 font-normal">{L.name}</th>
                <th className="py-1 pr-2 text-right font-normal">{L.total}</th>
                <th className="py-1 pr-2 text-right font-normal">{L.stars}</th>
                <th className="py-1 text-right font-normal">{L.scenarios}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as OverallRow[]).map((r, i) => (
                <tr key={r.name} className={`border-t border-line/40 ${mine(r.name) ? "bg-accent/10" : ""}`}>
                  <td className="py-2 pr-2 font-mono">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</td>
                  <td className="pr-2 font-semibold">
                    {r.name} {mine(r.name) && <span className="text-xs text-accent">({L.you})</span>}
                  </td>
                  <td className="pr-2 text-right font-mono font-bold">{r.total}</td>
                  <td className="pr-2 text-right font-mono">★ {r.stars}</td>
                  <td className="text-right font-mono">{r.scenarios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-2 font-normal">{L.rank}</th>
                <th className="py-1 pr-2 font-normal">{L.name}</th>
                <th className="py-1 pr-2 text-right font-normal">{L.score}</th>
                <th className="py-1 pr-2 font-normal">{L.stars}</th>
                <th className="py-1 pr-2 text-right font-normal">{L.time}</th>
                <th className="py-1 pr-2 font-normal">{L.mode}</th>
                <th className="py-1 text-right font-normal">{L.date}</th>
              </tr>
            </thead>
            <tbody>
              {(rows as LeaderboardEntry[]).map((r, i) => (
                <tr key={r.id} className={`border-t border-line/40 ${mine(r.name) ? "bg-accent/10" : ""}`}>
                  <td className="py-2 pr-2 font-mono">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</td>
                  <td className="pr-2 font-semibold">
                    {r.name} {mine(r.name) && <span className="text-xs text-accent">({L.you})</span>}
                  </td>
                  <td className="pr-2 text-right font-mono font-bold">{r.score}</td>
                  <td className="pr-2">
                    <Stars value={r.stars as 0 | 1 | 2 | 3} />
                  </td>
                  <td className="pr-2 text-right font-mono">{formatDuration(r.timeSec)}</td>
                  <td className="pr-2 text-xs">{uz.modes[r.mode].name}</td>
                  <td className="text-right font-mono text-xs">{date(r.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <button
        type="button"
        className="btn-ghost mt-4 text-sm"
        onClick={() => {
          if (window.confirm(L.clearConfirm)) void leaderboard.clear().then(() => setNonce((n) => n + 1));
        }}
      >
        {L.clear}
      </button>
    </div>
  );
}
