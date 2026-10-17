"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SCENARIO_CATALOG } from "../data/scenarios/catalog";
import { outageSummary, summarize } from "../engine/scoring";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { useSettings } from "../store/settings";
import { FeedbackCard } from "./FeedbackStack";
import { formatDuration } from "./format";
import Stars from "./Stars";
import { codeText } from "./text";
import { useDerived } from "./useDerived";

const R = uz.result;

export default function ResultScreen() {
  const { ctx, sim } = useDerived();
  const feedback = useSession((s) => s.feedback);
  const startedAt = useSession((s) => s.startedAt);
  const endedAt = useSession((s) => s.endedAt);
  const restart = useSession((s) => s.restart);
  const animations = useSettings((s) => s.animations);
  if (!ctx || !sim || sim.status === "running") return null;
  const sum = summarize(sim);
  const failed = sim.status === "failed";
  const fail = failed && sim.failure ? codeText(sim.failure.code, sim.failure.params) : null;
  const playable = SCENARIO_CATALOG.filter((s) => s.playable);
  const idx = playable.findIndex((s) => s.id === ctx.scenario.id);
  const next = idx >= 0 ? playable[idx + 1] : undefined;
  const mistakes = feedback.filter((f) => f.severity === "violation" || f.severity === "critical");
  const finalPenalties = sim.penalties.filter((p) => ["missingStep", "goalUnmet", "journalMissing"].includes(p.code));
  const secs = Math.round(((endedAt ?? startedAt) - startedAt) / 1000);
  const outage = outageSummary(ctx.topology, sim, ctx.scenario.allowedOutages);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <motion.div
        initial={animations ? (failed ? { x: 0 } : { opacity: 0, scale: 0.96 }) : false}
        animate={failed && animations ? { x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`card p-5 ${failed ? "border-danger/70 bg-danger/10" : "border-ok/50"}`}
      >
        <p className="font-mono text-xs text-accent">
          {ctx.scenario.id} · {uz.modes[ctx.mode].name}
        </p>
        <h2 className={`h-display mt-1 text-2xl font-bold ${failed ? "text-danger" : ""}`}>{failed ? `⚡ ${R.failed}` : R.success}</h2>
        <p className="text-muted">{ctx.scenario.title}</p>

        {fail && (
          <div className="mt-4 rounded-xl border border-danger/50 bg-ink-950/60 p-4">
            <p className="font-bold text-danger">{R.whatHappened}: {fail.title}</p>
            {fail.why && <p className="mt-1">{fail.why}</p>}
            {fail.consequence && (
              <p className="mt-1">
                <b>{uz.feedback.consequence}:</b> {fail.consequence}
              </p>
            )}
            {fail.correct && (
              <p className="mt-1 text-ok">
                <b>{uz.feedback.correctWay}:</b> {fail.correct}
              </p>
            )}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-ink-900/70 p-3">
            <dt className="text-xs text-muted">{R.score}</dt>
            <dd className="h-display text-2xl font-bold">{sum.score}</dd>
          </div>
          <div className="rounded-xl bg-ink-900/70 p-3">
            <dt className="text-xs text-muted">{R.stars}</dt>
            <dd className="mt-1">
              <Stars value={sum.stars} className="h-6 w-6" />
            </dd>
          </div>
          <div className="rounded-xl bg-ink-900/70 p-3">
            <dt className="text-xs text-muted">{R.time}</dt>
            <dd className="h-display text-2xl font-bold">{formatDuration(secs)}</dd>
          </div>
          <div className="rounded-xl bg-ink-900/70 p-3">
            <dt className="text-xs text-muted">{R.errors}</dt>
            <dd className="h-display text-2xl font-bold">{sum.errors}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={restart}>
            ↻ {R.retry}
          </button>
          {next && !failed && (
            <Link href={`/oyin/${next.id}/`} className="btn-ghost">
              {R.next}: {next.id} →
            </Link>
          )}
          <Link href="/stsenariylar/" className="btn-ghost">
            {R.toList}
          </Link>
        </div>
      </motion.div>

      <section className="card mt-5 p-5">
        <h3 className="font-bold">{ctx.mode === "exam" ? R.examSummary : R.mistakes}</h3>
        {mistakes.length === 0 && finalPenalties.length === 0 ? (
          <p className="mt-2 text-ok">✓ {R.noMistakes}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {mistakes.map((f) => (
              <FeedbackCard key={f.id} fb={f} />
            ))}
            {finalPenalties.map((p, i) => (
              <p key={i} className="rounded-lg border border-danger/40 bg-danger/10 p-2 text-sm">
                ✗ {codeText(p.code, p.params).title} <span className="font-mono text-xs text-danger">−{p.points}</span>
              </p>
            ))}
          </div>
        )}
      </section>

      {outage.rows.length > 0 && (
        <section className="card mt-5 p-5">
          <h3 className="font-bold">{uz.ops.damage}</h3>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 font-normal">{uz.ops.consumer}</th>
                <th className="py-1 font-normal">{uz.ops.outageMin}</th>
                <th className="py-1 text-right font-normal">{uz.ops.damageCost}</th>
              </tr>
            </thead>
            <tbody>
              {outage.rows.map((r) => (
                <tr key={r.loadId} className={`border-t border-line/40 ${r.planned ? "text-muted" : ""}`}>
                  <td className="py-1">
                    {r.label} <span className="text-xs text-muted">({r.category}-{uz.ops.categoryShort})</span>
                    {r.planned && <span className="ml-1 text-xs">· {uz.ops.planned}</span>}
                  </td>
                  <td className="py-1 font-mono">{Math.round(r.minutes)} daq</td>
                  <td className="py-1 text-right font-mono">{r.planned ? "—" : Math.round(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-right text-sm">
            {uz.ops.damageCost}: <b className="font-mono">{Math.round(outage.totalCost)}</b>
          </p>
          <p className="mt-1 text-xs text-muted">{uz.ops.damageNote}</p>
        </section>
      )}

      <section className="card mt-5 p-5">
        <h3 className="font-bold">{R.correctSequence}</h3>
        <ol className="mt-2 list-decimal pl-5 text-sm">
          {ctx.scenario.steps.map((s) => (
            <li key={s.id} className={`py-0.5 ${sim.doneSteps.includes(s.id) ? "text-muted" : ""}`}>
              {s.label}
              {s.optional && <span className="text-xs text-muted"> ({uz.task.optional})</span>}
              {sim.doneSteps.includes(s.id) && <span className="ml-1 text-ok">✓</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="card mt-5 p-5">
        <h3 className="font-bold">{R.analysis}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{ctx.scenario.analysis}</p>
      </section>
    </div>
  );
}
