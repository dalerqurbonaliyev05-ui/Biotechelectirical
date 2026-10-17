"use client";

import { useState } from "react";
import { TOPOLOGY } from "../data/equipment";
import { MODE_RULES } from "../data/rules";
import { formatClock } from "../engine/journal";
import { opsSinceLastJournal } from "../engine/simulator";
import type { PermitForm } from "../engine/types";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { useDerived } from "./useDerived";

const D = uz.docs;
const MEASURES: PermitForm["measures"] = ["switchedOff", "verifiedDead", "earthed", "posters", "fenced"];
const field = "w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-accent";

function nodeLabel(id: string): string {
  return TOPOLOGY.nodes.find((n) => n.id === id)?.label ?? id;
}

function JournalForm() {
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
      <h4 id="journal-h" className="font-bold">
        {D.journal}
      </h4>
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

function PermitSection() {
  const { ctx, sim } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  const sc = ctx?.scenario;
  const [workName, setWorkName] = useState(sc?.permit?.workName ?? "");
  const [leader, setLeader] = useState("");
  const [size, setSize] = useState(2);
  const [live, setLive] = useState<string[]>([]);
  const [measures, setMeasures] = useState<PermitForm["measures"]>([]);
  if (!ctx || !sim || !sc) return null;
  const running = sim.status === "running";
  const needsPermit = !!sc.permit || !!sc.initial?.admitted;
  if (!needsPermit) return <p className="text-sm text-muted">{D.notNeeded}</p>;
  const candidates = sc.permit ? [...sc.permit.liveParts, "T1:H", "T1:L", "B10-2", "B110-2"] : [];
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <section aria-labelledby="permit-h">
      <h4 id="permit-h" className="font-bold">
        {D.permit}
      </h4>
      <p className="mb-2 text-xs text-muted">{D.permitHint}</p>
      {sc.permit && !sim.permit && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: "permitIssue", permit: { workName, leader, brigadeSize: size, liveParts: live, measures } });
          }}
        >
          <label className="text-xs text-muted">
            {D.workName}
            <input className={`${field} mt-1`} value={workName} onChange={(e) => setWorkName(e.target.value)} required />
          </label>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <label className="text-xs text-muted">
              {D.leader}
              <input className={`${field} mt-1`} value={leader} onChange={(e) => setLeader(e.target.value)} required />
            </label>
            <label className="text-xs text-muted">
              {D.brigadeSize}
              <input className={`${field} mt-1`} type="number" min={1} max={10} value={size} onChange={(e) => setSize(Number(e.target.value))} />
            </label>
          </div>
          <fieldset className="rounded-lg border border-line/60 p-2">
            <legend className="px-1 text-xs text-muted">{D.liveParts}</legend>
            {candidates.map((c) => (
              <label key={c} className="flex items-center gap-2 py-0.5 text-sm">
                <input type="checkbox" checked={live.includes(c)} onChange={() => setLive((l) => toggle(l, c))} className="h-4 w-4 accent-[var(--color-accent)]" />
                {nodeLabel(c)} <span className="font-mono text-xs text-muted">({c})</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="rounded-lg border border-line/60 p-2">
            <legend className="px-1 text-xs text-muted">{D.measures}</legend>
            {MEASURES.map((m) => (
              <label key={m} className="flex items-center gap-2 py-0.5 text-sm">
                <input type="checkbox" checked={measures.includes(m)} onChange={() => setMeasures((l) => toggle(l, m))} className="h-4 w-4 accent-[var(--color-accent)]" />
                {D.measure[m]}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn-primary" disabled={!running}>
            {D.issue}
          </button>
        </form>
      )}
      {sim.permit && <p className="rounded-lg bg-ok/10 p-2 text-sm text-ok">✓ {D.issued}: {sim.permit.workName}</p>}
      <div className="mt-2 flex flex-col gap-2">
        {!sim.admitted && !sim.workFinished && sc.permit && (
          <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "admit" })}>
            {D.admit}
          </button>
        )}
        {sim.admitted && <p className="rounded-lg bg-warn/10 p-2 text-sm text-warn">👷 {D.admitted}</p>}
        {sim.admitted && (
          <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "finishWork" })}>
            {D.finishWork}
          </button>
        )}
        {sim.workFinished && <p className="text-sm text-muted">✓ {D.workFinished}</p>}
      </div>
    </section>
  );
}

export default function DocumentsPanel() {
  return (
    <div className="flex flex-col gap-6">
      <PermitSection />
      <JournalForm />
    </div>
  );
}
