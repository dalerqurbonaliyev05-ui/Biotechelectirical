"use client";

import { formatClock } from "../engine/journal";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { useDerived } from "./useDerived";

export default function DispatcherPhone() {
  const { ctx, sim } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  if (!ctx || !sim) return null;
  const running = sim.status === "running";
  const msgs = ctx.scenario.messages.filter((m) => sim.deliveredMessages.includes(m.id));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{uz.phone.title}</p>
      {msgs.length === 0 && <p className="mt-2 text-sm text-muted">{uz.phone.noMessages}</p>}
      <ul className="mt-2 flex flex-col gap-3" aria-live="polite">
        {msgs.map((m) => {
          const accepted = sim.acceptedOrders.includes(m.id) || !m.readback;
          const reported = sim.reports.includes(m.id);
          const rb = sim.log.filter((l) => l.applied && l.action.type === "readback" && l.action.messageId === m.id).at(-1)?.action;
          const chosen = rb?.type === "readback" ? m.readback?.options.find((o) => o.id === rb.optionId) : undefined;
          return (
            <li key={m.id} className="flex flex-col gap-2">
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-line/60 bg-ink-800 p-3 text-sm">
                <p className="mb-1 font-mono text-xs text-accent">
                  {formatClock(sim.messageTimes[m.id] ?? sim.time)} · {m.from}
                </p>
                {m.text}
              </div>

              {m.readback && !accepted && running && (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
                  <p className="mb-2 text-sm font-semibold">{m.readback.prompt || uz.phone.readbackPrompt}</p>
                  <div className="flex flex-col gap-2">
                    {m.readback.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="btn-ghost justify-start text-left font-normal"
                        onClick={() => dispatch({ type: "readback", messageId: m.id, optionId: o.id })}
                      >
                        «{o.text}»
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {m.readback && accepted && chosen && (
                <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-accent/20 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold text-accent">{uz.phone.you}</p>«{chosen.text}»
                  <p className="mt-1 text-xs text-ok">✓ {uz.phone.accepted}</p>
                </div>
              )}

              {m.expectsReport && accepted && !reported && running && (
                <button type="button" className="btn-primary self-end" onClick={() => dispatch({ type: "report", messageId: m.id })}>
                  📞 {uz.phone.report}
                </button>
              )}
              {m.expectsReport && reported && (
                <>
                  <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-accent/20 p-3 text-sm">
                    <p className="mb-1 text-xs font-semibold text-accent">{uz.phone.you}</p>
                    {m.expectsReport.text}
                  </div>
                  <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-line/60 bg-ink-800 p-3 text-sm">
                    <p className="mb-1 font-mono text-xs text-accent">{m.from}</p>
                    {uz.phone.dispatcherAck}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {running && (
        <section className="mt-5 border-t border-line/50 pt-3" aria-label={uz.ops.calls}>
          <h4 className="text-sm font-bold">{uz.ops.calls}</h4>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {CALLS.map((to) => {
              const called = sim.calls.includes(to);
              return (
                <button key={to} type="button" className="btn-ghost justify-start px-3 py-1.5 text-left text-sm font-normal" onClick={() => dispatch({ type: "call", to })}>
                  📞 {uz.ops.call[to]}
                  {called && <span className="ml-auto text-xs text-ok">✓ {uz.ops.called}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

const CALLS = ["fire", "ambulance", "master"] as const;

/** Javob kutayotgan xabarlar soni (tab belgisi uchun). */
export function usePendingCalls(): number {
  const { ctx, sim } = useDerived();
  if (!ctx || !sim) return 0;
  return ctx.scenario.messages.filter((m) => sim.deliveredMessages.includes(m.id) && m.readback && !sim.acceptedOrders.includes(m.id)).length;
}
