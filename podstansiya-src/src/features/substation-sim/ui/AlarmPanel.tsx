"use client";

// Signal paneli: faol signallar (rang + belgi + matn). Ixcham variant sxema ustida.

import { formatClock } from "../engine/journal";
import { uz } from "../i18n/uz";
import { fmt } from "./text";
import { useDerived } from "./useDerived";

const SEVERE = new Set(["fire", "gasTrip", "diffTrip", "apvFail", "abrFail", "earthFault", "oilTempHigh", "overload", "lineTrip", "mtzTrip"]);

export default function AlarmPanel({ compact = false }: { compact?: boolean }) {
  const { sim } = useDerived();
  if (!sim) return null;
  const active = sim.alarms.filter((a) => a.active);
  if (compact && active.length === 0) return null;
  const list = compact ? active.slice(-3) : sim.alarms.slice().reverse();
  return (
    <section aria-label={uz.alarms.title} aria-live="polite" className={compact ? "pointer-events-none flex flex-col gap-1" : ""}>
      {!compact && <h4 className="mb-1 text-sm font-bold">{uz.alarms.title}</h4>}
      {!compact && list.length === 0 && <p className="text-sm text-muted">{uz.alarms.none}</p>}
      <ul className="flex flex-col gap-1">
        {list.map((a) => {
          const severe = SEVERE.has(a.code);
          return (
            <li
              key={a.id}
              className={`flex items-start gap-2 rounded-lg border px-2 py-1 text-xs ${
                !a.active ? "border-line/40 text-muted" : severe ? "border-danger/60 bg-danger/15 text-text" : "border-warn/60 bg-warn/10 text-text"
              } ${compact ? "backdrop-blur" : ""}`}
            >
              <span aria-hidden="true" className={a.active && severe ? "animate-pulse text-danger" : a.active ? "text-warn" : ""}>
                {a.active ? "●" : "○"}
              </span>
              <span className="flex-1">
                <span className="font-mono text-muted">{formatClock(a.t)} </span>
                {fmt(uz.alarms[a.code] ?? a.code, a.params)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
