"use client";

// O'yin sessiyasi: engine ustidagi yupqa Zustand qatlami (saqlanmaydi — har safar yangi smena).

import { create } from "zustand";
import { topologyFor } from "../data/topologies";
import { getScenario } from "../data/scenarios";
import { summarize } from "../engine/scoring";
import { applyAction, createSession, type SimContext } from "../engine/simulator";
import type { Action, GameMode, Penalty, Severity, SimState } from "../engine/types";
import { useProgress } from "./progress";

export interface Feedback {
  id: number;
  severity: Severity;
  code: string;
  applied: boolean;
  blocked: boolean;
  action: Action;
  params?: Record<string, string>;
  stepId?: string;
  missingBefore?: string[];
  penalties: Penalty[];
}

interface SessionStore {
  ctx: SimContext | null;
  sim: SimState | null;
  feedback: Feedback[];
  selected: string | null;
  /** Sxemani shu uskunaga markazlashtirish so'rovi (rejadan o'tishda) */
  focusRequest: { id: string; nonce: number } | null;
  dismissed: number[];
  briefingOpen: boolean;
  startedAt: number;
  endedAt: number | null;
  recorded: boolean;
  /** Megger bilan o'lchangan o'ramlar (protokol asbobida ko'rsatkich ochiladi) */
  meggerDone: string[];
  markMegger: (winding: string) => void;
  start: (scenarioId: string, mode: GameMode) => boolean;
  restart: () => void;
  beginShift: () => void;
  dispatch: (action: Action) => Feedback | null;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  dismissFeedback: (id: number) => void;
}

let fid = 0;

export const useSession = create<SessionStore>()((set, get) => ({
  ctx: null,
  sim: null,
  feedback: [],
  selected: null,
  focusRequest: null,
  dismissed: [],
  briefingOpen: true,
  startedAt: 0,
  endedAt: null,
  recorded: false,
  meggerDone: [],

  start: (scenarioId, mode) => {
    // Har urinishda yangi urug': o'lchov natijalari va smena hodisalari har safar boshqacha
    const seed = (Math.random() * 2 ** 31) >>> 0;
    const scenario = getScenario(scenarioId, seed);
    if (!scenario) return false;
    const ctx: SimContext = { topology: topologyFor(scenario.topology).topology, scenario, mode };
    set({ ctx, sim: createSession(ctx, seed), feedback: [], dismissed: [], focusRequest: null, selected: null, briefingOpen: true, startedAt: Date.now(), endedAt: null, recorded: false, meggerDone: [] });
    return true;
  },

  restart: () => {
    const { ctx } = get();
    if (ctx) get().start(ctx.scenario.id, ctx.mode);
  },

  beginShift: () => set({ briefingOpen: false, startedAt: Date.now() }),

  dispatch: (action) => {
    const { ctx, sim } = get();
    if (!ctx || !sim || sim.status !== "running") return null;
    const out = applyAction(ctx, sim, action);
    const ended = out.state.status !== "running";
    // Soat yurishi: faqat jarima (himoya, muddat o'tishi) yoki stsenariy to'xtashi haqida xabar beriladi
    const quiet = (action.type === "tick" || (action.type === "wait" && !out.stepId)) && out.severity === "ok";
    if (quiet && !ended && out.penalties.length === 0) {
      set({ sim: out.state });
      return null;
    }
    const fb: Feedback = {
      id: ++fid,
      severity: out.severity,
      code: out.code,
      applied: out.applied,
      blocked: !out.applied && (out.severity === "violation" || out.severity === "critical"),
      action,
      params: out.params ?? out.penalties[0]?.params,
      stepId: out.stepId,
      missingBefore: out.missingBefore,
      penalties: out.penalties,
    };
    set((s) => ({ sim: out.state, feedback: [...s.feedback, fb], endedAt: ended ? Date.now() : s.endedAt }));
    if (ended && !get().recorded) {
      const sum = summarize(out.state);
      useProgress.getState().recordAttempt({
        scenarioId: ctx.scenario.id,
        score: sum.score,
        stars: sum.stars,
        timeSec: Math.round((Date.now() - get().startedAt) / 1000),
        completed: out.state.status === "completed" && sum.stars > 0,
        mode: ctx.mode,
      });
      set({ recorded: true });
    }
    return fb;
  },

  markMegger: (w) => set((s) => (s.meggerDone.includes(w) ? s : { meggerDone: [...s.meggerDone, w] })),
  select: (id) => set({ selected: id }),
  focus: (id) => set((s) => ({ selected: id, focusRequest: { id, nonce: (s.focusRequest?.nonce ?? 0) + 1 } })),
  dismissFeedback: (id) => set((s) => ({ dismissed: [...s.dismissed, id] })),
}));
