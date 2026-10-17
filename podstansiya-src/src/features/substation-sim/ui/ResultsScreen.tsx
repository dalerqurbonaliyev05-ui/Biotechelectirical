"use client";

import ScreenHeader from "./ScreenHeader";
import Stars from "./Stars";
import { formatDuration } from "./format";
import { uz } from "../i18n/uz";
import { useProgress } from "../store/progress";
import { useHydrated } from "../store/hydration";
import { SCENARIO_CATALOG } from "../data/scenarios/catalog";

export default function ResultsScreen() {
  const hydrated = useHydrated();
  const results = useProgress((s) => s.results);
  const played = SCENARIO_CATALOG.filter((s) => results[s.id]);
  const totalScore = played.reduce((a, s) => a + (results[s.id]?.bestScore ?? 0), 0);
  const totalStars = played.reduce((a, s) => a + (results[s.id]?.bestStars ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ScreenHeader title={uz.results.title} />
      {!hydrated ? (
        <p className="text-muted">{uz.app.loading}</p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-sm text-muted">{uz.results.totalScore}</p>
              <p className="h-display text-2xl font-bold">{totalScore}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-muted">{uz.results.totalStars}</p>
              <p className="h-display text-2xl font-bold">
                {totalStars} <span className="text-base text-muted">/ {SCENARIO_CATALOG.filter((s) => s.playable).length * 3}</span>
              </p>
            </div>
          </div>
          {played.length === 0 && <p className="card p-5 text-muted">{uz.results.empty}</p>}
          {played.length > 0 && (
            <ul className="card divide-y divide-line/60">
              {played.map((s) => {
                const r = results[s.id]!;
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span className="min-w-0">
                      <span className="font-mono text-xs text-accent">{s.id}</span>
                      <span className="block font-semibold">{s.title}</span>
                      <span className="text-xs text-muted">
                        {uz.common.attempts}: {r.attempts} · {uz.results.bestTime}: {r.bestTimeSec != null ? formatDuration(r.bestTimeSec) : "—"}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Stars value={r.bestStars} />
                      <span className="font-mono font-bold">{r.bestScore}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
