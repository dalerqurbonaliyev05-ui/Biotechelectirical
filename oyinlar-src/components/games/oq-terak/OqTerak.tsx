"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { fmtTime, useRafLoop } from "@/lib/games/hooks";
import { useT } from "@/lib/i18n";
import s from "./OqTerak.module.css";

type Signal = "oq" | "kok";
type Mode = "solo" | "duo";
const SPEED = 11; // % / s
const GRACE = 0.32; // "Ko'k terak" dan keyin reaksiya uchun vaqt (s)
const LIMIT = 45; // yakka rejimda vaqt (s)
const KEYS = [["Space", "KeyA"], ["KeyL", "Enter"]] as const;

interface Sim {
  t: number;
  signal: Signal;
  since: number;
  next: number;
  prog: [number, number];
  hold: [boolean, boolean];
  over: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function OqTerak() {
  const t = useT();
  const game = useGame();
  const [mode, setMode] = useState<Mode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [signal, setSignal] = useState<Signal>("kok");
  const [hold, setHold] = useState<[boolean, boolean]>([false, false]);
  const [caught, setCaught] = useState<number | null>(null);
  const sim = useRef<Sim>({ t: 0, signal: "kok", since: 0, next: 1.4, prog: [0, 0], hold: [false, false], over: false });
  const runnerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timeRef = useRef<HTMLSpanElement>(null);
  const players = mode === "duo" ? 2 : 1;

  const setHolding = useCallback((p: 0 | 1, v: boolean) => {
    if (sim.current.hold[p] === v) return;
    sim.current.hold[p] = v;
    setHold([sim.current.hold[0], sim.current.hold[1]]);
  }, []);

  const end = (winner: number | null, caughtP: number | null) => {
    const S = sim.current;
    S.over = true;
    setPlaying(false);
    setCaught(caughtP);
    S.hold = [false, false];
    setHold([false, false]);
    if (mode === "solo") {
      const won = winner === 0;
      if (won) sfx.win();
      else sfx.lose();
      game.finish({
        score: won ? 100 + Math.round((LIMIT - S.t) * 10) : Math.round(S.prog[0]),
        detail: won ? t("ot.detailWin", { time: fmtTime(S.t) }) : t(caughtP !== null ? "ot.caught" : "ot.timeUp"),
        flags: won ? ["oq-terak:goal"] : [],
        headline: won ? t("g.win") : t("g.lose"),
      });
    } else {
      sfx.win();
      game.finish({
        score: 0,
        noLeaderboard: true,
        flags: ["duo"],
        headline: t("g.wins", { p: t(winner === 0 ? "g.player1" : "g.player2") }),
        detail: caughtP !== null ? t("ot.caughtP", { p: t(caughtP === 0 ? "g.player1" : "g.player2") }) : undefined,
      });
    }
  };

  useRafLoop((dt) => {
    const S = sim.current;
    if (S.over) return;
    S.t += dt;
    if (S.t >= S.next) {
      S.signal = S.signal === "oq" ? "kok" : "oq";
      S.since = S.t;
      S.next = S.t + (S.signal === "oq" ? rand(1.3, 3.6) : rand(1.0, 2.6));
      setSignal(S.signal);
      if (S.signal === "oq") sfx.rhythm();
      else sfx.doira(true);
    }
    for (let p = 0; p < players; p++) {
      if (!S.hold[p]) continue;
      if (S.signal === "kok" && S.t - S.since > GRACE) {
        sfx.wrong();
        end(players === 2 ? 1 - p : null, p);
        return;
      }
      if (S.signal === "oq" || S.t - S.since <= GRACE) {
        S.prog[p] = Math.min(100, S.prog[p] + SPEED * dt);
        if (S.prog[p] >= 100) {
          end(p, null);
          return;
        }
      }
    }
    for (let p = 0; p < players; p++) {
      const el = runnerRefs.current[p];
      if (el) el.style.left = `calc(${S.prog[p]}% - ${S.prog[p] * 0.44}px)`;
    }
    if (timeRef.current) timeRef.current.textContent = fmtTime(mode === "solo" ? LIMIT - S.t : S.t);
    if (mode === "solo" && S.t >= LIMIT) end(null, null);
  }, playing && game.active);

  // Tab yashirilsa yoki natija oynasi ochilsa — ushlab turish bekor
  useEffect(() => {
    if (!game.active) {
      sim.current.hold = [false, false];
    }
  }, [game.active]);

  // Klaviatura: bosib turish (keydown/keyup)
  useEffect(() => {
    if (!playing) return;
    const map = (code: string): 0 | 1 | null => {
      if (players === 1) return KEYS[0].includes(code as never) || KEYS[1].includes(code as never) ? 0 : null;
      if (KEYS[0].includes(code as never)) return 0;
      if (KEYS[1].includes(code as never)) return 1;
      return null;
    };
    const down = (e: KeyboardEvent) => {
      const p = map(e.code);
      if (p === null) return;
      e.preventDefault();
      if (!e.repeat) setHolding(p, true);
    };
    const up = (e: KeyboardEvent) => {
      const p = map(e.code);
      if (p === null) return;
      e.preventDefault();
      setHolding(p, false);
    };
    const blur = () => {
      setHolding(0, false);
      setHolding(1, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [playing, players, setHolding]);

  const start = (m: Mode) => {
    setMode(m);
    sim.current = { t: 0, signal: "kok", since: 0, next: 1.6, prog: [0, 0], hold: [false, false], over: false };
    setSignal("kok");
    setCaught(null);
    setPlaying(true);
    sfx.doira(true);
  };

  if (!mode) {
    return (
      <div className={`${s.wrap} panel ${s.choose}`}>
        <div className={s.trees} aria-hidden="true">
          🌳🌲🌳
        </div>
        <p>{t("ot.intro")}</p>
        <div className="row center">
          <button type="button" className="btn btn-primary" onClick={() => start("solo")}>
            👤 {t("g.solo")}
          </button>
          <button type="button" className="btn btn-gold" onClick={() => start("duo")}>
            👥 {t("g.duo")}
          </button>
        </div>
      </div>
    );
  }

  const holdProps = (p: 0 | 1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      if (playing) setHolding(p, true);
    },
    onPointerUp: () => setHolding(p, false),
    onPointerCancel: () => setHolding(p, false),
    onLostPointerCapture: () => setHolding(p, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className={s.wrap}>
      <div className={`${s.board} ${signal === "oq" ? s.go : s.stop}`} aria-live="assertive">
        <span className={s.tree} aria-hidden="true">
          {signal === "oq" ? "🌳" : "🌲"}
        </span>
        <strong>{signal === "oq" ? t("ot.oq") : t("ot.kok")}</strong>
        <small>{signal === "oq" ? t("ot.go") : t("ot.stop")}</small>
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="chip">
          ⏱ <span ref={timeRef}>{fmtTime(mode === "solo" ? LIMIT : 0)}</span>
        </span>
        {caught !== null && <span className="chip">🚫 {t("ot.caughtShort")}</span>}
      </div>

      <div className={s.lanes}>
        {Array.from({ length: players }, (_, p) => (
          <div key={p} className={`${s.lane} ${p ? s.lane2 : ""}`}>
            <span className={s.finish} aria-hidden="true" />
            <span
              ref={(el) => {
                runnerRefs.current[p] = el;
              }}
              className={`${s.runner} ${hold[p] ? s.moving : ""} ${caught === p ? s.caughtR : ""}`}
              aria-hidden="true"
            >
              🏃
            </span>
          </div>
        ))}
      </div>

      <div className={`${s.pads} ${players === 2 ? s.duo : ""}`}>
        {Array.from({ length: players }, (_, p) => (
          <button
            key={p}
            type="button"
            className={`${s.pad} ${hold[p] ? s.pressed : ""} ${p ? s.pad2 : ""}`}
            disabled={!playing}
            aria-pressed={hold[p]}
            {...holdProps(p as 0 | 1)}
          >
            <b>{players === 2 ? t(p ? "g.player2" : "g.player1") : t("ot.hold")}</b>
            <small>{players === 2 ? (p ? "L / Enter" : "A / Space") : t("ot.holdHint")}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
