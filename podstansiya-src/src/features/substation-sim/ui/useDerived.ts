"use client";

import { useMemo } from "react";
import { networkOf } from "../engine/simulator";
import { useSession } from "../store/session";

/** Joriy sessiya va undan hisoblangan tarmoq holati (faqat kommutatsiya o'zgarganda qayta hisoblanadi). */
export function useDerived() {
  const ctx = useSession((s) => s.ctx);
  const sim = useSession((s) => s.sim);
  const devices = sim?.devices;
  const sources = sim?.sourcesAvailable;
  const lf = sim?.loadFactor;
  const net = useMemo(
    () => (ctx && sim ? networkOf(ctx, sim) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tarmoq faqat shu maydonlarga bog'liq
    [ctx, devices, sources, lf],
  );
  return { ctx, sim, net };
}
