"use client";
import { useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { fmtTime, shuffle, useRafLoop } from "@/lib/games/hooks";
import { usePick, useT } from "@/lib/i18n";
import { HIDERS, SCENES, type Spot } from "./scenes";
import s from "./Bekinmachoq.module.css";

interface Hider extends Spot {
  emoji: string;
  found: boolean;
}

type Phase = "intro" | "play" | "levelDone" | "over";

const HINT_COST = 8;
const MISS_COST = 2;

export default function Bekinmachoq() {
  const t = useT();
  const pick = usePick();
  const game = useGame();
  const [level, setLevel] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [hiders, setHiders] = useState<Hider[]>([]);
  const [timeLeft, setTimeLeft] = useState(SCENES[0].time);
  const [score, setScore] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [cleanLevels, setCleanLevels] = useState(0);
  const [miss, setMiss] = useState<{ x: number; y: number; k: number } | null>(null);
  const timer = useRef({ left: SCENES[0].time, hintUntil: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const scene = SCENES[level];

  const setup = (lv: number) => {
    const sc = SCENES[lv];
    const spots = shuffle(sc.spots).slice(0, sc.count);
    const emojis = shuffle(HIDERS);
    setHiders(spots.map((sp, i) => ({ ...sp, emoji: emojis[i], found: false })));
    timer.current = { left: sc.time, hintUntil: 0 };
    setTimeLeft(sc.time);
    setHint(null);
    setUsedHint(false);
    setLevel(lv);
    setPhase("play");
    sfx.rhythm();
  };

  const finishGame = (finalScore: number, levelsDone: number, clean: number) => {
    setPhase("over");
    const all = levelsDone === SCENES.length;
    if (all) sfx.win();
    else sfx.lose();
    const flags: string[] = [];
    if (all) flags.push("bekinmachoq:all");
    if (clean > 0) flags.push("bekinmachoq:nohint");
    game.finish({
      score: finalScore,
      detail: t("bk.detail", { n: levelsDone, m: SCENES.length }),
      flags,
      headline: all ? t("bk.allFound") : t("bk.timeUp"),
    });
  };

  useRafLoop((dt) => {
    const T = timer.current;
    T.left -= dt;
    const shown = Math.ceil(T.left);
    if (shown !== timeLeft) {
      setTimeLeft(Math.max(0, shown));
      if (shown <= 5 && shown > 0) sfx.tick();
    }
    if (hint !== null && performance.now() > T.hintUntil) setHint(null);
    if (T.left <= 0) finishGame(score, level, cleanLevels);
  }, phase === "play" && game.active);

  const find = (idx: number) => {
    if (phase !== "play" || hiders[idx].found) return;
    const next = hiders.map((h, i) => (i === idx ? { ...h, found: true } : h));
    setHiders(next);
    const gained = 50;
    sfx.correct();
    if (hint === idx) setHint(null);
    if (next.every((h) => h.found)) {
      const bonus = Math.max(0, Math.round(timer.current.left)) * 5;
      const total = score + gained + bonus;
      setScore(total);
      const clean = cleanLevels + (usedHint ? 0 : 1);
      setCleanLevels(clean);
      if (level === SCENES.length - 1) finishGame(total, SCENES.length, clean);
      else {
        sfx.win();
        setPhase("levelDone");
      }
    } else setScore(score + gained);
  };

  const onMiss = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "play" || !(e.target as Element).closest("[data-bg]")) return;
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    timer.current.left -= MISS_COST;
    setMiss({ x: p.x, y: p.y, k: Date.now() });
    sfx.wrong();
  };

  const giveHint = () => {
    const idx = hiders.findIndex((h) => !h.found);
    if (idx < 0 || phase !== "play") return;
    timer.current.left -= HINT_COST;
    timer.current.hintUntil = performance.now() + 2200;
    setHint(idx);
    setUsedHint(true);
    sfx.doira(false);
  };

  if (phase === "intro") {
    return (
      <div className={`${s.wrap} panel ${s.intro}`}>
        <div className={s.big} aria-hidden="true">
          🫣
        </div>
        <p>{t("bk.intro")}</p>
        <ol className={s.levels}>
          {SCENES.map((sc, i) => (
            <li key={sc.id}>
              {i + 1}. {pick(sc.name)} — {t("bk.levelInfo", { n: sc.count, s: sc.time })}
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-primary btn-big" onClick={() => setup(0)}>
          {t("g.start")}
        </button>
      </div>
    );
  }

  const left = hiders.filter((h) => !h.found).length;

  return (
    <div className={s.wrap}>
      <div className={s.hud}>
        <span className="chip">
          {t("g.level")}: <b>{level + 1}/3</b> · {pick(scene.name)}
        </span>
        <span className={`chip ${timeLeft <= 10 ? s.hurry : ""}`}>
          ⏱ <b>{fmtTime(timeLeft)}</b>
        </span>
        <span className="chip">
          {t("g.score")}: <b>{score}</b>
        </span>
      </div>
      <div className={s.sceneBox}>
        <svg
          ref={svgRef}
          viewBox="0 0 400 260"
          className={s.scene}
          onPointerDown={onMiss}
          role="group"
          aria-label={t("bk.sceneLabel", { n: left })}
        >
          <g data-bg="">{scene.back}</g>
          {/* data-bg: fonga bosilsa — xato bosish */}
          <rect data-bg="" width="400" height="260" fill="transparent" />
          {hiders.map((h, i) => (
            <g
              key={i}
              role="button"
              tabIndex={h.found ? -1 : 0}
              aria-label={h.found ? t("bk.foundOne") : t("bk.hidden", { n: i + 1 })}
              className={`${s.hider} ${h.found ? s.found : ""}`}
              transform={`translate(${h.x} ${h.y}) rotate(${h.rot ?? 0})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                find(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  find(i);
                }
              }}
            >
              <circle r="17" fill="transparent" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="20" className={s.emoji}>
                {h.emoji}
              </text>
              {hint === i && <circle r="20" className={s.hintRing} />}
            </g>
          ))}
          <g className={s.front}>{scene.front}</g>
          {hiders.map((h, i) =>
            h.found ? (
              <g key={`f${i}`} transform={`translate(${h.x} ${h.y})`} className={s.foundMark} pointerEvents="none">
                <circle r="16" fill="none" stroke="#2e9d5b" strokeWidth="3" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="20">
                  {h.emoji}
                </text>
              </g>
            ) : null,
          )}
          {miss && (
            <text
              key={miss.k}
              x={miss.x}
              y={miss.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={s.miss}
              pointerEvents="none"
            >
              −{MISS_COST}s
            </text>
          )}
        </svg>
        {phase === "levelDone" && (
          <div className={s.overlay}>
            <strong>🎉 {t("bk.levelDone")}</strong>
            <button type="button" className="btn btn-gold" onClick={() => setup(level + 1)}>
              {t("bk.nextLevel")} →
            </button>
          </div>
        )}
      </div>
      <div className={s.findRow}>
        <span>{t("bk.find")}:</span>
        {hiders.map((h, i) => (
          <span key={i} className={`${s.target} ${h.found ? s.got : ""}`} aria-label={h.found ? "✓" : "?"}>
            {h.emoji}
          </span>
        ))}
      </div>
      <button type="button" className="btn btn-ghost" onClick={giveHint} disabled={phase !== "play"}>
        💡 {t("g.hint")} (−{HINT_COST}s)
      </button>
    </div>
  );
}
