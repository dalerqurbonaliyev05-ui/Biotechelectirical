"use client";

import { MODE_RULES } from "../data/rules";
import { availableSteps } from "../engine/sequence";
import { transformerLvKv } from "../engine/simulator";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import AlarmPanel from "./AlarmPanel";
import { MeasurementValues } from "./EquipmentPanel";
import { useDerived } from "./useDerived";

const O = uz.ops;

export default function TaskCard() {
  const { ctx, sim, net } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  if (!ctx || !sim || !net) return null;
  const sc = ctx.scenario;
  const hints = MODE_RULES[ctx.mode].hints;
  const running = sim.status === "running";
  const done = new Set(sim.doneSteps);
  const next = new Set(availableSteps(sc.steps, sim.doneSteps).map((s) => s.id));
  // Smena rejimida xabar kelmaguncha unga tegishli qadamlar ko'rinmaydi
  const visible = sc.steps.filter((s) => !s.hiddenUntilMessage || sim.deliveredMessages.includes(s.hiddenUntilMessage));
  const required = visible.filter((s) => !s.optional);
  const doneCount = required.filter((s) => done.has(s.id)).length;
  const list = hints === "full" ? visible : [...visible].sort((a, b) => a.label.localeCompare(b.label));
  const visibleIds = new Set(visible.map((s) => s.id));
  const isVisible = (id?: string) => !id || !sc.steps.some((s) => s.id === id) || visibleIds.has(id);

  const decisions = (sc.decisions ?? []).filter((d) => !(d.id in sim.decisions) && isVisible(d.id) && (!d.after || done.has(d.after) || d.after in sim.measurements));
  const taskStep = (taskId: string) => sc.steps.find((s) => s.match && !Array.isArray(s.match) && s.match.type === "task" && s.match.taskId === taskId);
  const tasks = (sc.tasks ?? []).filter((t) => !sim.tasksDone.includes(t.id) && isVisible(taskStep(t.id)?.id));
  const results = (sc.measurements ?? []).filter((m) => sim.measurements[m.id]);

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

      <div className="mt-3 empty:hidden">
        <AlarmPanel compact />
      </div>

      {running && decisions.map((d) => (
        <section key={d.id} className="mt-3 rounded-xl border border-accent/50 bg-accent/5 p-3" aria-label={O.decisions}>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{O.decisions}</p>
          <p className="mt-1 text-sm font-semibold">{d.prompt}</p>
          <div className="mt-2 flex flex-col gap-2">
            {d.options.map((o) => (
              <button key={o.id} type="button" className="btn-ghost justify-start text-left font-normal" onClick={() => dispatch({ type: "choice", decisionId: d.id, optionId: o.id })}>
                {o.text}
              </button>
            ))}
          </div>
        </section>
      ))}

      {running && tasks.length > 0 && (
        <section className="mt-3" aria-label={O.tasks}>
          <h4 className="text-sm font-bold">{O.tasks}</h4>
          <ul className="mt-1 flex flex-col gap-1.5">
            {tasks.map((t) => {
              const st = taskStep(t.id);
              const ready = hints === "full" && !!st && next.has(st.id);
              return (
                <li key={t.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${ready ? "border-accent/70 bg-accent/10" : "border-line/50"}`}>
                  <span className="flex-1">
                    {t.label}
                    {t.durationSec > 0 && <span className="ml-1 text-xs text-muted">(~{Math.round(t.durationSec / 60)} daq)</span>}
                  </span>
                  <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => dispatch({ type: "task", taskId: t.id })}>
                    {O.doTask}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {results.length > 0 && (
        <section className="mt-3" aria-label={O.measurements}>
          <h4 className="text-sm font-bold">{O.measurements}</h4>
          {results.map((m) => (
            <div key={m.id} className="mt-1.5">
              <p className="text-xs text-muted">{m.label}</p>
              <MeasurementValues values={sim.measurements[m.id].values} />
            </div>
          ))}
        </section>
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
