"use client";

import { useState } from "react";
import { MODE_RULES } from "../../data/rules";
import { formatClock } from "../../engine/journal";
import { opsSinceLastJournal } from "../../engine/simulator";
import { uz } from "../../i18n/uz";
import { useSession } from "../../store/session";
import { useDerived } from "../useDerived";
import { PrintButton, field } from "./common";

const D = uz.docs;

export default function JournalPanel() {
  const { ctx, sim } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  const [time, setTime] = useState("");
  const [from, setFrom] = useState("Dispetcher");
  const [order, setOrder] = useState("");
  const [done, setDone] = useState("");
  const [executor, setExecutor] = useState("");
  if (!ctx || !sim) return null;
  const training = MODE_RULES[ctx.mode].hints === "full";
  const running = sim.status === "running";

  return (
    <section aria-labelledby="journal-h">
      <div className="flex items-start justify-between gap-2">
        <h4 id="journal-h" className="font-bold">
          {D.journal}
        </h4>
        {sim.journal.length > 0 && <PrintButton doc="journal" />}
      </div>
      <p className="mb-2 text-xs text-muted">{D.journalHint}</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fb = dispatch({ type: "journal", entry: { time, from, orderText: order, doneText: done, executor } });
          if (fb?.applied) {
            setOrder("");
            setDone("");
          }
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            {D.time}
            <span className="mt-1 flex gap-1">
              <input className={field} value={time} onChange={(e) => setTime(e.target.value)} placeholder="09:15" inputMode="numeric" required />
              {training && (
                <button type="button" className="btn-ghost shrink-0 px-2 text-xs" onClick={() => setTime(formatClock(sim.time))} title={D.nowTime}>
                  ⏱
                </button>
              )}
            </span>
          </label>
          <label className="text-xs text-muted">
            {D.from}
            <input className={`${field} mt-1`} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
        </div>
        <label className="text-xs text-muted">
          {D.order}
          <input className={`${field} mt-1`} value={order} onChange={(e) => setOrder(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          {D.done}
          <textarea className={`${field} mt-1 min-h-20 font-mono`} value={done} onChange={(e) => setDone(e.target.value)} placeholder={D.donePlaceholder} required />
        </label>
        {training && (
          <button
            type="button"
            className="btn-ghost self-start text-xs"
            onClick={() => setDone((d) => [d, opsSinceLastJournal(ctx, sim).map((o) => o.label).join(", ")].filter(Boolean).join(" "))}
          >
            + {D.addOps}
          </button>
        )}
        <label className="text-xs text-muted">
          {D.executor}
          <input className={`${field} mt-1`} value={executor} onChange={(e) => setExecutor(e.target.value)} placeholder="F.I.Sh." />
        </label>
        <button type="submit" className="btn-primary" disabled={!running}>
          {D.write}
        </button>
      </form>
      <h5 className="mt-4 text-sm font-semibold">{D.entries}</h5>
      {sim.journal.length === 0 ? (
        <p className="text-sm text-muted">{D.empty}</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1.5">
          {sim.journal.map((j, i) => (
            <li key={i} className="rounded-lg border border-line/50 bg-ink-900/60 p-2 text-xs">
              <b className="font-mono text-accent">{j.time}</b> · {j.from} — {j.orderText}
              <br />
              <span className="font-mono">{j.doneText}</span> <span className="text-muted">({j.executor || "—"})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
