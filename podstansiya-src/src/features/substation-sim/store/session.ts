"use client";

// O'yin sessiyasi: engine ustidagi yupqa Zustand qatlami (saqlanmaydi — har safar yangi smena).

import { create } from "zustand";
import { TOPOLOGY } from "../data/equipment";
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

  start: (scenarioId, mode) => {
    const scenario = getScenario(scenarioId);
    if (!scenario) return false;
    const ctx: SimContext = { topology: TOPOLOGY, scenario, mode };
    set({ ctx, sim: createSession(ctx), feedback: [], dismissed: [], focusRequest: null, selected: null, briefingOpen: true, startedAt: Date.now(), endedAt: null, recorded: false });
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
    if (action.type === "tick") {
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
      params: out.params,
      stepId: out.stepId,
      missingBefore: out.missingBefore,
      penalties: out.penalties,
    };
    const ended = out.state.status !== "running";
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

  select: (id) => set({ selected: id }),
  focus: (id) => set((s) => ({ selected: id, focusRequest: { id, nonce: (s.focusRequest?.nonce ?? 0) + 1 } })),
  dismissFeedback: (id) => set((s) => ({ dismissed: [...s.dismissed, id] })),
}));
