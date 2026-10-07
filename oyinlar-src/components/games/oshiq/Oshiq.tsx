"use client";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/games/GameShell";
import { sfx } from "@/lib/games/audio";
import { useKeys, usePrefersReducedMotion } from "@/lib/games/hooks";
import { useT, type Key } from "@/lib/i18n";
import s from "./Oshiq.module.css";

type SideId = "pukka" | "chikka" | "tavka" | "olchi";

// Keng tomonlar (pukka, chikka) ko'p tushadi, tor tomonlar (tavka, olchi) kam — shuning uchun qimmatroq.
export const SIDES: { id: SideId; name: string; weight: number; points: number; desc: Key }[] = [
  { id: "pukka", name: "Pukka", weight: 0.39, points: 1, desc: "os.pukka" },
  { id: "chikka", name: "Chikka", weight: 0.39, points: 2, desc: "os.chikka" },
  { id: "tavka", name: "Tavka", weight: 0.12, points: 4, desc: "os.tavka" },
  { id: "olchi", name: "Olchi", weight: 0.1, points: 5, desc: "os.olchi" },
];

function roll(): SideId {
  let r = Math.random();
  for (const sd of SIDES) {
    if (r < sd.weight) return sd.id;
    r -= sd.weight;
  }
  return "pukka";
}

const PER_PLAYER = { solo: 10, duo: 5 } as const;
type Mode = keyof typeof PER_PLAYER;

function Bone({ side }: { side: SideId | null }) {
  return (
    <svg viewBox="0 0 120 80" className={s.bone} aria-hidden="true">
      <defs>
        <radialGradient id="osg" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".6" stopColor="#ecdcbc" />
          <stop offset="1" stopColor="#b99a68" />
        </radialGradient>
      </defs>
      <path
        d="M18 18c10-12 30-6 42 0 12-6 32-12 42 0 10 12 4 28-4 34 8 8 6 22-6 26-12 4-24-2-32-8-8 6-20 12-32 8-12-4-14-18-6-26-8-6-14-22-4-34Z"
        fill="url(#osg)"
        stroke="#8a6a3c"
        strokeWidth="2.5"
      />
      {side === "pukka" && <ellipse cx="60" cy="42" rx="20" ry="13" fill="#fff7e2" stroke="#b99a68" strokeWidth="2" />}
      {side === "chikka" && <ellipse cx="60" cy="42" rx="19" ry="11" fill="#7a5a2c" opacity=".75" />}
      {side === "tavka" && <path d="M30 42h60" stroke="#7a5a2c" strokeWidth="5" strokeLinecap="round" />}
      {side === "olchi" && (
        <path d="M32 50c10-20 22 6 30-10s22 4 28-8" fill="none" stroke="#c8323c" strokeWidth="5" strokeLinecap="round" />
      )}
      {side === null && <circle cx="60" cy="42" r="6" fill="#b99a68" />}
    </svg>
  );
}

interface Throw {
  player: 0 | 1;
  side: SideId;
}

export default function Oshiq() {
  const t = useT();
  const game = useGame();
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<Mode | null>(null);
  const [throws, setThrows] = useState<Throw[]>([]);
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<SideId | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const total = mode ? PER_PLAYER[mode] * (mode === "duo" ? 2 : 1) : 0;
  const done = mode !== null && throws.length >= total;
  const player: 0 | 1 = mode === "duo" ? ((throws.length % 2) as 0 | 1) : 0;
  const pts = (p: 0 | 1, list = throws) =>
    list.filter((x) => x.player === p).reduce((a, x) => a + SIDES.find((sd) => sd.id === x.side)!.points, 0);

  const finish = (list: Throw[]) => {
    if (mode === "solo") {
      const score = pts(0, list);
      const olchi = list.filter((x) => x.side === "olchi").length;
      sfx.win();
      game.finish({
        score,
        detail: t("os.detail", { n: olchi }),
        flags: olchi >= 3 ? ["oshiq:olchi3"] : [],
      });
    } else {
      const a = pts(0, list);
      const b = pts(1, list);
      sfx.win();
      game.finish({
        score: Math.max(a, b),
        noLeaderboard: true,
        flags: ["duo"],
        headline: a === b ? t("g.draw") : t("g.wins", { p: t(a > b ? "g.player1" : "g.player2") }),
        detail: `${t("g.player1")}: ${a} · ${t("g.player2")}: ${b}`,
      });
    }
  };

  const doThrow = () => {
    if (!mode || rolling || done || !game.active) return;
    const side = roll();
    setRolling(true);
    setLast(null);
    sfx.whoosh();
    timer.current = window.setTimeout(
      () => {
        const list = [...throws, { player, side }];
        setThrows(list);
        setLast(side);
        setRolling(false);
        if (side === "olchi" || side === "tavka") sfx.win();
        else sfx.tak();
        if (list.length >= total) timer.current = window.setTimeout(() => finish(list), 700);
      },
      reduced ? 200 : 950,
    );
  };

  useKeys(["Space", "Enter"], doThrow, mode !== null);

  if (!mode) {
    return (
      <div className={`${s.wrap} panel ${s.choose}`}>
        <Bone side="olchi" />
        <h2>{t("g.mode")}</h2>
        <div className="row center">
          <button type="button" className="btn btn-primary" onClick={() => setMode("solo")}>
            👤 {t("os.solo")}
          </button>
          <button type="button" className="btn btn-gold" onClick={() => setMode("duo")}>
            👥 {t("os.duo")}
          </button>
        </div>
        <ul className={s.legend}>
          {SIDES.map((sd) => (
            <li key={sd.id}>
              <b>{sd.name}</b> — {t("os.pts", { n: sd.points })} · {Math.round(sd.weight * 100)}%
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const sideInfo = last ? SIDES.find((x) => x.id === last)! : null;

  return (
    <div className={s.wrap}>
      <div className={s.scores}>
        {(mode === "duo" ? [0, 1] : [0]).map((p) => (
          <div key={p} className={`${s.score} ${player === p && !done ? s.turn : ""}`}>
            <small>{mode === "duo" ? t(p === 0 ? "g.player1" : "g.player2") : t("g.score")}</small>
            <strong>{pts(p as 0 | 1)}</strong>
          </div>
        ))}
        <div className={s.score}>
          <small>{t("os.throws")}</small>
          <strong>
            {throws.length}/{total}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className={s.arena}
        onClick={doThrow}
        disabled={rolling || done}
        aria-label={t("os.throw")}
      >
        <span className={`${s.boneWrap} ${rolling ? s.rolling : last ? s.landed : ""}`}>
          <Bone side={rolling ? null : last} />
        </span>
        <span className={s.result} aria-live="polite">
          {sideInfo ? (
            <>
              <b>{sideInfo.name}!</b> +{sideInfo.points} · {t(sideInfo.desc)}
            </>
          ) : rolling ? (
            "…"
          ) : (
            t("os.tap")
          )}
        </span>
      </button>

      <ol className={s.history} aria-label={t("os.history")}>
        {throws.map((x, i) => (
          <li key={i} className={`${s[x.side]} ${mode === "duo" ? (x.player ? s.p2 : s.p1) : ""}`}>
            {SIDES.find((sd) => sd.id === x.side)!.name}
          </li>
        ))}
      </ol>

      <button type="button" className="btn btn-primary btn-big" onClick={doThrow} disabled={rolling || done}>
        🦴 {mode === "duo" && !done ? `${t(player ? "g.player2" : "g.player1")}: ` : ""}
        {t("os.throw")}
      </button>
      <p className={s.keys}>{t("g.keysSpace")}</p>
    </div>
  );
}
