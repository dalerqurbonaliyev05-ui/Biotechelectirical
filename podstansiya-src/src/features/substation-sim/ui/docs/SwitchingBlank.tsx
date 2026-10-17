"use client";

// Kommutatsiya blankasi: kartalarni surib-tartiblash (sichqoncha/barmoq, kutubxonasiz) va klaviatura
// (↑/↓ tugmalari, tutqichda ArrowUp/ArrowDown). Tasdiqlangach — blanka bo'yicha bajarish ko'rinishi.

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { blankCards, nextBlankStep } from "../../engine/blank";
import { uz } from "../../i18n/uz";
import { useSession } from "../../store/session";
import { useDerived } from "../useDerived";
import { PrintButton } from "./common";

const D = uz.docs;

function seedOf(id: string): number {
  return [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const out = [...arr];
  const [x] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, x);
  return out;
}

export default function SwitchingBlank() {
  const { ctx, sim } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  const spec = ctx?.scenario.blank;
  const cards = useMemo(() => (ctx && spec ? blankCards(spec, ctx.scenario.steps, seedOf(ctx.scenario.id)) : []), [ctx, spec]);
  const [order, setOrder] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  if (!ctx || !sim) return null;
  if (!spec) return <p className="text-sm text-muted">{D.blankNotNeeded}</p>;
  const label = (id: string) => cards.find((c) => c.id === id)?.label ?? id;
  const running = sim.status === "running";

  // Tasdiqlangan blanka: bajarish ko'rinishi
  if (sim.blank) {
    const next = nextBlankStep(sim.blank.order, sim.doneSteps, spec);
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold">{D.blank}</h4>
          <PrintButton doc="blank" />
        </div>
        <p className={`rounded-lg p-2 text-sm ${sim.blank.approved ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>
          {sim.blank.approved ? `✓ ${D.blankApproved}` : `⚠ ${D.blankWithErrors}`}
        </p>
        <ol className="flex flex-col gap-1">
          {sim.blank.order.map((id, i) => {
            const done = sim.doneSteps.includes(id);
            const isNext = id === next;
            return (
              <li
                key={id}
                className={`flex gap-2 rounded-lg border px-2 py-1.5 text-sm ${done ? "border-ok/40 bg-ok/10 text-muted" : isNext ? "border-accent bg-accent/10" : "border-line/50"}`}
              >
                <span className="w-6 shrink-0 text-right font-mono text-xs text-muted">{i + 1}.</span>
                <span className="flex-1">{label(id)}</span>
                <span aria-hidden="true">{done ? "✓" : isNext ? "▶" : ""}</span>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  const pool = cards.filter((c) => !order.includes(c.id));

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, idx: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIdx(idx);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragIdx === null) return;
    const y = e.clientY;
    let target = dragIdx;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (y > r.top && y < r.bottom) target = i;
    });
    if (target !== dragIdx) {
      setOrder((o) => move(o, dragIdx, target));
      setDragIdx(target);
    }
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const to = idx + (e.key === "ArrowUp" ? -1 : 1);
      if (to < 0 || to >= order.length) return;
      setOrder((o) => move(o, idx, to));
      window.requestAnimationFrame(() => itemRefs.current[to]?.querySelector<HTMLButtonElement>("[data-handle]")?.focus());
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="blank-h">
      <div>
        <h4 id="blank-h" className="font-bold">
          {D.blank}
        </h4>
        <p className="text-xs text-muted">{D.blankHint}</p>
      </div>

      {order.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-3 text-center text-sm text-muted">{D.blankEmpty}</p>
      ) : (
        <ol className="flex flex-col gap-1" aria-label={D.blank}>
          {order.map((id, i) => (
            <li
              key={id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`flex items-center gap-1.5 rounded-lg border bg-ink-900 px-1.5 py-1 text-sm ${dragIdx === i ? "border-accent shadow-lg" : "border-line/60"}`}
            >
              <button
                type="button"
                data-handle
                className="cursor-grab touch-none rounded px-1 text-muted hover:text-text active:cursor-grabbing"
                aria-label={`${D.blankDrag}: ${label(id)}`}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={() => setDragIdx(null)}
                onPointerCancel={() => setDragIdx(null)}
                onKeyDown={(e) => onKey(e, i)}
              >
                ⠿
              </button>
              <span className="w-5 shrink-0 text-right font-mono text-xs text-muted">{i + 1}.</span>
              <span className="flex-1 leading-snug">{label(id)}</span>
              <span className="flex shrink-0 flex-col">
                <button type="button" className="px-1 text-xs text-muted hover:text-text disabled:opacity-30" disabled={i === 0} onClick={() => setOrder((o) => move(o, i, i - 1))} aria-label={D.blankUp}>
                  ▲
                </button>
                <button
                  type="button"
                  className="px-1 text-xs text-muted hover:text-text disabled:opacity-30"
                  disabled={i === order.length - 1}
                  onClick={() => setOrder((o) => move(o, i, i + 1))}
                  aria-label={D.blankDown}
                >
                  ▼
                </button>
              </span>
              <button type="button" className="px-1 text-muted hover:text-danger" onClick={() => setOrder((o) => o.filter((x) => x !== id))} aria-label={D.remove}>
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      <button type="button" className="btn-primary" disabled={!running || order.length === 0} onClick={() => dispatch({ type: "blankSubmit", order })}>
        {D.blankSubmit}
      </button>

      {pool.length > 0 && (
        <div>
          <h5 className="mb-1 text-xs font-semibold text-muted">{D.blankPool}</h5>
          <ul className="flex flex-col gap-1">
            {pool.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-lg border border-dashed border-line/70 px-2 py-1.5 text-left text-sm hover:border-accent"
                  onClick={() => setOrder((o) => [...o, c.id])}
                >
                  <span className="text-accent" aria-hidden="true">
                    +
                  </span>
                  <span className="flex-1">{c.label}</span>
                  <span className="sr-only">{D.blankAdd}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
