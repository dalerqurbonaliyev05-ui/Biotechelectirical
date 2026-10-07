"use client";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { normalizeAnswer, RIDDLES, type Riddle } from "@/data/riddles";
import { sfx } from "@/lib/games/audio";
import { shuffle } from "@/lib/games/hooks";
import { bump } from "@/lib/games/progress";
import { useLang, useT } from "@/lib/i18n";
import s from "./Topishmoqlar.module.css";

const ROUND = 10;
type Mode = "choice" | "type";

interface Q {
  r: Riddle;
  options: string[];
}

export default function Topishmoqlar() {
  const t = useT();
  const lang = useLang();
  const game = useGame();
  const [mode, setMode] = useState<Mode>("choice");
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"ok" | "bad" | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result) nextRef.current?.focus();
    else if (qs && mode === "type") inputRef.current?.focus();
  }, [result, qs, mode, i]);

  const start = (m: Mode) => {
    const pool = shuffle(RIDDLES).slice(0, ROUND);
    setQs(
      pool.map((r) => ({
        r,
        options: shuffle([r.a, ...shuffle(RIDDLES.filter((x) => x.a !== r.a)).slice(0, 3).map((x) => x.a)]),
      })),
    );
    setMode(m);
    setI(0);
    setScore(0);
    setCorrect(0);
    setAnswer("");
    setResult(null);
    setPicked(null);
    setHint(false);
    sfx.click();
  };

  if (!qs) {
    return (
      <div className={`${s.wrap} panel ${s.intro}`}>
        <div className={s.big} aria-hidden="true">
          🧩
        </div>
        <p>{t("tp.intro", { n: RIDDLES.length })}</p>
        {lang !== "uz" && <p className={s.langNote}>ℹ️ {t("tp.langNote")}</p>}
        <div className="row center">
          <button type="button" className="btn btn-primary" onClick={() => start("choice")}>
            🔘 {t("tp.modeChoice")}
          </button>
          <button type="button" className="btn btn-gold" onClick={() => start("type")}>
            ⌨️ {t("tp.modeType")}
          </button>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const isRight = (v: string) => {
    const n = normalizeAnswer(v);
    return [q.r.a, ...(q.r.alt ?? [])].some((x) => normalizeAnswer(x) === n);
  };

  const check = (v: string) => {
    if (result || !v.trim()) return;
    const ok = isRight(v);
    setPicked(v);
    setResult(ok ? "ok" : "bad");
    if (ok) {
      sfx.correct();
      setCorrect((c) => c + 1);
      setScore((sc) => sc + (mode === "type" ? 150 : 100) - (hint ? 40 : 0));
      bump("riddles");
    } else sfx.wrong();
  };

  const next = () => {
    if (i + 1 >= qs.length) {
      const final = score;
      if (correct >= 8) sfx.win();
      game.finish({
        score: final,
        detail: t("tp.detail", { n: correct, m: qs.length }),
      });
      setQs(null);
      return;
    }
    setI(i + 1);
    setAnswer("");
    setResult(null);
    setPicked(null);
    setHint(false);
  };

  return (
    <div className={`${s.wrap} panel ${s.card}`}>
      <div className={s.top}>
        <span className="chip">
          {i + 1}/{qs.length}
        </span>
        <span className="chip">
          {t("g.score")}: <b>{score}</b>
        </span>
      </div>
      {lang !== "uz" && <p className={s.langNote}>ℹ️ {t("tp.langNote")}</p>}
      <blockquote className={s.riddle} lang="uz">
        <span aria-hidden="true">“</span>
        {q.r.q}
        <span aria-hidden="true">”</span>
      </blockquote>

      {mode === "choice" ? (
        <div className={s.options}>
          {q.options.map((o) => (
            <button
              key={o}
              type="button"
              lang="uz"
              className={`${s.opt} ${result && o === q.r.a ? s.right : ""} ${result === "bad" && o === picked ? s.wrong : ""}`}
              onClick={() => check(o)}
              disabled={result !== null}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form
          className={s.typeRow}
          onSubmit={(e) => {
            e.preventDefault();
            check(answer);
          }}
        >
          <label htmlFor="tp-answer" className="sr-only">
            {t("tp.yourAnswer")}
          </label>
          <input
            ref={inputRef}
            id="tp-answer"
            lang="uz"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("tp.yourAnswer")}
            autoComplete="off"
            disabled={result !== null}
          />
          <button type="submit" className="btn btn-primary" disabled={result !== null || !answer.trim()}>
            {t("tp.check")}
          </button>
        </form>
      )}

      {!result && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHint(true)} disabled={hint}>
          💡 {t("g.hint")}
        </button>
      )}
      {hint && !result && (
        <p className={s.hint} lang="uz">
          {q.r.hint} · {t("tp.firstLetter", { l: q.r.a[0].toUpperCase(), n: q.r.a.length })}
        </p>
      )}

      {result && (
        <div className={`${s.feedback} ${result === "ok" ? s.fbOk : s.fbBad}`} role="status">
          <b>{result === "ok" ? t("quiz.right") : t("tp.answerWas")}</b>
          <span lang="uz">{q.r.a}</span>
          <button ref={nextRef} type="button" className="btn btn-primary btn-sm" onClick={next}>
            {i + 1 >= qs.length ? t("quiz.finish") : t("quiz.next")} →
          </button>
        </div>
      )}
      {mode === "choice" && <p className={s.small}>{t("tp.switch")}</p>}
    </div>
  );
}
