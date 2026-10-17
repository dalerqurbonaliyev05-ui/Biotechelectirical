"use client";

// Transformator markalari ensiklopediyasi: dekoder, harflar jadvali, modellar katalogi, viktorina.

import { useState } from "react";
import { MARK_GROUP_LABEL, MARK_LETTERS } from "../data/markLetters";
import { TRANSFORMER_MODELS } from "../data/transformers";
import { decodeMark } from "../engine/markDecoder";
import { makeQuiz, type QuizQuestion } from "../engine/quiz";
import { uz } from "../i18n/uz";
import ScreenHeader from "./ScreenHeader";
import { fmt } from "./text";

const E = uz.enc;
const num = (n: number) => String(n).replace(".", ",");

function Decoder({ mark, setMark }: { mark: string; setMark: (m: string) => void }) {
  const d = mark.trim() ? decodeMark(mark) : null;
  return (
    <section className="card p-4" aria-labelledby="dec-h">
      <h2 id="dec-h" className="font-bold">
        {E.decoder}
      </h2>
      <label className="mt-2 block text-sm text-muted">
        {E.input}
        <input
          className="mt-1 w-full rounded-lg border border-line bg-ink-900 px-3 py-2 font-mono text-lg text-text"
          value={mark}
          placeholder={E.placeholder}
          onChange={(e) => setMark(e.target.value)}
          spellCheck={false}
        />
      </label>
      {d && (
        <div className="mt-3" aria-live="polite">
          <p className="font-mono text-xl text-accent">{d.normalized}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {d.letters.map((l, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg bg-ink-900/70 px-3 py-2 text-sm">
                <b className="grid h-8 min-w-8 place-items-center rounded-md bg-accent/20 px-1 font-mono text-accent">{l.code}</b>
                <span>
                  <span className="block text-xs text-muted">{MARK_GROUP_LABEL[l.group]}</span>
                  {l.meaning}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {d.ratedKva !== undefined && (
              <div className="rounded-lg bg-ink-900/70 p-2">
                <dt className="text-xs text-muted">{E.power}</dt>
                <dd className="font-mono font-bold">
                  {d.ratedKva} kVA = {num(d.ratedKva / 1000)} MVA
                </dd>
              </div>
            )}
            {d.hvClassKv !== undefined && (
              <div className="rounded-lg bg-ink-900/70 p-2">
                <dt className="text-xs text-muted">{E.hvClass}</dt>
                <dd className="font-mono font-bold">{num(d.hvClassKv)} kV</dd>
              </div>
            )}
            {d.climate && (
              <div className="rounded-lg bg-ink-900/70 p-2">
                <dt className="text-xs text-muted">{E.climate}</dt>
                <dd className="font-bold">{d.climate}</dd>
              </div>
            )}
          </dl>
          {d.errors.map((e) => (
            <p key={e} className="mt-2 rounded-lg border border-warn/50 bg-warn/10 p-2 text-sm text-warn">
              {e}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function Quiz() {
  const [qs, setQs] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const start = () => {
    setQs(makeQuiz((Math.random() * 2 ** 31) >>> 0));
    setI(0);
    setPicked(null);
    setRight(0);
  };
  if (!qs)
    return (
      <button type="button" className="btn-primary mt-3" onClick={start}>
        ▶ {E.quizStart}
      </button>
    );
  if (i >= qs.length)
    return (
      <div className="mt-3">
        <p className="h-display text-2xl font-bold">{fmt(E.quizResult, { n: String(right), total: String(qs.length) })}</p>
        <button type="button" className="btn-primary mt-3" onClick={start}>
          ↻ {E.quizAgain}
        </button>
      </div>
    );
  const q = qs[i];
  return (
    <div className="mt-3">
      <p className="font-mono text-xs text-accent">{fmt(E.question, { n: String(i + 1), total: String(qs.length) })}</p>
      <p className="mt-1 font-semibold">{q.prompt}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {q.options.map((o) => {
          const tone = picked === null ? "" : o.id === q.correctId ? "border-ok/70 bg-ok/10" : o.id === picked ? "border-danger/70 bg-danger/10" : "opacity-60";
          return (
            <button
              key={o.id}
              type="button"
              disabled={picked !== null}
              className={`btn-ghost justify-start text-left font-normal ${tone}`}
              onClick={() => {
                setPicked(o.id);
                if (o.id === q.correctId) setRight((r) => r + 1);
              }}
            >
              {o.text}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <p className={`mt-2 rounded-lg p-2 text-sm ${picked === q.correctId ? "bg-ok/10" : "bg-danger/10"}`} role="status">
            <b className={picked === q.correctId ? "text-ok" : "text-danger"}>{picked === q.correctId ? `✓ ${uz.mini.correct}` : `✗ ${uz.mini.wrong}`}</b> {q.explain}
          </p>
          <button
            type="button"
            className="btn-primary mt-2"
            onClick={() => {
              setI((x) => x + 1);
              setPicked(null);
            }}
          >
            {E.quizNext} →
          </button>
        </>
      )}
    </div>
  );
}

export default function EncyclopediaScreen() {
  const [mark, setMark] = useState("ТДТН-25000/110-У1");
  const models = Object.values(TRANSFORMER_MODELS).sort((a, b) => b.hvKv.value - a.hvKv.value || b.ratedMva.value - a.ratedMva.value);
  const T = E.table;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ScreenHeader title={E.title} subtitle={E.subtitle} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Decoder mark={mark} setMark={setMark} />
        <section className="card p-4" aria-labelledby="quiz-h">
          <h2 id="quiz-h" className="font-bold">
            {E.quiz}
          </h2>
          <Quiz />
        </section>
      </div>

      <section className="card mt-4 p-4" aria-labelledby="cat-h">
        <h2 id="cat-h" className="font-bold">
          {E.catalog}
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                {[T.mark, T.mva, T.kv, T.group, T.uk, T.p0, T.pk, T.reg].map((h) => (
                  <th key={h} className="py-1 pr-2 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.key} className="border-t border-line/40">
                  <td className="py-1.5 pr-2">
                    <button type="button" className="font-mono text-accent underline-offset-2 hover:underline" onClick={() => setMark(m.markCyr)}>
                      {m.markCyr}
                    </button>
                  </td>
                  <td className="pr-2 font-mono">{num(m.ratedMva.value)}</td>
                  <td className="pr-2 font-mono">{[m.hvKv, m.mvKv, m.lvKv].filter(Boolean).map((x) => num(x!.value)).join(" / ")}</td>
                  <td className="pr-2 font-mono">{m.vectorGroup.value}</td>
                  <td className="pr-2 font-mono">{Object.values(m.ukPct.value).map(num).join(" / ")}</td>
                  <td className="pr-2 font-mono">{num(m.noLoadLossKw.value)}</td>
                  <td className="pr-2 font-mono">{num(m.loadLossKw.value)}</td>
                  <td className="pr-2">{m.regulation?.value ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-warn">⚠ {E.verifyNote}</p>
      </section>

      <section className="card mt-4 p-4" aria-labelledby="let-h">
        <h2 id="let-h" className="font-bold">
          {E.letterTable}
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-2 font-normal">{E.cyr}</th>
                <th className="py-1 pr-2 font-normal">{E.lat}</th>
                <th className="py-1 pr-2 font-normal">{E.group}</th>
                <th className="py-1 font-normal">{E.meaning}</th>
              </tr>
            </thead>
            <tbody>
              {MARK_LETTERS.map((l) => (
                <tr key={`${l.group}-${l.cyr}`} className="border-t border-line/40">
                  <td className="py-1.5 pr-2 font-mono font-bold text-accent">{l.cyr}</td>
                  <td className="pr-2 font-mono">{l.lat}</td>
                  <td className="pr-2 text-muted">{MARK_GROUP_LABEL[l.group]}</td>
                  <td>{l.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
