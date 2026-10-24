"use client";
// Qadam ichidagi bloklar: ogohlantirish, formula, komponentlar, xatolar, quiz, lazy mount va "Qayta ijro".
import { useRef, useState, type ComponentType, type ReactNode } from "react";
import type { Formula, Mistake, Part, QuizQuestion } from "@/content/future/types";
import { useInView } from "./hooks";
import type { Progress } from "./progress";

export function Danger(props: { title?: string; children: ReactNode }) {
  return (
    <aside className="kl-danger" role="note">
      <span className="kl-danger-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M12 2 1 21h22L12 2Z" fill="currentColor" />
          <path d="M12 9v5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="17.4" r="1.3" fill="#fff" />
        </svg>
      </span>
      <div>
        {props.title ? <strong className="kl-danger-title">{props.title}</strong> : null}
        {props.children}
      </div>
    </aside>
  );
}

export function FormulaList({ formulas }: { formulas: Formula[] }) {
  return (
    <div className="kl-formulas">
      {formulas.map((f) => (
        <figure key={f.expr} className="kl-formula">
          <code className="kl-expr">{f.expr}</code>
          {f.note ? <figcaption>{f.note}</figcaption> : null}
          <dl>
            {f.vars.map((v) => (
              <div key={v.sym}>
                <dt>{v.sym}</dt>
                <dd>
                  {v.desc}
                  {v.unit ? <span className="kl-unit">[{v.unit}]</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </figure>
      ))}
    </div>
  );
}

export function PartsList({ parts }: { parts: Part[] }) {
  return (
    <ul className="kl-parts">
      {parts.map((p) => (
        <li key={p.name}>
          <b>{p.name}</b>
          <span>{p.spec}</span>
        </li>
      ))}
    </ul>
  );
}

export function Mistakes({ items }: { items: Mistake[] }) {
  return (
    <ol className="kl-mistakes">
      {items.map((m, k) => (
        <li key={k}>
          <p className="kl-m-problem">
            <span aria-hidden="true">✗</span> {m.problem}
          </p>
          <p className="kl-m-fix">
            <span aria-hidden="true">✓</span> {m.fix}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Quiz(props: { questions: QuizQuestion[]; prefix: string; progress: Progress; xp: number }) {
  const { questions, prefix, progress, xp } = props;
  return (
    <div className="kl-quiz">
      {questions.map((q, n) => {
        const qid = `${prefix}:${q.id}`;
        const chosen = progress.state.answers[qid];
        const answered = chosen !== undefined;
        const ok = answered && chosen === q.correct;
        return (
          <fieldset key={qid} className={`kl-q${answered ? (ok ? " ok" : " bad") : ""}`}>
            <legend>
              <span className="kl-q-n">{n + 1}</span>
              {q.q}
            </legend>
            <div className="kl-q-opts">
              {q.options.map((o, k) => {
                const cls = answered ? (k === q.correct ? "right" : k === chosen ? "wrong" : "") : "";
                return (
                  <button key={k} type="button" className={cls || undefined} disabled={answered} aria-pressed={chosen === k} onClick={() => progress.answer(qid, k)}>
                    <span className="kl-q-letter" aria-hidden="true">
                      {String.fromCharCode(65 + k)}
                    </span>
                    {o}
                  </button>
                );
              })}
            </div>
            {answered ? (
              <div className="kl-q-explain" role="status">
                <b>{ok ? `To‘g‘ri! +${xp} XP` : "Afsus, noto‘g‘ri."}</b> {q.explain}
                {!ok ? (
                  <button type="button" className="kl-q-retry" onClick={() => progress.clearAnswer(qid)}>
                    Qayta urinish
                  </button>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}

/** Ekranga yaqinlashganda (rootMargin) komponentni yuklaydi va ko'rsatadi — og'ir chunklar kechiktiriladi. */
export function LazyMount(props: { children: ReactNode; minHeight?: number; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { rootMargin: props.rootMargin ?? "600px 0px", once: true });
  return (
    <div ref={ref} style={seen ? undefined : { minHeight: props.minHeight ?? 260 }}>
      {seen ? props.children : <div className="kl-ph" aria-hidden="true" />}
    </div>
  );
}

/** Animatsiyali sxema: ko'ringanda o'ynaydi, "Qayta ijro" tugmasi komponentni qayta o'rnatadi. */
export function Replayable(props: { Visual: ComponentType; caption?: string }) {
  const [round, setRound] = useState(0);
  const { Visual } = props;
  return (
    <figure className="kl-visual">
      <div className="kl-visual-stage">
        <LazyMount minHeight={240} rootMargin="0px 0px -15% 0px">
          <Visual key={round} />
        </LazyMount>
        <button type="button" className="kl-replay" onClick={() => setRound((r) => r + 1)} aria-label="Animatsiyani qayta ijro etish">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Qayta ijro
        </button>
      </div>
      {props.caption ? <figcaption>{props.caption}</figcaption> : null}
    </figure>
  );
}
