"use client";
import Quiz, { type QuizItem } from "@/components/games/common/Quiz";
import { useGame } from "@/components/games/GameShell";
import { PROVERBS } from "@/data/proverbs";
import { sfx } from "@/lib/games/audio";
import { shuffle } from "@/lib/games/hooks";
import { bump } from "@/lib/games/progress";
import { useLang, useT } from "@/lib/i18n";
import s from "./Maqollar.module.css";

function makeRound(): QuizItem[] {
  return shuffle(PROVERBS)
    .slice(0, 10)
    .map(([start, end]) => {
      const others = shuffle(PROVERBS.filter(([, e]) => e !== end))
        .slice(0, 3)
        .map(([, e]) => e);
      return { q: `${start} …`, options: [end, ...others], answer: 0, badge: "📜", explain: `${start} ${end}` };
    });
}

export default function Maqollar() {
  const t = useT();
  const lang = useLang();
  const game = useGame();
  return (
    <div className={s.wrap}>
      <Quiz
        makeItems={makeRound}
        onCorrect={() => bump("proverbs")}
        intro={
          <div className={s.intro}>
            <div className={s.big} aria-hidden="true">
              📜
            </div>
            <p>{t("mq.intro", { n: PROVERBS.length })}</p>
            {lang !== "uz" && <p className={s.langNote}>ℹ️ {t("mq.langNote")}</p>}
          </div>
        }
        onFinish={(r) => {
          const perfect = r.correct === r.total;
          if (r.correct >= 8) sfx.win();
          game.finish({
            score: r.correct * 100 + r.bestStreak * 10 + Math.max(0, 100 - r.seconds),
            detail: t("quiz.detail", { n: r.correct, m: r.total, s: r.seconds }),
            flags: perfect ? ["maqollar:perfect"] : [],
          });
        }}
      />
    </div>
  );
}
