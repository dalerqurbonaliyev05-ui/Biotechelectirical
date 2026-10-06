"use client";
import { useState } from "react";
import Quiz from "@/components/games/common/Quiz";
import { useGame } from "@/components/games/GameShell";
import { KOPKARI_QUIZ, REGIONS } from "@/data/quiz/kopkari";
import { sfx } from "@/lib/games/audio";
import { shuffle } from "@/lib/games/hooks";
import { addSeen, useStats } from "@/lib/games/progress";
import { usePick, useT } from "@/lib/i18n";
import s from "./KopkariView.module.css";

export default function KopkariView() {
  const t = useT();
  const pick = usePick();
  const game = useGame();
  const stats = useStats();
  const seen = stats.seen.regions ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const region = REGIONS.find((r) => r.id === sel);

  return (
    <div className={s.wrap}>
      <h2 className={s.h2}>{t("kp.mapTitle")}</h2>
      <p className={s.note}>{t("kp.mapNote", { n: seen.length, m: REGIONS.length })}</p>
      <div className={s.map} role="group" aria-label={t("kp.mapTitle")}>
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`${s.tile} ${sel === r.id ? s.sel : ""} ${seen.includes(r.id) ? s.seen : ""}`}
            style={{ gridColumn: `${r.c} / span ${r.w ?? 1}`, gridRow: `${r.r} / span ${r.h ?? 1}` }}
            aria-pressed={sel === r.id}
            aria-label={pick(r.name)}
            onClick={() => {
              setSel(r.id);
              addSeen("regions", r.id);
              sfx.click();
            }}
          >
            <span className={s.full}>{pick(r.name)}</span>
            <span className={s.abbr} aria-hidden="true">
              {r.abbr}
            </span>
            {seen.includes(r.id) && (
              <i className={s.check} aria-hidden="true">
                ✓
              </i>
            )}
          </button>
        ))}
        <span className={s.horse} aria-hidden="true">
          🐎
        </span>
      </div>
      <div className={s.detail} aria-live="polite">
        {region ? (
          <>
            <strong>📍 {pick(region.name)}</strong>
            <p>{pick(region.note)}</p>
          </>
        ) : (
          <p>{t("kp.pick")}</p>
        )}
      </div>
      <p className={s.disclaimer}>{t("kp.disclaimer")}</p>

      <h2 className={s.h2}>{t("kp.quizTitle")}</h2>
      <Quiz
        makeItems={() => shuffle(KOPKARI_QUIZ)}
        intro={<p className={s.note}>{t("kp.quizIntro")}</p>}
        onFinish={(r) => {
          const perfect = r.correct === r.total;
          if (perfect) sfx.win();
          game.finish({
            score: r.correct * 100 + r.bestStreak * 10 + Math.max(0, 90 - r.seconds),
            detail: t("quiz.detail", { n: r.correct, m: r.total, s: r.seconds }),
            flags: perfect ? ["kopkari:perfect"] : [],
          });
        }}
      />
    </div>
  );
}
