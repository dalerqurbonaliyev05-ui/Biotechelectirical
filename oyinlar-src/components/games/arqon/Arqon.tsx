"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { useRafLoop } from "@/lib/games/hooks";
import { useT, type Key } from "@/lib/i18n";
import s from "./Arqon.module.css";

type Diff = "easy" | "medium" | "hard";
type Mode = Diff | "duo";

// Kompyuterning sekundiga bosishlari (o'rtacha odam 6–8 marta bosadi)
const AI_RATE: Record<Diff, number> = { easy: 4.3, medium: 6.4, hard: 8.4 };
const ROUND_POINTS: Record<Diff, number> = { easy: 100, medium: 200, hard: 350 };
const STEP = 0.032;
const WINS_NEEDED = 2;

interface Sim {
  phase: "count" | "pull" | "pause" | "done";
  t: number;
  pos: number; // -1 (chap jamoa yutadi) ... +1 (o'ng jamoa yutadi)
  shown: number;
  aiAcc: number;
  taps: [number, number];
  pullTime: number;
  wins: [number, number];
}

export default function Arqon() {
  const t = useT();
  const game = useGame();
  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Sim["phase"]>("count");
  const [count, setCount] = useState(3);
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [roundMsg, setRoundMsg] = useState<string | null>(null);
  const [pulse, setPulse] = useState<[number, number]>([0, 0]);
  const sim = useRef<Sim>({ phase: "count", t: 3, pos: 0, shown: 0, aiAcc: 0, taps: [0, 0], pullTime: 0, wins: [0, 0] });
  const flagRef = useRef<HTMLDivElement>(null);
  const duo = mode === "duo";

  const go = (p: Sim["phase"]) => {
    sim.current.phase = p;
    setPhase(p);
  };

  const finishMatch = (w: [number, number]) => {
    const S = sim.current;
    go("done");
    const rate = S.pullTime > 0 ? S.taps[0] / S.pullTime : 0;
    if (duo) {
      sfx.win();
      game.finish({
        score: 0,
        noLeaderboard: true,
        flags: ["duo"],
        headline: t("g.wins", { p: t(w[0] > w[1] ? "g.player1" : "g.player2") }),
        detail: `${w[0]} : ${w[1]}`,
      });
      return;
    }
    const diff = mode as Diff;
    const won = w[0] > w[1];
    if (won) sfx.win();
    else sfx.lose();
    const flags: string[] = [];
    if (won) flags.push("arqon:win");
    if (won && diff === "hard") flags.push("arqon:hard");
    game.finish({
      score: w[0] * ROUND_POINTS[diff] + (won ? ROUND_POINTS[diff] : 0) + Math.round(rate * 5),
      detail: `${w[0]} : ${w[1]} · ${t(`g.${diff}`)} · ${t("ar.rate", { n: rate.toFixed(1) })}`,
      flags,
      headline: won ? t("g.win") : t("g.lose"),
    });
  };

  useRafLoop((dt) => {
    const S = sim.current;
    if (S.phase === "count") {
      const before = Math.ceil(S.t);
      S.t -= dt;
      const now = Math.ceil(S.t);
      if (now !== before) {
        setCount(Math.max(0, now));
        if (now > 0) sfx.doira(false);
      }
      if (S.t <= 0) {
        go("pull");
        sfx.rhythm();
      }
    } else if (S.phase === "pull") {
      S.pullTime += dt;
      if (!duo) {
        const diff = mode as Diff;
        const wobble = 1 + 0.18 * Math.sin(S.pullTime * 1.7) + 0.08 * Math.sin(S.pullTime * 5.3);
        S.aiAcc += AI_RATE[diff] * wobble * dt;
        while (S.aiAcc >= 1) {
          S.aiAcc -= 1;
          S.pos += STEP;
        }
      }
      if (Math.abs(S.pos) >= 1) {
        const winner = S.pos <= -1 ? 0 : 1;
        S.pos = Math.sign(S.pos);
        const w: [number, number] = [...S.wins] as [number, number];
        w[winner] += 1;
        S.wins = w;
        setWins(w);
        if (w[winner] >= WINS_NEEDED) {
          finishMatch(w);
        } else {
          sfx.correct();
          setRoundMsg(
            duo
              ? t("ar.roundTo", { p: t(winner ? "g.player2" : "g.player1") })
              : t(winner === 0 ? "ar.roundYou" : "ar.roundAi"),
          );
          S.t = 1.6;
          go("pause");
        }
      }
    } else if (S.phase === "pause") {
      S.t -= dt;
      if (S.t <= 0) {
        S.pos = 0;
        S.aiAcc = 0;
        S.t = 3;
        setRoundMsg(null);
        setCount(3);
        go("count");
      }
    }
    S.shown += (S.pos - S.shown) * Math.min(1, dt * 14);
    if (flagRef.current) flagRef.current.style.setProperty("--p", S.shown.toFixed(4));
  }, mode !== null && phase !== "done" && game.active);

  const tap = (p: 0 | 1) => {
    const S = sim.current;
    if (S.phase !== "pull" || !game.active) return;
    if (!duo && p === 1) return;
    S.pos += p === 0 ? -STEP : STEP;
    S.taps[p] += 1;
    setPulse((x) => (p === 0 ? [x[0] + 1, x[1]] : [x[0], x[1] + 1]));
    if (S.taps[p] % 2 === 0) sfx.tak();
  };

  const onKeyTap = useEffectEvent((p: 0 | 1) => tap(p));
  useEffect(() => {
    if (!mode) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "INPUT") return;
      let p: 0 | 1 | null = null;
      if (e.code === "Space" || e.code === "KeyA") p = 0;
      else if (e.code === "KeyL" || e.code === "Enter") p = duo ? 1 : 0;
      if (p === null) return;
      e.preventDefault();
      onKeyTap(p);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [mode, duo]);

  const start = (m: Mode) => {
    sim.current = { phase: "count", t: 3, pos: 0, shown: 0, aiAcc: 0, taps: [0, 0], pullTime: 0, wins: [0, 0] };
    setWins([0, 0]);
    setCount(3);
    setRoundMsg(null);
    setPhase("count");
    setMode(m);
    sfx.doira(false);
  };

  if (!mode) {
    return (
      <div className={`${s.wrap} panel ${s.choose}`}>
        <div className={s.big} aria-hidden="true">
          🪢
        </div>
        <h2>{t("ar.vsAi")}</h2>
        <div className="row center">
          {(["easy", "medium", "hard"] as Diff[]).map((d) => (
            <button key={d} type="button" className={`btn ${d === "hard" ? "btn-red" : "btn-primary"}`} onClick={() => start(d)}>
              {t(`g.${d}` as Key)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-gold" onClick={() => start("duo")}>
          👥 {t("g.duo")}
        </button>
        <p className={s.small}>{t("ar.bestOf3")}</p>
      </div>
    );
  }

  const leftName = duo ? t("g.player1") : t("ar.you");
  const rightName = duo ? t("g.player2") : t("ar.ai");

  return (
    <div className={s.wrap}>
      <div className={s.score}>
        <span>
          {leftName} <b>{wins[0]}</b>
        </span>
        <small>{t("ar.bestOf3")}</small>
        <span>
          <b>{wins[1]}</b> {rightName}
        </span>
      </div>

      <div className={s.field}>
        <div className={s.zoneL} aria-hidden="true" />
        <div className={s.zoneR} aria-hidden="true" />
        <div className={s.center} aria-hidden="true" />
        <div ref={flagRef} className={s.ropeWrap} aria-hidden="true">
          <div className={s.rope} />
          <div className={s.flag}>🚩</div>
          <div className={`${s.team} ${s.teamL}`}>
            <span key={pulse[0]} className={s.puller}>🧍‍♂️🧍‍♂️</span>
          </div>
          <div className={`${s.team} ${s.teamR}`}>
            <span key={pulse[1]} className={s.puller}>🧍‍♂️🧍‍♂️</span>
          </div>
        </div>
        {phase === "count" && (
          <div className={s.overlay} key={count} aria-live="assertive">
            {count > 0 ? count : t("ar.pull")}
          </div>
        )}
        {roundMsg && (
          <div className={s.overlay} aria-live="assertive">
            <small>{roundMsg}</small>
          </div>
        )}
      </div>

      <div className={`${s.pads} ${duo ? s.duo : ""}`}>
        <button
          type="button"
          className={`${s.pad} ${s.padL}`}
          onPointerDown={(e) => {
            e.preventDefault();
            tap(0);
          }}
          onClick={(e) => {
            // Klaviatura bilan fokuslangan tugma (Enter/Space) uchun — pointer bosishlari onPointerDown da sanaladi
            if (e.detail === 0) tap(0);
          }}
          disabled={phase === "done"}
        >
          <b>{duo ? t("g.player1") : t("ar.tapFast")}</b>
          <small>{duo ? "A / Space" : t("ar.keysSolo")}</small>
        </button>
        {duo && (
          <button
            type="button"
            className={`${s.pad} ${s.padR}`}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(1);
            }}
            onClick={(e) => {
              if (e.detail === 0) tap(1);
            }}
            disabled={phase === "done"}
          >
            <b>{t("g.player2")}</b>
            <small>L / Enter</small>
          </button>
        )}
      </div>
    </div>
  );
}
