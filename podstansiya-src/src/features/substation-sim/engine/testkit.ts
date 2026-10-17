// Testlar uchun yordamchilar (faqat *.test.ts da ishlatiladi).
import { TOPOLOGY } from "../data/equipment";
import type { ScenarioDef } from "./scenario";
import { formatClock } from "./journal";
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

export function run(scenario: ScenarioDef, actions: ActionOrFn[], mode: GameMode = "exam") {
  const ctx: SimContext = { topology: TOPOLOGY, scenario, mode };
  let state: SimState = createSession(ctx);
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
