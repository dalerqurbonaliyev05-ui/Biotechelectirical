"use client";

import { motion } from "framer-motion";
import { formatClock } from "../engine/journal";
import { uz } from "../i18n/uz";
import { useSession } from "../store/session";
import { useSettings } from "../store/settings";
import { useDerived } from "./useDerived";

export default function BriefingModal() {
  const { ctx, sim } = useDerived();
  const open = useSession((s) => s.briefingOpen);
  const begin = useSession((s) => s.beginShift);
  const animations = useSettings((s) => s.animations);
  if (!ctx || !sim || !open) return null;
  const sc = ctx.scenario;
  const G = uz.game;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="brief-title">
      <motion.div initial={animations ? { opacity: 0, y: 20 } : false} animate={{ opacity: 1, y: 0 }} className="card max-h-[90dvh] w-full max-w-xl overflow-y-auto p-6">
        <p className="font-mono text-xs text-accent">
          {sc.id} · {uz.common.level} {sc.level}: {uz.levels[sc.level].name}
        </p>
        <h2 id="brief-title" className="h-display mt-1 text-2xl font-bold">
          {sc.title}
        </h2>
        <p className="mt-3 leading-relaxed">{sc.briefing}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-ink-900/70 p-2">
            <dt className="text-xs text-muted">{G.startTime}</dt>
            <dd className="font-mono font-bold">{formatClock(sim.time)}</dd>
          </div>
          <div className="rounded-lg bg-ink-900/70 p-2">
            <dt className="text-xs text-muted">{G.weatherLabel}</dt>
            <dd className="font-bold">
              {uz.weather[sc.situation.weather]}, {sc.situation.ambientC} °C
            </dd>
          </div>
          <div className="rounded-lg bg-ink-900/70 p-2">
            <dt className="text-xs text-muted">{G.load}</dt>
            <dd className="font-bold">{Math.round(sc.situation.loadFactor * 100)}%</dd>
          </div>
          <div className="rounded-lg bg-ink-900/70 p-2">
            <dt className="text-xs text-muted">{G.modeLabel}</dt>
            <dd className="font-bold">{uz.modes[ctx.mode].name}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">{uz.modes[ctx.mode].desc}</p>
        <button type="button" className="btn-primary mt-5 w-full py-3 text-base" onClick={begin} autoFocus>
          ▶ {G.begin}
        </button>
      </motion.div>
    </div>
  );
}
