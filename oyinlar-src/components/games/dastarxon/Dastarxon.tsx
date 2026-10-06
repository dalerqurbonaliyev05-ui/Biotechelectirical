"use client";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { fmtTime, shuffle, useRafLoop } from "@/lib/games/hooks";
import { usePick, useT, type Key } from "@/lib/i18n";
import type { L } from "@/lib/i18n/types";
import s from "./Dastarxon.module.css";

interface Food {
  id: string;
  emoji?: string;
  name: L;
}

const FOODS: Food[] = [
  { id: "somsa", name: { uz: "Somsa", ru: "Самса", en: "Somsa" } },
  { id: "non", emoji: "🫓", name: { uz: "Non", ru: "Лепёшка", en: "Flatbread" } },
  { id: "palov", emoji: "🍛", name: { uz: "Palov", ru: "Плов", en: "Plov" } },
  { id: "choy", emoji: "🍵", name: { uz: "Choy", ru: "Чай", en: "Tea" } },
  { id: "choynak", emoji: "🫖", name: { uz: "Choynak", ru: "Чайник", en: "Teapot" } },
  { id: "tarvuz", emoji: "🍉", name: { uz: "Tarvuz", ru: "Арбуз", en: "Watermelon" } },
  { id: "qovun", emoji: "🍈", name: { uz: "Qovun", ru: "Дыня", en: "Melon" } },
  { id: "uzum", emoji: "🍇", name: { uz: "Uzum", ru: "Виноград", en: "Grapes" } },
  { id: "olma", emoji: "🍎", name: { uz: "Olma", ru: "Яблоко", en: "Apple" } },
  { id: "shaftoli", emoji: "🍑", name: { uz: "Shaftoli", ru: "Персик", en: "Peach" } },
  { id: "gilos", emoji: "🍒", name: { uz: "Gilos", ru: "Черешня", en: "Cherries" } },
  { id: "asal", emoji: "🍯", name: { uz: "Asal", ru: "Мёд", en: "Honey" } },
  { id: "yongoq", emoji: "🌰", name: { uz: "Yong'oq", ru: "Орехи", en: "Nuts" } },
  { id: "shashlik", emoji: "🍢", name: { uz: "Shashlik", ru: "Шашлык", en: "Shashlik" } },
  { id: "lagmon", emoji: "🍜", name: { uz: "Lag'mon", ru: "Лагман", en: "Lagman" } },
  { id: "chuchvara", emoji: "🥟", name: { uz: "Chuchvara", ru: "Чучвара", en: "Chuchvara" } },
];

type Level = "easy" | "medium" | "hard";
const LEVELS: Record<Level, { pairs: number; cols: number; base: number }> = {
  easy: { pairs: 6, cols: 4, base: 600 },
  medium: { pairs: 8, cols: 4, base: 900 },
  hard: { pairs: 10, cols: 5, base: 1300 },
};

interface Card {
  key: number;
  food: Food;
  open: boolean;
  matched: boolean;
}

function Somsa() {
  return (
    <svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true">
      <path d="M20 5 36 33H4Z" fill="#e2a64a" stroke="#a8671d" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 12 29 29H11Z" fill="#f2c57a" />
      {[[17, 22], [22, 25], [20, 18], [14, 28], [25, 29]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill="#fff6dc" />
      ))}
    </svg>
  );
}

export default function Dastarxon() {
  const t = useT();
  const pick = usePick();
  const game = useGame();
  const [level, setLevel] = useState<Level | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const clock = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const allDone = cards.length > 0 && cards.every((c) => c.matched);

  useRafLoop((dt) => {
    clock.current += dt;
    const sec = Math.floor(clock.current);
    if (sec !== time) setTime(sec);
  }, started && !allDone && game.active);

  const start = (lv: Level) => {
    const foods = shuffle(FOODS).slice(0, LEVELS[lv].pairs);
    setCards(shuffle([...foods, ...foods]).map((food, key) => ({ key, food, open: false, matched: false })));
    setLevel(lv);
    setMoves(0);
    setTime(0);
    clock.current = 0;
    setStarted(false);
    setBusy(false);
    sfx.click();
  };

  const flip = (idx: number) => {
    if (busy || !level) return;
    const c = cards[idx];
    if (c.open || c.matched) return;
    if (!started) setStarted(true);
    const next = cards.map((x, i) => (i === idx ? { ...x, open: true } : x));
    const opened = next.filter((x) => x.open && !x.matched);
    sfx.tak();
    if (opened.length < 2) {
      setCards(next);
      return;
    }
    const m = moves + 1;
    setMoves(m);
    const [a, b] = opened;
    if (a.food.id === b.food.id) {
      const done = next.map((x) => (x.open && !x.matched ? { ...x, matched: true, open: false } : x));
      setCards(done);
      sfx.correct();
      if (done.every((x) => x.matched)) {
        const L = LEVELS[level];
        const secs = Math.floor(clock.current);
        const score = Math.max(50, L.base - Math.max(0, m - L.pairs) * 15 - secs * 3);
        sfx.win();
        setStarted(false);
        game.finish({
          score,
          detail: `${t(`g.${level}` as Key)} · ${t("dx.detail", { m, time: fmtTime(secs) })}`,
          flags: level === "hard" ? ["dastarxon:hard"] : [],
        });
      }
    } else {
      setCards(next);
      setBusy(true);
      timer.current = window.setTimeout(() => {
        setCards((cs) => cs.map((x) => (x.open && !x.matched ? { ...x, open: false } : x)));
        setBusy(false);
        sfx.wrong();
      }, 850);
    }
  };

  if (!level) {
    return (
      <div className={`${s.wrap} panel ${s.intro}`}>
        <div className={s.big} aria-hidden="true">
          🫖🍉🫓
        </div>
        <p>{t("dx.intro")}</p>
        <div className="row center">
          {(Object.keys(LEVELS) as Level[]).map((lv) => (
            <button
              key={lv}
              type="button"
              className={`btn ${lv === "hard" ? "btn-red" : lv === "medium" ? "btn-gold" : "btn-primary"}`}
              onClick={() => start(lv)}
            >
              {t(`g.${lv}` as Key)} · {LEVELS[lv].pairs * 2}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <div className={s.hud}>
        <span className="chip">
          {t(`g.${level}` as Key)}
        </span>
        <span className="chip">
          {t("g.moves")}: <b>{moves}</b>
        </span>
        <span className="chip">
          ⏱ <b>{fmtTime(time)}</b>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLevel(null)}>
          {t("dx.change")}
        </button>
      </div>
      <div className={s.table}>
        <div className={s.grid} style={{ "--cols": LEVELS[level].cols } as React.CSSProperties}>
          {cards.map((c, i) => {
            const face = c.open || c.matched;
            return (
              <button
                key={c.key}
                type="button"
                className={`${s.card} ${face ? s.flipped : ""} ${c.matched ? s.matched : ""}`}
                onClick={() => flip(i)}
                aria-label={face ? pick(c.food.name) : t("dx.closed", { n: i + 1 })}
                aria-pressed={face}
                disabled={c.matched}
              >
                <span className={s.inner}>
                  <span className={s.back} aria-hidden="true" />
                  <span className={s.front} aria-hidden="true">
                    <span className={s.emoji}>{c.food.emoji ?? <Somsa />}</span>
                    <small>{pick(c.food.name)}</small>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
