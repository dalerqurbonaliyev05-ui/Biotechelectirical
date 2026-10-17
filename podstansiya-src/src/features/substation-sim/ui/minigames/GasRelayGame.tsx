"use client";

// Gaz relesi: ko'rish oynasidagi gaz → namuna → yonuvchanlik → gaz turi va harakat.

import { useState } from "react";
import { GAS_TYPES, type GasTypeId } from "../../data/minigames";
import { gasTypeOf } from "../../engine/minigames";
import { uz } from "../../i18n/uz";
import { fmt } from "../text";
import { Choices, Finish, Step, Verdict, type MiniGameProps } from "./common";

const G = uz.mini.gas;

export default function GasRelayGame({ values, onDone }: MiniGameProps) {
  const type = GAS_TYPES.find((g) => g.id === gasTypeOf(values ?? {})) ?? GAS_TYPES[0];
  const color = values?.Rangi ?? type.color;
  const [stage, setStage] = useState(0);
  const [picked, setPicked] = useState<GasTypeId | null>(null);
  const [tries, setTries] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 240 120" className="mx-auto w-full max-w-sm" role="img" aria-label={uz.mini.games.gasSample.title}>
        {/* quvur va rele korpusi */}
        <rect x="0" y="52" width="240" height="16" fill="#334155" />
        <rect x="70" y="30" width="100" height="60" rx="8" fill="#475569" stroke="#94a3b8" />
        {/* ko'rish oynasi */}
        <rect x="95" y="40" width="50" height="40" rx="4" fill="#b45309" opacity="0.55" />
        {stage >= 1 && <rect x="95" y="40" width="50" height="14" rx="4" fill={type.hex} opacity="0.9" />}
        <rect x="95" y="40" width="50" height="40" rx="4" fill="none" stroke="#e2e8f0" />
        {/* kran */}
        <rect x="116" y="18" width="8" height="12" fill="#94a3b8" />
        <circle cx="120" cy="14" r="6" fill={stage >= 2 ? "#22c55e" : "#64748b"} />
        {stage >= 3 && type.flammable && <path d="M200 40c-10-12 6-18 0-30 14 10 14 22 6 30z" fill="#f97316" />}
        {stage >= 3 && <text x="200" y="58" textAnchor="middle" fontSize="9" fill="#e2e8f0">{type.flammable ? "🔥" : "—"}</text>}
      </svg>

      <Step n={1} title={G.look} done={stage >= 1}>
        {stage >= 1 ? <p className="text-sm">{fmt(G.seen, { color })}</p> : <button type="button" className="btn-primary" onClick={() => setStage(1)}>👁 {G.look}</button>}
      </Step>
      {stage >= 1 && (
        <Step n={2} title={G.sample} done={stage >= 2}>
          {stage >= 2 ? <p className="text-sm">{G.sampled}</p> : <button type="button" className="btn-primary" onClick={() => setStage(2)}>🧪 {G.sample}</button>}
        </Step>
      )}
      {stage >= 2 && (
        <Step n={3} title={G.fire} done={stage >= 3}>
          {stage >= 3 ? <p className="text-sm">{type.flammable ? G.burns : G.noBurn}</p> : <button type="button" className="btn-primary" onClick={() => setStage(3)}>🔥 {G.fire}</button>}
        </Step>
      )}
      {stage >= 3 && (
        <Step n={4} title={G.classify} done={picked === type.id}>
          <Choices
            options={GAS_TYPES.map((g) => ({ id: g.id, text: G.types[g.id] }))}
            picked={picked}
            correct={type.id}
            onPick={(id) => {
              setPicked(id);
              setTries((t) => t + 1);
            }}
          />
          {picked && (
            <Verdict ok={picked === type.id}>
              <p>{type.meaning}</p>
              <p className="mt-1">
                <b>{G.action}:</b> {type.action}
              </p>
            </Verdict>
          )}
        </Step>
      )}
      {picked === type.id && <Finish score={tries <= 1 ? 100 : Math.max(25, 100 - (tries - 1) * 35)} onDone={onDone} />}
    </div>
  );
}
