"use client";
import { useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { useKeys, useRafLoop } from "@/lib/games/hooks";
import { useT, type Key } from "@/lib/i18n";
import s from "./BeshTosh.module.css";

interface Stage {
  name: Key;
  groups: number[];
  /** Tosh havoda bo'lish vaqti (s) */
  flight: number;
  clap?: boolean;
}

// Klassik bosqichlar: birlik, ikkilik, uchlik, to'rtlik + ikki qo'shimcha sinov.
const STAGES: Stage[] = [
  { name: "bt.s1", groups: [1, 1, 1, 1], flight: 1.6 },
  { name: "bt.s2", groups: [2, 2], flight: 1.5 },
  { name: "bt.s3", groups: [3, 1], flight: 1.4 },
  { name: "bt.s4", groups: [4], flight: 1.3 },
  { name: "bt.s5", groups: [1, 1, 1, 1], flight: 1.35, clap: true },
  { name: "bt.s6", groups: [2, 2], flight: 1.05, clap: true },
];

const GROUND_X = [18, 36, 64, 82];
const CATCH_FROM = 0.84;
const CATCH_TO = 1.07;

type Phase = "intro" | "ready" | "flying" | "clear" | "over";

export default function BeshTosh() {
  const t = useT();
  const game = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [stageIdx, setStageIdx] = useState(0);
  const [groupIdx, setGroupIdx] = useState(0);
  const [onGround, setOnGround] = useState(4);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(false);
  const [clapped, setClapped] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "bad" | "info" } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const stoneRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const fl = useRef({ t: 0, T: 1.6, picked: false, clapped: false, ground: 4, height: 200, done: true });

  const stage = STAGES[stageIdx];
  const pickTo = 0.62 - stageIdx * 0.04;

  const place = (p: number) => {
    const h = Math.max(0, 4 * p * (1 - p)) * fl.current.height;
    if (stoneRef.current) stoneRef.current.style.transform = `translate(-50%, ${-h}px)`;
    if (markerRef.current) markerRef.current.style.left = `${Math.min(100, p * 100 / 1.1)}%`;
  };

  const endGame = (finalScore: number, reachedIdx: number, all: boolean) => {
    setPhase("over");
    const flags: string[] = [];
    if (reachedIdx >= 4) flags.push("besh-tosh:stage5");
    if (all) flags.push("besh-tosh:all");
    if (all) sfx.win();
    else sfx.lose();
    game.finish({
      score: finalScore,
      detail: t("bt.detail", { n: reachedIdx + 1 }),
      flags,
      headline: all ? t("bt.allClear") : t("bt.gameOver"),
    });
  };

  const miss = (reason: Key) => {
    fl.current.done = true;
    sfx.wrong();
    place(0);
    setOnGround(fl.current.ground);
    setPicked(false);
    setClapped(false);
    const left = lives - 1;
    setLives(left);
    setMsg({ text: t(reason), kind: "bad" });
    if (left <= 0) endGame(score, stageIdx, false);
    else setPhase("ready");
  };

  const success = (p: number) => {
    fl.current.done = true;
    const precision = 1 - Math.min(1, Math.abs(p - 0.97) / 0.13);
    const gained = 40 + stageIdx * 20 + Math.round(precision * 40);
    sfx.tak();
    place(0);
    setPicked(false);
    setClapped(false);
    const nextScore = score + gained;
    const nextGroup = groupIdx + 1;
    if (nextGroup < stage.groups.length) {
      setScore(nextScore);
      setGroupIdx(nextGroup);
      setPhase("ready");
      setMsg({ text: precision > 0.75 ? t("bt.perfect", { n: gained }) : t("bt.good", { n: gained }), kind: "ok" });
      return;
    }
    const bonus = 100 * (stageIdx + 1);
    const total = nextScore + bonus;
    setScore(total);
    if (stageIdx === STAGES.length - 1) {
      endGame(total + lives * 150, stageIdx, true);
      return;
    }
    sfx.correct();
    setPhase("clear");
    setMsg({ text: t("bt.stageClear", { n: bonus }), kind: "ok" });
  };

  useRafLoop((dt) => {
    const f = fl.current;
    if (f.done) return;
    f.t += dt;
    const p = f.t / f.T;
    place(p);
    if (p > CATCH_TO) miss(f.picked ? "bt.dropped" : "bt.latePick");
  }, phase === "flying" && game.active);

  const act = () => {
    if (!game.active) return;
    if (phase === "intro") {
      setPhase("ready");
      setMsg({ text: t("bt.tipThrow"), kind: "info" });
      sfx.click();
      return;
    }
    if (phase === "clear") {
      setStageIdx(stageIdx + 1);
      setGroupIdx(0);
      setOnGround(4);
      setPhase("ready");
      setMsg({ text: t(STAGES[stageIdx + 1].clap ? "bt.tipClap" : "bt.tipThrow"), kind: "info" });
      return;
    }
    if (phase === "ready") {
      fl.current = {
        t: 0,
        T: stage.flight,
        picked: false,
        clapped: false,
        ground: onGround,
        height: (areaRef.current?.clientHeight ?? 300) * 0.62,
        done: false,
      };
      setPhase("flying");
      setMsg(null);
      sfx.whoosh();
      return;
    }
    if (phase !== "flying") return;
    const f = fl.current;
    if (f.done) return;
    const p = f.t / f.T;
    if (!f.picked) {
      if (p < 0.06) return; // endigina otildi — tasodifiy ikki marta bosishni hisobga olmaymiz
      if (p <= pickTo) {
        f.picked = true;
        setPicked(true);
        setOnGround(f.ground - stage.groups[groupIdx]);
        sfx.doira(false);
      } else miss("bt.latePick");
      return;
    }
    if (stage.clap && !f.clapped) {
      if (p < CATCH_FROM) {
        f.clapped = true;
        setClapped(true);
        sfx.doira(true);
      } else miss("bt.noClap");
      return;
    }
    if (p >= CATCH_FROM && p <= CATCH_TO) success(p);
    else miss("bt.early");
  };

  useKeys(["Space", "Enter"], act, phase !== "over");

  const label =
    phase === "intro"
      ? t("g.start")
      : phase === "clear"
        ? t("bt.nextStage")
        : phase === "ready"
          ? t("bt.throw")
          : !picked
            ? t("bt.pick", { n: stage.groups[groupIdx] })
            : stage.clap && !clapped
              ? t("bt.clap")
              : t("bt.catch");

  return (
    <div className={s.wrap}>
      <div className={s.hud}>
        <span className="chip">
          {t("g.level")}: <b>{stageIdx + 1}/6</b> · {t(stage.name)}
        </span>
        <span className="chip" aria-label={t("g.lives")}>
          {"❤️".repeat(Math.max(0, lives))}
          {"🤍".repeat(3 - Math.max(0, lives))}
        </span>
        <span className="chip">
          {t("g.score")}: <b>{score}</b>
        </span>
      </div>

      <div
        ref={areaRef}
        className={s.area}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button === 0) act();
        }}
        role="application"
        aria-label={t("bt.areaLabel")}
      >
        <div className={s.timeline} aria-hidden="true">
          <i className={s.zonePick} style={{ left: `${(6 / 110) * 100}%`, width: `${((pickTo - 0.06) / 1.1) * 100}%` }} />
          <i
            className={s.zoneCatch}
            style={{ left: `${(CATCH_FROM / 1.1) * 100}%`, width: `${((CATCH_TO - CATCH_FROM) / 1.1) * 100}%` }}
          />
          <b ref={markerRef} className={s.marker} />
        </div>
        <div className={s.groups} aria-hidden="true">
          {stage.groups.map((g, i) => (
            <span key={i} className={i < groupIdx ? s.done : i === groupIdx ? s.cur : undefined}>
              {g}
            </span>
          ))}
        </div>
        <div className={s.cloth} aria-hidden="true" />
        {GROUND_X.map((x, i) => (
          <span
            key={i}
            className={`${s.stone} ${i >= onGround ? s.taken : ""}`}
            style={{ left: `${x}%`, "--r": `${i * 47}deg` } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}
        <div ref={stoneRef} className={`${s.stone} ${s.flyer} ${phase === "flying" ? s.air : ""}`} aria-hidden="true" />
        <span className={`${s.hand} ${clapped ? s.clapping : ""}`} aria-hidden="true">
          {clapped ? "👏" : "✋"}
        </span>
        {msg && (
          <p key={msg.text + score + lives} className={`${s.msg} ${s[msg.kind]}`} role="status">
            {msg.text}
          </p>
        )}
        {phase === "intro" && <p className={s.intro}>{t("bt.intro")}</p>}
      </div>

      <button type="button" className={`btn btn-primary btn-big ${s.action}`} onClick={act} disabled={phase === "over"}>
        {label}
      </button>
      <p className={s.keys}>{t("g.keysSpace")}</p>
    </div>
  );
}
