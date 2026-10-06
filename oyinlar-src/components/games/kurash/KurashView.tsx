"use client";
import Quiz from "@/components/games/common/Quiz";
import Stick from "@/components/games/common/Stick";
import { useGame } from "@/components/games/GameShell";
import { KURASH_QUIZ } from "@/data/quiz/kurash";
import { sfx } from "@/lib/games/audio";
import { shuffle } from "@/lib/games/hooks";
import { usePick, useT } from "@/lib/i18n";
import type { L } from "@/lib/i18n/types";
import s from "./KurashView.module.css";

const A = "#1aa6a6"; // hujum qiluvchi (ko'k-yashil yaktak)
const D = "#2f5fd0"; // himoyalanuvchi (ko'k yaktak)
const BELT = "#c8323c";

interface Tech {
  title: L;
  desc: L;
  art: React.ReactNode;
}

const TECHS: Tech[] = [
  {
    title: { uz: "Yelkadan oshirib tashlash", ru: "Бросок через плечо", en: "Shoulder throw" },
    desc: {
      uz: "Raqibni yaktagidan tortib, orqa bilan unga kirib, yelka ustidan oshirib tashlash.",
      ru: "Потянуть соперника за куртку, войти спиной и перебросить через плечо.",
      en: "Pull the opponent by the jacket, turn in with your back and throw over the shoulder.",
    },
    art: (
      <>
        <Stick x={70} y={92} body={-35} arms={[150, 120]} legs={[25, -15]} color={A} belt={BELT} />
        <Stick x={78} y={40} body={130} arms={[20, -40]} legs={[150, 190]} color={D} belt={BELT} />
      </>
    ),
  },
  {
    title: { uz: "Son orqali tashlash", ru: "Бросок через бедро", en: "Hip throw" },
    desc: {
      uz: "Sonni raqib oldiga qo'yib, uni bel orqali aylantirib tashlash.",
      ru: "Подставить бедро и провернуть соперника через поясницу.",
      en: "Load the opponent onto your hip and rotate them over it.",
    },
    art: (
      <>
        <Stick x={60} y={92} body={-15} arms={[100, 60]} legs={[30, -10]} color={A} belt={BELT} />
        <Stick x={90} y={56} body={80} arms={[-60, -100]} legs={[110, 150]} color={D} belt={BELT} />
      </>
    ),
  },
  {
    title: { uz: "Oyoq chalish", ru: "Подсечка", en: "Leg sweep" },
    desc: {
      uz: "Raqib og'irligini bir oyoqqa o'tkazgan paytda shu oyoqni chalib yiqitish.",
      ru: "Подбить ногу соперника, когда он переносит на неё вес.",
      en: "Sweep the leg the opponent has just put their weight on.",
    },
    art: (
      <>
        <Stick x={60} y={92} body={10} arms={[110, 70]} legs={[75, -10]} color={A} belt={BELT} />
        <Stick x={110} y={90} body={-30} arms={[-120, -80]} legs={[40, -50]} color={D} belt={BELT} />
      </>
    ),
  },
  {
    title: { uz: "Ko'tarib tashlash", ru: "Бросок с подъёмом", en: "Lift and throw" },
    desc: {
      uz: "Belbog'dan mahkam ushlab, raqibni yerdan uzib, yonboshiga yoki kuragiga tashlash.",
      ru: "Крепко взяв за пояс, оторвать соперника от земли и бросить на бок или спину.",
      en: "Grip the belt, lift the opponent off the ground and throw them to the side or back.",
    },
    art: (
      <>
        <Stick x={80} y={92} body={0} arms={[160, -160]} legs={[25, -25]} color={A} belt={BELT} />
        <Stick x={80} y={30} body={95} arms={[-30, -150]} legs={[160, 200]} color={D} belt={BELT} />
      </>
    ),
  },
  {
    title: { uz: "Belbog'dan ushlash", ru: "Захват за пояс", en: "Belt grip" },
    desc: {
      uz: "Kurashda ushlash faqat beldan yuqorida: yaktak va belbog'dan. Kuchli ushlash — muvaffaqiyatli usulning yarmi.",
      ru: "Захваты в кураше — только выше пояса: за куртку и пояс. Хороший захват — половина успеха.",
      en: "Grips are only above the waist: jacket and belt. A solid grip is half of a successful throw.",
    },
    art: (
      <>
        <Stick x={60} y={92} body={12} arms={[100, 75]} legs={[20, -20]} color={A} belt={BELT} />
        <Stick x={104} y={92} body={-12} arms={[-100, -75]} legs={[20, -20]} color={D} belt={BELT} />
      </>
    ),
  },
  {
    title: { uz: "Orqaga yiqitish", ru: "Бросок назад", en: "Backward trip" },
    desc: {
      uz: "Raqibni o'zi tomon itarib, oyog'ini ichkaridan ilib, orqasiga yiqitish.",
      ru: "Толкнуть соперника назад и, зацепив ногу изнутри, опрокинуть на спину.",
      en: "Drive the opponent backwards and hook their leg from the inside to tip them over.",
    },
    art: (
      <>
        <Stick x={70} y={92} body={25} arms={[110, 80]} legs={[60, -20]} color={A} belt={BELT} />
        <Stick x={112} y={88} body={-50} arms={[-150, -60]} legs={[30, -30]} color={D} belt={BELT} />
      </>
    ),
  },
];

export default function KurashView() {
  const t = useT();
  const pick = usePick();
  const game = useGame();

  return (
    <div className={s.wrap}>
      <h2 className={s.h2}>{t("kr.techTitle")}</h2>
      <p className={s.note}>{t("kr.techNote")}</p>
      <ul className={s.cards}>
        {TECHS.map((tc, i) => (
          <li key={i} className={s.card}>
            <svg viewBox="0 0 170 110" className={s.art} role="img" aria-label={pick(tc.title)}>
              <rect x="0" y="94" width="170" height="16" rx="4" className={s.mat} />
              {tc.art}
            </svg>
            <strong>{pick(tc.title)}</strong>
            <span>{pick(tc.desc)}</span>
          </li>
        ))}
      </ul>

      <h2 className={s.h2}>{t("kr.quizTitle")}</h2>
      <Quiz
        makeItems={() => shuffle(KURASH_QUIZ).slice(0, 10)}
        intro={<p className={s.intro}>{t("kr.quizIntro")}</p>}
        onFinish={(r) => {
          const flags: string[] = [];
          if (r.correct >= 8) flags.push("kurash:8");
          if (r.correct === r.total) flags.push("kurash:10");
          if (r.correct >= 8) sfx.win();
          game.finish({
            score: r.correct * 100 + r.bestStreak * 10 + Math.max(0, 120 - r.seconds),
            detail: t("quiz.detail", { n: r.correct, m: r.total, s: r.seconds }),
            flags,
            headline: r.correct === r.total ? t("kr.halol") : t("res.title"),
          });
        }}
      />
    </div>
  );
}
