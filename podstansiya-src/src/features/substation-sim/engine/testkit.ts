// Testlar uchun yordamchilar (faqat *.test.ts da ishlatiladi).
import { topologyFor } from "../data/topologies";
import type { ScenarioDef } from "./scenario";
import { formatClock } from "./journal";
import { matchStep } from "./sequence";
import { applyAction, createSession, opsSinceLastJournal, type SimContext } from "./simulator";
import type { Action, ActionOutcome, GameMode, SimState } from "./types";

export function bareScenario(over: Partial<ScenarioDef> = {}): ScenarioDef {
  return {
    id: "TEST",
    level: 1,
    title: "test",
    objective: "",
    briefing: "",
    kind: "switching",
    situation: { timeStart: "09:00", weather: "clear", season: "summer", ambientC: 25, loadFactor: 1 },
    orderRequired: false,
    messages: [],
    steps: [],
    analysis: "",
    ...over,
  };
}

export type ActionOrFn = Action | ((s: SimState, ctx: SimContext) => Action);

export function run(scenario: ScenarioDef, actions: ActionOrFn[], mode: GameMode = "exam", seed = 1) {
  const ctx: SimContext = { topology: topologyFor(scenario.topology).topology, scenario, mode };
  let state: SimState = createSession(ctx, seed);
  const outcomes: ActionOutcome[] = [];
  for (const a of actions) {
    const o = applyAction(ctx, state, typeof a === "function" ? a(state, ctx) : a);
    outcomes.push(o);
    state = o.state;
  }
  return { ctx, state, outcomes, last: outcomes[outcomes.length - 1] };
}

export const sw = (deviceId: string, to: "open" | "closed"): Action => ({ type: "switch", deviceId, to });

/** Oxirgi jurnal yozuvidan keyingi amallar bo'yicha to'g'ri jurnal yozuvini tuzadi. */
export function journalNow(order = "Dispetcher buyrug'i"): ActionOrFn {
  return (s, ctx) => {
    const ops = opsSinceLastJournal(ctx, s);
    const t = ops.length ? ops[ops.length - 1].t : s.time;
    return {
      type: "journal",
      entry: { time: formatClock(t), from: "Dispetcher", orderText: order, doneText: ops.map((o) => o.label).join(", "), executor: "Talaba" },
    };
  };
}

/**
 * Yo'lga (index joyiga) blanka topshirish amalini qo'shadi: blanka tartibi yo'ldagi keyingi
 * amallarning qaysi qadamlarga mos kelishidan hisoblanadi — ya'ni talaba aynan shu tartibni rejalashtirgan.
 */
export function withBlank(path: ActionOrFn[], index: number): ActionOrFn[] {
  const blankAction: ActionOrFn = (s, ctx) => {
    const spec = ctx.scenario.blank;
    const done = [...s.doneSteps];
    const order: string[] = [];
    for (const a of path.slice(index)) {
      if (typeof a === "function") continue;
      const m = matchStep(ctx.scenario.steps, done, a);
      if (m.step) {
        done.push(m.step.id);
        if (spec?.stepIds.includes(m.step.id)) order.push(m.step.id);
      }
    }
    return { type: "blankSubmit", order };
  };
  return [...path.slice(0, index), blankAction, ...path.slice(index)];
}
