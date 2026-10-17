"use client";

// Mini-o'yinlar uchun umumiy qismlar: qadam kartasi, tanlov tugmalari, yakuniy baho.

import type { ReactNode } from "react";
import { uz } from "../../i18n/uz";
import { fmt } from "../text";

export interface MiniGameResult {
  /** 0–100; o'tkazib yuborilsa — null */
  score: number | null;
}

export interface MiniGameProps {
  /** O'lchov natijasi (stsenariyda engine tanlagan variant; mashqda — tasodifiy) */
  values?: Record<string, string>;
  category?: string;
  onDone: (r: MiniGameResult) => void;
}

const M = uz.mini;

export function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children?: ReactNode }) {
  return (
    <section className={`rounded-xl border p-3 ${done ? "border-ok/40 bg-ok/5" : "border-line/60 bg-ink-900/50"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {fmt(M.stepOf, { n: String(n) })} {done && <span className="text-ok">✓</span>}
      </p>
      <h4 className="font-bold">{title}</h4>
      {children && <div className="mt-2">{children}</div>}
    </section>
  );
}

export function Choices<T extends string>({
  options,
  picked,
  correct,
  onPick,
}: {
  options: Array<{ id: T; text: string }>;
  picked?: T | null;
  correct?: T;
  onPick: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o) => {
        const state = picked == null ? "" : o.id === correct ? "border-ok/70 bg-ok/10" : o.id === picked ? "border-danger/70 bg-danger/10" : "opacity-60";
        return (
          <button key={o.id} type="button" disabled={picked != null && picked === correct} className={`btn-ghost justify-start text-left font-normal ${state}`} onClick={() => onPick(o.id)}>
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

export function Verdict({ ok, children }: { ok: boolean; children?: ReactNode }) {
  return (
    <div className={`mt-2 rounded-lg border p-2 text-sm ${ok ? "border-ok/50 bg-ok/10" : "border-danger/50 bg-danger/10"}`} role="status">
      <b className={ok ? "text-ok" : "text-danger"}>{ok ? `✓ ${M.correct}` : `✗ ${M.wrong}`}</b>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

export function Finish({ score, onDone }: { score: number; onDone: (r: MiniGameResult) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/50 bg-accent/10 p-3">
      <p>
        {M.score}: <b className="font-mono text-lg">{score}</b>/100
      </p>
      <button type="button" className="btn-primary" onClick={() => onDone({ score })}>
        {M.record}
      </button>
    </div>
  );
}
