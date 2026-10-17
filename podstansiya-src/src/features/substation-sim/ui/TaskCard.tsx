"use client";

import { MODE_RULES } from "../data/rules";
import { availableSteps } from "../engine/sequence";
import { transformerLvKv } from "../engine/simulator";
import { uz } from "../i18n/uz";
import { useDerived } from "./useDerived";

export default function TaskCard() {
  const { ctx, sim, net } = useDerived();
  if (!ctx || !sim || !net) return null;
  const sc = ctx.scenario;
  const hints = MODE_RULES[ctx.mode].hints;
  const done = new Set(sim.doneSteps);
  const next = new Set(availableSteps(sc.steps, sim.doneSteps).map((s) => s.id));
  const required = sc.steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => done.has(s.id)).length;
  const list = hints === "full" ? sc.steps : [...sc.steps].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{uz.task.title}</p>
      <h3 className="h-display text-lg font-bold">{sc.title}</h3>
      <p className="mt-1 text-sm text-muted">
        <b className="text-text">{uz.game.objective}:</b> {sc.objective}
      </p>

      {sc.goals?.map((g, i) =>
        g.type === "voltageInRange" ? (
          <p key={i} className="mt-2 rounded-lg border border-line/60 bg-ink-900/60 px-3 py-2 text-sm">
            10 kV: <b className="font-mono">{transformerLvKv(ctx, sim, net, g.transformerId).toFixed(2)} kV</b> → {g.min}–{g.max} kV
          </p>
        ) : null,
      )}

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-muted">{uz.task.progress}:</span>
        <span className="font-mono font-bold">
          {doneCount}/{required.length}
        </span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700" aria-hidden="true">
          <span className="block h-full bg-accent transition-all" style={{ width: `${(doneCount / Math.max(1, required.length)) * 100}%` }} />
        </span>
      </div>

      {hints === "none" ? (
        <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">{uz.task.hiddenExam}</p>
      ) : (
        <>
          <h4 className="mt-4 text-sm font-bold">{uz.task.steps}</h4>
          {hints === "limited" && <p className="text-xs text-muted">{uz.task.practiceNote}</p>}
          <ol className="mt-2 flex flex-col gap-1.5">
            {list.map((s) => {
              const isDone = done.has(s.id);
              const isNext = hints === "full" && !isDone && next.has(s.id);
              return (
                <li
                  key={s.id}
                  className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                    isDone ? "border-ok/40 bg-ok/10 text-muted" : isNext ? "border-accent/70 bg-accent/10" : "border-line/50"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <span aria-hidden="true" className={`mt-0.5 font-bold ${isDone ? "text-ok" : "text-line"}`}>
                      {isDone ? "✓" : "○"}
                    </span>
                    <span className="flex-1">
                      {s.label}
                      {s.optional && <span className="ml-1 text-xs text-muted">({uz.task.optional})</span>}
                      {isNext && <span className="ml-1 chip border-accent/60 py-0 text-accent">{uz.task.next}</span>}
                      <span className="sr-only">{isDone ? " — bajarildi" : ""}</span>
                    </span>
                  </span>
                  {isNext && s.hint && (
                    <span className="mt-1 block pl-6 text-xs text-accent">
                      {uz.task.hint}: {s.hint}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
