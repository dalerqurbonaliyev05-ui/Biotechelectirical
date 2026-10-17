"use client";

// Moy sinovi: to'g'ri namuna olish → probiv apparati (kuchlanishni oshirish) → laboratoriya → baholash.

import { useEffect, useState } from "react";
import { NORMS } from "../../data/norms";
import { oilVerdict, parseNum, rampSeconds } from "../../engine/minigames";
import { uz } from "../../i18n/uz";
import { fmt } from "../text";
import { Choices, Finish, Step, Verdict, type MiniGameProps } from "./common";

const O = uz.mini.oil;
/** Animatsiya tezlashtirishi (ko'rsatish uchun; sinov tezligi — NORMS.oilBreakdownRampKvPerSec) */
const SPEEDUP = 5;
const UNITS: Record<string, string> = { breakdown: "kV", moisture: "g/t", acid: "mg KOH/g" };

export default function OilTestGame({ values = {}, onDone }: MiniGameProps) {
  const bd = parseNum(values["Probiv kuchlanishi"] ?? "");
  const verdict = oilVerdict(values);
  const [sample, setSample] = useState<"drainFirst" | "direct" | null>(null);
  const [kv, setKv] = useState(0);
  const [running, setRunning] = useState(false);
  const [judged, setJudged] = useState<Record<string, boolean>>({});
  const [fit, setFit] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const sampled = sample === "drainFirst";
  const broke = Number.isFinite(bd) && kv >= bd;

  const active = running && !broke;
  useEffect(() => {
    if (!active) return;
    const rate = NORMS.oilBreakdownRampKvPerSec.value * SPEEDUP;
    const t = window.setInterval(() => setKv((v) => Math.min(bd, v + rate / 10)), 100);
    return () => window.clearInterval(t);
  }, [active, bd]);

  const allJudged = verdict.checks.every((c) => c.key in judged) && fit !== null;
  const score = Math.max(0, 100 - mistakes * 20);

  return (
    <div className="flex flex-col gap-3">
      <Step n={1} title={O.sampleQ} done={sampled}>
        <Choices
          options={[
            { id: "direct" as const, text: O.direct },
            { id: "drainFirst" as const, text: O.drainFirst },
          ]}
          picked={sample}
          correct="drainFirst"
          onPick={(id) => {
            setSample(id);
            if (id !== "drainFirst") setMistakes((m) => m + 1);
          }}
        />
        {sample === "direct" && <Verdict ok={false}>{O.directWhy}</Verdict>}
        {sampled && <p className="mt-2 text-sm">{fmt(O.sampled, { color: values.Rangi ?? "—" })}</p>}
      </Step>

      {sampled && Number.isFinite(bd) && (
        <Step n={2} title={O.tester} done={broke}>
          <div className="flex items-center gap-3 rounded-lg bg-ink-950 p-3">
            <span className={`font-mono text-3xl ${broke ? "text-danger" : "text-ok"}`} aria-live="polite">
              {kv.toFixed(1)} kV
            </span>
            {broke && <span className="text-2xl" aria-hidden="true">⚡</span>}
          </div>
          {broke ? (
            <p className="mt-2 font-semibold text-danger">{fmt(O.breakdown, { kv: String(bd) })}</p>
          ) : (
            <button type="button" className="btn-primary mt-2" disabled={active} onClick={() => setRunning(true)}>
              ▲ {fmt(O.start, { rate: String(NORMS.oilBreakdownRampKvPerSec.value) })}
            </button>
          )}
          <p className="mt-1 text-xs text-muted">
            ~{Math.round(rampSeconds(bd))} s · {O.speedNote} ×{SPEEDUP}
          </p>
        </Step>
      )}

      {broke && (
        <Step n={3} title={O.judge} done={checked}>
          <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-lg bg-ink-950 p-2 font-mono text-xs">
            {Object.entries(values).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right text-ok">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2">
            {verdict.checks.map((c) => (
              <div key={c.key} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-36 flex-1">
                  {O.param[c.key]}: <b className="font-mono">{c.value}</b>
                  {checked && <span className="ml-1 text-xs text-muted">({fmt(O.limit, { limit: `${c.key === "breakdown" ? "≥" : "≤"} ${c.limit} ${UNITS[c.key]}` })})</span>}
                </span>
                {[true, false].map((ok) => (
                  <button
                    key={String(ok)}
                    type="button"
                    disabled={checked}
                    aria-pressed={judged[c.key] === ok}
                    className={`btn-ghost px-2 py-1 text-xs ${judged[c.key] === ok ? (checked ? (ok === c.ok ? "border-ok bg-ok/15" : "border-danger bg-danger/15") : "border-accent bg-accent/15") : ""}`}
                    onClick={() => setJudged((j) => ({ ...j, [c.key]: ok }))}
                  >
                    {ok ? O.okBtn : O.badBtn}
                  </button>
                ))}
              </div>
            ))}
            <p className="mt-1 text-sm font-semibold">{O.verdictQ}</p>
            <div className="flex flex-wrap gap-2">
              {[true, false].map((f) => (
                <button key={String(f)} type="button" disabled={checked} aria-pressed={fit === f} className={`btn-ghost text-sm ${fit === f ? "border-accent bg-accent/15" : ""}`} onClick={() => setFit(f)}>
                  {f ? O.fit : O.unfit}
                </button>
              ))}
            </div>
            {!checked && (
              <button
                type="button"
                className="btn-primary self-start"
                disabled={!allJudged}
                onClick={() => {
                  const wrong = verdict.checks.filter((c) => judged[c.key] !== c.ok).length + (fit !== verdict.fit ? 1 : 0);
                  setMistakes((m) => m + wrong);
                  setChecked(true);
                }}
              >
                {O.check}
              </button>
            )}
            {checked && <Verdict ok={fit === verdict.fit && verdict.checks.every((c) => judged[c.key] === c.ok)}>{verdict.fit ? O.fit : O.unfit}</Verdict>}
          </div>
        </Step>
      )}
      {checked && <Finish score={score} onDone={onDone} />}
    </div>
  );
}
