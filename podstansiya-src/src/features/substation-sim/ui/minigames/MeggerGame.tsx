"use client";

// Megger: ulanish sxemasi → kuchlanish → 60 s o'lchash (R15, R60 ni o'z vaqtida yozish) → razryadlash.

import { useEffect, useState } from "react";
import { MEGGER_PRACTICE } from "../../data/minigames";
import { NORMS } from "../../data/norms";
import type { ProtocolSpec } from "../../engine/scenario";
import { captureOk } from "../../engine/minigames";
import { absorption } from "../../engine/protocol";
import { uz } from "../../i18n/uz";
import { fmt } from "../text";
import { Choices, Finish, Step, Verdict, type MiniGameProps } from "./common";

const G = uz.mini.megger;
const SPEEDUP = 4;
const VOLTS = [500, 1000, 2500];
type Conn = "right" | "floating" | "phases";

interface Props extends MiniGameProps {
  readings?: ProtocolSpec["readings"];
  /** O'ram o'lchanganda (protokolga ko'rsatkich ochiladi) */
  onMeasured?: (winding: string) => void;
}

export default function MeggerGame({ readings = MEGGER_PRACTICE.readings, onMeasured, onDone }: Props) {
  const [winding, setWinding] = useState<string | null>(null);
  const [conn, setConn] = useState<Conn | null>(null);
  const [volt, setVolt] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [r15, setR15] = useState<number | null>(null);
  const [r60, setR60] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [charged, setCharged] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const reading = readings.find((r) => r.winding === winding);
  const rightVolt = NORMS.meggerVoltageV.value;
  const ready = conn === "right" && volt === rightVolt;
  const active = running && t < 75;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setT((x) => x + 0.1 * SPEEDUP), 100);
    return () => window.clearInterval(id);
  }, [active]);

  const resetRun = () => {
    setRunning(false);
    setT(0);
    setR15(null);
    setR60(null);
  };

  const capture = (target: 15 | 60) => {
    if (!reading) return;
    if (captureOk(t, target)) {
      setMsg(null);
      if (target === 15) setR15(reading.r15);
      else {
        setR60(reading.r60);
        setRunning(false);
        setCharged(true);
      }
      return;
    }
    setMistakes((m) => m + 1);
    if (t < target) setMsg(G.early);
    else {
      setMsg(G.late);
      resetRun();
    }
  };

  const display = !running && r60 === null ? "—" : t < 15 ? G.measuring : t < 60 ? `${reading?.r15} MΩ` : `${reading?.r60} MΩ`;
  const allDone = readings.every((r) => done.includes(r.winding));

  return (
    <div className="flex flex-col gap-3">
      <Step n={1} title={G.winding}>
        <div className="flex flex-wrap gap-2">
          {readings.map((r) => (
            <button
              key={r.winding}
              type="button"
              disabled={done.includes(r.winding) || charged || running}
              aria-pressed={winding === r.winding}
              className={`btn-ghost text-sm ${winding === r.winding ? "border-accent bg-accent/15" : ""}`}
              onClick={() => {
                setWinding(r.winding);
                setConn(null);
                setVolt(null);
                resetRun();
              }}
            >
              {r.label} {done.includes(r.winding) && <span className="text-ok">✓</span>}
            </button>
          ))}
        </div>
        {charged && <p className="mt-2 text-sm text-warn">{G.dischargeFirst}</p>}
      </Step>

      {reading && !done.includes(reading.winding) && (
        <>
          <Step n={2} title={G.connQ} done={conn === "right"}>
            <Choices
              options={(["floating", "right", "phases"] as Conn[]).map((id) => ({ id, text: G.conn[id] }))}
              picked={conn}
              correct="right"
              onPick={(id) => {
                setConn(id);
                if (id !== "right") setMistakes((m) => m + 1);
              }}
            />
            {conn && conn !== "right" && <Verdict ok={false}>{G.connWhy[conn]}</Verdict>}
          </Step>

          {conn === "right" && (
            <Step n={3} title={G.voltQ} done={volt === rightVolt}>
              <div className="flex gap-2">
                {VOLTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={volt === rightVolt}
                    className={`btn-ghost font-mono ${volt === v ? (v === rightVolt ? "border-ok bg-ok/15" : "border-danger bg-danger/15") : ""}`}
                    onClick={() => {
                      setVolt(v);
                      if (v !== rightVolt) setMistakes((m) => m + 1);
                    }}
                  >
                    {v} V
                  </button>
                ))}
              </div>
              {volt !== null && <Verdict ok={volt === rightVolt}>{fmt(G.voltWhy, { v: String(rightVolt) })}</Verdict>}
            </Step>
          )}

          {ready && (
            <Step n={4} title={G.start} done={r60 !== null}>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink-950 p-3 font-mono">
                <div>
                  <p className="font-sans text-xs text-muted">{G.timer}</p>
                  <p className="text-2xl text-accent">{Math.min(60, Math.floor(t))} s</p>
                </div>
                <div aria-live="polite">
                  <p className="font-sans text-xs text-muted">R</p>
                  <p className="text-2xl text-ok">{display}</p>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">{G.speedNote}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!running && r60 === null && (
                  <button type="button" className="btn-primary" onClick={() => setRunning(true)}>
                    ▶ {G.start}
                  </button>
                )}
                {running && (
                  <>
                    <button type="button" className="btn-ghost" disabled={r15 !== null} onClick={() => capture(15)}>
                      {r15 !== null ? `✓ R15 = ${r15}` : G.capture15}
                    </button>
                    <button type="button" className="btn-ghost" disabled={r15 === null} onClick={() => capture(60)}>
                      {G.capture60}
                    </button>
                  </>
                )}
              </div>
              {msg && <p className="mt-2 text-sm text-warn">{msg}</p>}
              {r15 !== null && r60 !== null && (
                <>
                  <p className="mt-2 font-mono text-sm">
                    R15 = {r15} MΩ · R60 = {r60} MΩ ·{" "}
                    {fmt(G.kabs, { k: absorption(r15, r60).toFixed(2).replace(".", ","), min: String(NORMS.absorptionMin.value).replace(".", ",") })}
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-2"
                    onClick={() => {
                      setCharged(false);
                      setDone((d) => [...d, reading.winding]);
                      onMeasured?.(reading.winding);
                      setWinding(null);
                    }}
                  >
                    ⏚ {G.discharge}
                  </button>
                </>
              )}
            </Step>
          )}
        </>
      )}

      {allDone && <Finish score={Math.max(0, 100 - mistakes * 10)} onDone={onDone} />}
    </div>
  );
}
