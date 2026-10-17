"use client";

// Termometr: moy termometrini o'qish va harorat bo'yicha harakatni tanlash (THERMAL chegaralari).

import { useState } from "react";
import { NORMS, THERMAL, type CoolingType } from "../../data/norms";
import { thermoState, type ThermoState } from "../../engine/minigames";
import { uz } from "../../i18n/uz";
import { fmt } from "../text";
import { Choices, Finish, Step, Verdict, type MiniGameProps } from "./common";

const T = uz.mini.thermo;
const MAX = 120;
/** Shkala: 0 °C — -225°, 120 °C — +45° (270° yoy) */
const angle = (c: number) => -225 + (Math.max(0, Math.min(MAX, c)) / MAX) * 270;
const pt = (deg: number, r: number) => [100 + r * Math.cos((deg * Math.PI) / 180), 100 + r * Math.sin((deg * Math.PI) / 180)] as const;

interface Props extends MiniGameProps {
  tempC?: number;
  cooling?: CoolingType;
}

export default function ThermometerGame({ tempC, cooling, onDone }: Props) {
  const [setup] = useState(() => ({
    temp: tempC !== undefined ? Math.round(tempC) : 35 + Math.round(Math.random() * 65),
    cooling: cooling ?? (Math.random() < 0.5 ? "M" : "D") as CoolingType,
  }));
  const lim = THERMAL[setup.cooling];
  const actual = thermoState(setup.temp, setup.cooling);
  const [read, setRead] = useState("");
  const [readOk, setReadOk] = useState<boolean | null>(null);
  const [state, setState] = useState<ThermoState | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const needle = (c: number, r: number, color: string, w: number) => {
    const [x, y] = pt(angle(c), r);
    return <line x1="100" y1="100" x2={x} y2={y} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 200 200" className="mx-auto w-56" role="img" aria-label={uz.mini.games.thermo.title}>
        <circle cx="100" cy="100" r="92" fill="#f8fafc" stroke="#64748b" strokeWidth="6" />
        {Array.from({ length: MAX / 5 + 1 }, (_, i) => i * 5).map((c) => {
          const [x1, y1] = pt(angle(c), c % 20 === 0 ? 68 : 74);
          const [x2, y2] = pt(angle(c), 80);
          return <line key={c} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f172a" strokeWidth={c % 20 === 0 ? 2 : 1} />;
        })}
        {Array.from({ length: MAX / 20 + 1 }, (_, i) => i * 20).map((c) => {
          const [x, y] = pt(angle(c), 56);
          return (
            <text key={c} x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#0f172a" fontFamily="monospace">
              {c}
            </text>
          );
        })}
        <text x="100" y="140" textAnchor="middle" fontSize="10" fill="#334155">
          °C
        </text>
        {needle(lim.topOilAlarmC.value, 84, "#f97316", 2)}
        {needle(lim.topOilMaxC.value, 84, "#dc2626", 2)}
        {needle(setup.temp, 70, "#0f172a", 3)}
        <circle cx="100" cy="100" r="6" fill="#0f172a" />
      </svg>
      <p className="text-center text-xs text-muted">
        {fmt(T.pointers, { alarm: String(lim.topOilAlarmC.value), max: String(lim.topOilMaxC.value) })} · {fmt(T.cooling, { c: setup.cooling })}
      </p>

      <Step n={1} title={T.readQ} done={readOk !== null}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const ok = Math.abs(Number(read.replace(",", ".")) - setup.temp) <= NORMS.thermoReadToleranceC.value;
            setReadOk(ok);
            if (!ok) setMistakes((m) => m + 1);
          }}
        >
          <input className="w-24 rounded-lg border border-line bg-ink-900 px-3 py-2 font-mono" inputMode="decimal" value={read} disabled={readOk !== null} onChange={(e) => setRead(e.target.value)} aria-label={T.readQ} required />
          <button type="submit" className="btn-primary" disabled={readOk !== null}>
            {T.read}
          </button>
        </form>
        {readOk !== null && <Verdict ok={readOk}>{fmt(readOk ? T.readOk : T.readBad, { t: String(setup.temp) })}</Verdict>}
      </Step>

      {readOk !== null && (
        <Step n={2} title={T.stateQ} done={state === actual}>
          <Choices
            options={(["normal", "alarm", "over"] as ThermoState[]).map((id) => ({ id, text: T.states[id] }))}
            picked={state}
            correct={actual}
            onPick={(id) => {
              setState(id);
              if (id !== actual) setMistakes((m) => m + 1);
            }}
          />
        </Step>
      )}
      {state === actual && <Finish score={Math.max(0, 100 - mistakes * 30)} onDone={onDone} />}
    </div>
  );
}
