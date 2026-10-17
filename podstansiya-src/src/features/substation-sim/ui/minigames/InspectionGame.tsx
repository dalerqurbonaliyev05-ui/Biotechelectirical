"use client";

// Obxod: transformatorni ko'zdan kechirish — nuqtalarni bosib, nosozlik belgilarini topish.

import { useState } from "react";
import { INSPECTION_CASES, INSPECTION_SPOTS, type InspectionSpotId } from "../../data/minigames";
import { checkInspection } from "../../engine/minigames";
import { uz } from "../../i18n/uz";
import { fmt } from "../text";
import { Finish, Verdict, type MiniGameProps } from "./common";

const I = uz.mini.insp;

/** Bosiladigan sohalar (SVG koordinatalarida) */
const ZONES: Record<InspectionSpotId, { x: number; y: number; w: number; h: number }> = {
  bushings: { x: 128, y: 50, w: 104, h: 60 },
  gauge: { x: 318, y: 30, w: 26, h: 28 },
  breather: { x: 292, y: 60, w: 28, h: 40 },
  gasRelay: { x: 240, y: 64, w: 34, h: 28 },
  radiators: { x: 50, y: 112, w: 60, h: 92 },
  fans: { x: 250, y: 186, w: 64, h: 34 },
  pit: { x: 30, y: 232, w: 300, h: 22 },
  ground: { x: 96, y: 206, w: 26, h: 30 },
};

function randomDefects(): InspectionSpotId[] {
  const ids = INSPECTION_SPOTS.map((s) => s.id);
  const n = 2 + Math.floor(Math.random() * 2);
  return [...ids].sort(() => Math.random() - 0.5).slice(0, n);
}

export default function InspectionGame({ category, onDone }: MiniGameProps) {
  const [defects] = useState<InspectionSpotId[]>(() => (category && INSPECTION_CASES[category]) || randomDefects());
  const [open, setOpen] = useState<InspectionSpotId | null>(null);
  const [visited, setVisited] = useState<InspectionSpotId[]>([]);
  const [marked, setMarked] = useState<InspectionSpotId[]>([]);
  const [result, setResult] = useState<ReturnType<typeof checkInspection> | null>(null);
  const bad = (id: InspectionSpotId) => defects.includes(id);
  const spot = INSPECTION_SPOTS.find((s) => s.id === open);
  const label = (id: string) => INSPECTION_SPOTS.find((s) => s.id === id)?.label ?? id;

  const visit = (id: InspectionSpotId) => {
    setOpen(id);
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{I.hint}</p>
      <svg viewBox="0 0 360 260" className="w-full rounded-xl bg-ink-950" role="group" aria-label={uz.mini.games.inspection.title}>
        <defs>
          <linearGradient id="tank" x1="0" x2="1">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="1" stopColor="#475569" />
          </linearGradient>
        </defs>
        {/* moy qabul qilgich (shag'al) */}
        <rect x="30" y="236" width="300" height="16" fill="#57534e" />
        {bad("pit") && <ellipse cx="90" cy="244" rx="34" ry="6" fill="#1c1917" opacity="0.9" />}
        {/* bak */}
        <rect x="112" y="108" width="136" height="112" rx="4" fill="url(#tank)" stroke="#94a3b8" />
        <text x="180" y="170" textAnchor="middle" fontSize="12" fill="#e2e8f0">T</text>
        {/* radiatorlar */}
        {[56, 70, 84, 98].map((x) => (
          <rect key={x} x={x} y="116" width="8" height="84" fill="#475569" stroke="#94a3b8" strokeWidth="0.6" />
        ))}
        <rect x="54" y="112" width="58" height="5" fill="#64748b" />
        <rect x="54" y="198" width="58" height="5" fill="#64748b" />
        {bad("radiators") && (
          <g fill="#a16207">
            <circle cx="102" cy="208" r="2" />
            <circle cx="102" cy="218" r="1.6" />
            <circle cx="102" cy="228" r="1.3" />
          </g>
        )}
        {/* ventilyatorlar */}
        {[268, 296].map((cx, i) => {
          const stopped = bad("fans") && i === 1;
          return (
            <g key={cx}>
              <circle cx={cx} cy="203" r="12" fill="#1e293b" stroke="#94a3b8" />
              <g className={stopped ? "" : "origin-center animate-spin motion-reduce:animate-none"} style={{ transformBox: "fill-box" }}>
                <path d={`M${cx} 193 L${cx + 3} 203 L${cx} 213 L${cx - 3} 203Z`} fill={stopped ? "#475569" : "#cbd5e1"} />
                <path d={`M${cx - 10} 203 L${cx} 200 L${cx + 10} 203 L${cx} 206Z`} fill={stopped ? "#475569" : "#cbd5e1"} />
              </g>
            </g>
          );
        })}
        <path d="M248 186 h66" stroke="#64748b" strokeWidth="3" />
        {/* kiritmalar */}
        {[146, 180, 214].map((x, i) => (
          <g key={x}>
            <rect x={x - 6} y="62" width="12" height="46" fill="#e7e5e4" stroke="#a8a29e" />
            {[70, 80, 90, 100].map((y) => (
              <rect key={y} x={x - 9} y={y} width="18" height="4" rx="2" fill="#d6d3d1" />
            ))}
            <circle cx={x} cy="58" r="4" fill="#b45309" />
            {bad("bushings") && i === 1 && <path d={`M${x - 4} 72 l5 8 -3 6 5 10`} stroke="#0f172a" strokeWidth="2" fill="none" />}
          </g>
        ))}
        {/* kengaytirgich va moy ko'rsatkichi */}
        <path d="M250 108 V78 H262 V50" stroke="#64748b" strokeWidth="5" fill="none" />
        <rect x="226" y="32" width="96" height="24" rx="12" fill="#64748b" stroke="#94a3b8" />
        <circle cx="331" cy="44" r="10" fill="#f8fafc" stroke="#94a3b8" />
        <line x1="331" y1="44" x2={bad("gauge") ? 325 : 338} y2={bad("gauge") ? 51 : 38} stroke="#dc2626" strokeWidth="2" />
        {/* gaz relesi */}
        <rect x="244" y="68" width="26" height="20" rx="3" fill="#334155" stroke="#94a3b8" />
        <rect x="251" y="72" width="12" height="12" fill="#b45309" opacity="0.6" />
        {bad("gasRelay") && <rect x="251" y="72" width="12" height="5" fill="#fde68a" />}
        {/* havo quritgich */}
        <path d="M300 56 V64" stroke="#64748b" strokeWidth="3" />
        <rect x="296" y="64" width="16" height="32" rx="3" fill={bad("breather") ? "#f9a8d4" : "#60a5fa"} stroke="#94a3b8" />
        {/* yerlash */}
        {bad("ground") ? (
          <path d="M112 214 h-6 v8 M106 228 v6 m-6 0 h12" stroke="#facc15" strokeWidth="2" fill="none" />
        ) : (
          <path d="M112 214 h-6 v20 m-6 0 h12" stroke="#facc15" strokeWidth="2" fill="none" />
        )}

        {/* bosiladigan sohalar */}
        {INSPECTION_SPOTS.map((s) => {
          const z = ZONES[s.id];
          const isMarked = marked.includes(s.id);
          return (
            <rect
              key={s.id}
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="4"
              role="button"
              tabIndex={0}
              aria-label={s.label}
              aria-pressed={open === s.id}
              className="cursor-pointer outline-none"
              fill={isMarked ? "rgba(239,68,68,0.18)" : "transparent"}
              stroke={open === s.id ? "#38bdf8" : isMarked ? "#ef4444" : visited.includes(s.id) ? "rgba(148,163,184,0.5)" : "rgba(56,189,248,0.35)"}
              strokeDasharray={visited.includes(s.id) ? undefined : "3 3"}
              onClick={() => visit(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  visit(s.id);
                }
              }}
            />
          );
        })}
      </svg>

      <p className="text-xs text-muted">{fmt(I.visited, { n: String(visited.length), total: String(INSPECTION_SPOTS.length) })}</p>

      {spot && !result && (
        <div className="rounded-xl border border-accent/50 bg-accent/5 p-3 text-sm" aria-live="polite">
          <p className="font-bold">{spot.label}</p>
          <p className="mt-1">{bad(spot.id) ? spot.defect : spot.ok}</p>
          <button
            type="button"
            className="btn-ghost mt-2 text-xs"
            onClick={() => setMarked((m) => (m.includes(spot.id) ? m.filter((x) => x !== spot.id) : [...m, spot.id]))}
          >
            {marked.includes(spot.id) ? I.unmark : `⚠ ${I.mark}`}
          </button>
        </div>
      )}

      {!result ? (
        <button type="button" className="btn-primary self-start" disabled={visited.length === 0} onClick={() => setResult(checkInspection(marked, defects))}>
          {I.finish}
        </button>
      ) : (
        <>
          <Verdict ok={result.ok}>
            {result.ok ? (
              <p>{I.allGood}</p>
            ) : (
              <ul className="list-disc pl-4">
                {result.found.length > 0 && <li>{I.found}: {result.found.map(label).join(", ")}</li>}
                {result.missed.length > 0 && <li>{I.missed}: {result.missed.map(label).join(", ")}</li>}
                {result.falseAlarms.length > 0 && <li>{I.falseAlarms}: {result.falseAlarms.map(label).join(", ")}</li>}
              </ul>
            )}
          </Verdict>
          <Finish score={Math.max(0, Math.round((result.found.length / defects.length) * 100) - result.falseAlarms.length * 15)} onDone={onDone} />
        </>
      )}
    </div>
  );
}
