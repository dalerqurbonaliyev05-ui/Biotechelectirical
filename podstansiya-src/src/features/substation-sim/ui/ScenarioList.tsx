"use client";

import Link from "next/link";
import ScreenHeader from "./ScreenHeader";
import Stars from "./Stars";
import Icon from "./Icon";
import { uz } from "../i18n/uz";
import { useProgress } from "../store/progress";
import { useSettings } from "../store/settings";
import { useHydrated } from "../store/hydration";
import { SCENARIO_CATALOG, isLevelUnlocked } from "../data/scenarios/catalog";

export default function ScenarioList() {
  const hydrated = useHydrated();
  const results = useProgress((s) => s.results);
  const difficulty = useSettings((s) => s.difficulty);
  const completed = (id: string) => !!results[id]?.completed;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ScreenHeader title={uz.scenarios.title} subtitle={uz.scenarios.subtitle} />
      {!hydrated ? (
        <p className="text-muted">{uz.app.loading}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {[1, 2, 3, 4].map((level) => {
            const unlocked = isLevelUnlocked(level, completed);
            const hiddenByDifficulty = level > difficulty;
            const items = SCENARIO_CATALOG.filter((s) => s.level === level);
            return (
              <section key={level} aria-labelledby={`lvl-${level}`} className={hiddenByDifficulty ? "opacity-60" : ""}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                  <h2 id={`lvl-${level}`} className="h-display text-lg font-bold">
                    {uz.common.level} {level}: {uz.levels[level].name}
                  </h2>
                  <span className="text-sm text-muted">{uz.levels[level].desc}</span>
                  {!unlocked && (
                    <span className="chip border-warn/60 text-warn">
                      <Icon name="lock" className="h-3.5 w-3.5" /> {uz.scenarios.lockedHint}
                    </span>
                  )}
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => {
                    const r = results[s.id];
                    const canPlay = s.playable && unlocked && !hiddenByDifficulty;
                    return (
                      <li key={s.id} className="card flex flex-col p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-accent">{s.id}</span>
                          {r ? <Stars value={r.bestStars} /> : null}
                        </div>
                        <h3 className="mt-1 font-bold">{s.title}</h3>
                        <p className="mt-1 flex-1 text-sm text-muted">{s.objective}</p>
                        <div className="mt-3">
                          {canPlay ? (
                            <Link href={`/oyin/${s.id}/`} className="btn-primary w-full">
                              <Icon name="play" className="h-4 w-4" />
                              {r ? uz.scenarios.replay : uz.scenarios.play}
                            </Link>
                          ) : (
                            <span className="btn-ghost w-full cursor-default opacity-60" aria-disabled="true">
                              <Icon name="lock" className="h-4 w-4" />
                              {!s.playable ? uz.scenarios.soon : hiddenByDifficulty ? `${uz.scenarios.difficultyFilter}: ${difficulty}` : uz.common.locked}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
