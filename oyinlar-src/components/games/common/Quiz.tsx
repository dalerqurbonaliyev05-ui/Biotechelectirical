"use client";
import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/games/audio";
import { shuffle, useKeys } from "@/lib/games/hooks";
import { usePick, useT } from "@/lib/i18n";
import type { L } from "@/lib/i18n/types";
import s from "./Quiz.module.css";

export interface QuizItem {
  q: L | string;
  /** Variantlar; `answer` — to'g'ri variant indeksi */
  options: L<string[]> | string[];
  answer: number;
  explain?: L | string;
  /** Savol ustidagi kichik belgi (masalan, emoji) */
  badge?: string;
}

export interface QuizSummary {
  correct: number;
  total: number;
  bestStreak: number;
  seconds: number;
}

interface Props {
  /** "Boshlash" bosilganda chaqiriladi: savollar to'plamini qaytaradi */
  makeItems: () => QuizItem[];
  onFinish: (r: QuizSummary) => void;
  onCorrect?: () => void;
  intro?: React.ReactNode;
  startLabel?: string;
}

interface Run {
  items: QuizItem[];
  order: number[][]; // har savol uchun aralashtirilgan variant indekslari
}

export default function Quiz({ makeItems, onFinish, onCorrect, intro, startLabel }: Props) {
  const t = useT();
  const pick = usePick();
  const [run, setRun] = useState<Run | null>(null);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const text = (v: L | string) => (typeof v === "string" ? v : pick(v));
  const opts = (it: QuizItem) => (Array.isArray(it.options) ? it.options : pick(it.options));

  const start = () => {
    const items = makeItems();
    setRun({ items, order: items.map((it) => shuffle(opts(it).map((_, k) => k))) });
    setI(0);
    setChosen(null);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setDone(false);
    setStartedAt(Date.now());
    sfx.click();
  };

  useEffect(() => {
    if (chosen !== null) nextRef.current?.focus();
    else if (run) headRef.current?.focus();
  }, [chosen, run, i]);

  const choose = (k: number) => {
    if (!run || chosen !== null || done) return;
    setChosen(k);
    const ok = k === run.items[i].answer;
    if (ok) {
      sfx.correct();
      setCorrect((c) => c + 1);
      const st = streak + 1;
      setStreak(st);
      setBestStreak((b) => Math.max(b, st));
      onCorrect?.();
    } else {
      sfx.wrong();
      setStreak(0);
    }
  };

  const next = () => {
    if (!run || chosen === null) return;
    if (i + 1 >= run.items.length) {
      setDone(true);
      onFinish({
        correct,
        total: run.items.length,
        bestStreak,
        seconds: Math.round((Date.now() - startedAt) / 1000),
      });
      return;
    }
    setI(i + 1);
    setChosen(null);
  };

  useKeys(
    ["Digit1", "Digit2", "Digit3", "Digit4", "Numpad1", "Numpad2", "Numpad3", "Numpad4"],
    (e) => {
      if (!run || chosen !== null) return;
      const n = Number(e.code.slice(-1)) - 1;
      const k = run.order[i][n];
      if (k !== undefined) choose(k);
    },
    run !== null && !done,
  );

  if (!run || done) {
    return (
      <div className={`${s.intro} panel`}>
        {done && run ? (
          <div className={s.summary}>
            <strong>
              {correct}/{run.items.length}
            </strong>
            <span>{t("quiz.correct")}</span>
          </div>
        ) : (
          intro
        )}
        <button type="button" className="btn btn-primary btn-big" onClick={start}>
          {done ? `↻ ${t("quiz.again")}` : (startLabel ?? t("quiz.start"))}
        </button>
      </div>
    );
  }

  const it = run.items[i];
  const list = opts(it);
  const explain = it.explain ? text(it.explain) : null;

  return (
    <div className={`${s.quiz} panel`}>
      <div className={s.top}>
        <span className="chip">
          {t("quiz.question")} {i + 1}/{run.items.length}
        </span>
        <span className="chip">
          ✓ {correct} {streak >= 2 ? `· 🔥${streak}` : ""}
        </span>
      </div>
      <div className={s.bar} aria-hidden="true">
        <i style={{ width: `${(i / run.items.length) * 100}%` }} />
      </div>
      {it.badge && (
        <div className={s.badge} aria-hidden="true">
          {it.badge}
        </div>
      )}
      <h2 ref={headRef} tabIndex={-1} className={s.q}>
        {text(it.q)}
      </h2>
      <div className={s.options} role="group" aria-label={t("quiz.options")}>
        {run.order[i].map((k, n) => {
          const state =
            chosen === null ? "" : k === it.answer ? s.right : k === chosen ? s.wrongOpt : s.dim;
          return (
            <button
              key={k}
              type="button"
              className={`${s.opt} ${state}`}
              onClick={() => choose(k)}
              disabled={chosen !== null}
              aria-label={`${n + 1}. ${list[k]}`}
            >
              <span className={s.num} aria-hidden="true">
                {n + 1}
              </span>
              {list[k]}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <div className={`${s.feedback} ${chosen === it.answer ? s.fbOk : s.fbBad}`} role="status">
          <b>{chosen === it.answer ? t("quiz.right") : t("quiz.wrong")}</b>
          {explain && <span>{explain}</span>}
          <button ref={nextRef} type="button" className="btn btn-primary btn-sm" onClick={next}>
            {i + 1 >= run.items.length ? t("quiz.finish") : t("quiz.next")} →
          </button>
        </div>
      )}
    </div>
  );
}
