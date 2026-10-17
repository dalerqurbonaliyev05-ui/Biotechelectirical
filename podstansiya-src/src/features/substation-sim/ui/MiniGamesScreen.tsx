"use client";

// Mashqlar sahifasi: barcha mini-o'yinlar mustaqil (tasodifiy ma'lumot bilan).

import { useState } from "react";
import { GAS_TYPES, OIL_PRACTICE } from "../data/minigames";
import { uz } from "../i18n/uz";
import { MINI_GAME_ORDER, type MiniGameKind } from "./minigames";
import MiniGameModal from "./minigames/MiniGameModal";
import ScreenHeader from "./ScreenHeader";

const M = uz.mini;
const EMOJI: Record<MiniGameKind, string> = { inspection: "👁", megger: "📟", oilSample: "🧪", gasSample: "🫧", thermo: "🌡" };

/** Mashq uchun tasodifiy boshlang'ich ma'lumot (o'lchov natijasi). */
function practiceProps(kind: MiniGameKind): Record<string, unknown> {
  if (kind === "oilSample") return { values: OIL_PRACTICE[Math.floor(Math.random() * OIL_PRACTICE.length)].values };
  if (kind === "gasSample") {
    const g = GAS_TYPES[Math.floor(Math.random() * GAS_TYPES.length)];
    return { values: { Rangi: g.color, Yonuvchanligi: g.flammable ? "yonadi" : "yonmaydi" } };
  }
  return {};
}

export default function MiniGamesScreen() {
  const [open, setOpen] = useState<{ kind: MiniGameKind; props: Record<string, unknown> } | null>(null);
  const [scores, setScores] = useState<Partial<Record<MiniGameKind, number>>>({});

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ScreenHeader title={M.title} subtitle={M.subtitle} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MINI_GAME_ORDER.map((kind) => (
          <li key={kind} className="card flex flex-col gap-2 p-4">
            <span className="text-3xl" aria-hidden="true">
              {EMOJI[kind]}
            </span>
            <h2 className="font-bold">{M.games[kind].title}</h2>
            <p className="flex-1 text-sm text-muted">{M.games[kind].desc}</p>
            {scores[kind] !== undefined && (
              <p className="text-sm">
                {M.score}: <b className="font-mono">{scores[kind]}</b>/100
              </p>
            )}
            <button type="button" className="btn-primary self-start" onClick={() => setOpen({ kind, props: practiceProps(kind) })}>
              ▶ {scores[kind] !== undefined ? M.again : M.open}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <MiniGameModal
          kind={open.kind}
          props={open.props}
          allowSkip={false}
          onClose={() => setOpen(null)}
          onDone={(r) => {
            if (r.score !== null) setScores((s) => ({ ...s, [open.kind]: r.score! }));
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
