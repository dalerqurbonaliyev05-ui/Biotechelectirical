// S06–S21: har bir stsenariy uchun "to'g'ri yo'l" va "kritik xato" (yoki asosiy qoidabuzarlik) testlari.
import { describe, expect, it } from "vitest";
import { journalNow, run, sw, type ActionOrFn } from "../../engine/testkit";
import { summarize } from "../../engine/scoring";
import { applyAction } from "../../engine/simulator";
import type { Action, SimState } from "../../engine/types";
import type { SimContext } from "../../engine/simulator";
import { SCENARIOS, getScenario } from "./index";

const rb = (messageId: string, optionId = "ok"): Action => ({ type: "readback", messageId, optionId });
const report = (messageId: string): Action => ({ type: "report", messageId });
const choice = (decisionId: string, optionId: string): Action => ({ type: "choice", decisionId, optionId });
const measure = (measurementId: string): Action => ({ type: "measure", measurementId });
const wait = (sec: number): Action => ({ type: "wait", sec });
const tick = (dtSec: number): Action => ({ type: "tick", dtSec });
/** O'lchov natijasiga mos to'g'ri variantni tanlaydi. */
const choiceByResult = (decisionId: string): ActionOrFn => (s: SimState, ctx: SimContext) => {
  const d = ctx.scenario.decisions!.find((x) => x.id === decisionId)!;
  const opt = d.options.find((o) => o.correct || (o.correctWhen && o.correctWhen.categories.includes(s.measurements[o.correctWhen.measurementId]?.category ?? "")))!;
  return choice(decisionId, opt.id);
};
const clean = (r: ReturnType<typeof run>) => r.state.penalties.map((p) => `${p.code}:${p.params?.step ?? p.params?.device ?? ""}`);

describe("S06 — ortiqcha yuklanish", () => {
  const PATH: ActionOrFn[] = [rb("m1"), { type: "fans", transformerId: "T-1", on: true }, choice("fansQ", "a"), report("m1"), rb("m2"), sw("Q-F10-4", "open"), wait(1800), journalNow(), report("m2")];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S06, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: sovutishsiz qoldirilsa transformator qizib ketadi", () => {
    const r = run(SCENARIOS.S06, [rb("m1"), wait(3 * 3600)]);
    expect(r.state.status).toBe("failed");
    expect(r.state.failure?.code).toBe("transformerOverheat");
  });
  it("kasalxonani uzish — toifa tartibi buzilishi", () => {
    const r = run(SCENARIOS.S06, [rb("m1"), { type: "fans", transformerId: "T-1", on: true }, report("m1"), rb("m2"), sw("Q-F10-1", "open")], "practice");
    expect(r.state.penalties.map((p) => p.code)).toEqual(expect.arrayContaining(["shedPriority", "consumerLost"]));
  });
});

describe("S07 — parallel ulash", () => {
  const tapUp: Action = { type: "tap", transformerId: "T-2", dir: 1 };
  const PATH: ActionOrFn[] = [rb("m1"), choice("rpnQ", "no"), sw("Q-T2-110", "closed"), tapUp, tick(10), tapUp, tick(10), tapUp, tick(10), { type: "phasing", a: "T-2", b: "T-1" }, sw("Q-T2-35", "closed"), sw("Q-T2-10", "closed"), journalNow(), report("m1")];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S07, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("pog'onalar farqi bilan fazirovka — mos emas", () => {
    const r = run(SCENARIOS.S07, [rb("m1"), sw("Q-T2-110", "closed"), { type: "phasing", a: "T-2", b: "T-1" }]);
    expect(r.last.code).toBe("phasingMismatch");
  });
  it("fazirovkasiz va pog'onalar farqi bilan parallel ulash — qoidabuzarlik", () => {
    const r = run(SCENARIOS.S07, [rb("m1"), sw("Q-T2-110", "closed"), sw("Q-T2-10", "closed")], "practice");
    expect(r.state.penalties.map((p) => p.code)).toEqual(expect.arrayContaining(["parallelRatio", "parallelWithoutPhasing"]));
  });
});

describe("S08 — moy tahlili (tasodifiy natija)", () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    it(`to'g'ri yo'l, urug' ${seed}`, () => {
      const r = run(SCENARIOS.S08, [rb("m1"), measure("oil"), choiceByResult("decide"), report("m1")], "exam", seed);
      expect(clean(r)).toEqual([]);
      expect(r.state.status).toBe("completed");
    });
  }
  it("natijalar xilma-xil", () => {
    const cats = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => run(SCENARIOS.S08, [rb("m1"), measure("oil")], "exam", seed).state.measurements.oil.category));
    expect(cats.size).toBeGreaterThan(1);
  });
  it("o'lchovsiz qaror — qoidabuzarlik", () => {
    const r = run(SCENARIOS.S08, [rb("m1"), choice("decide", "keep")]);
    expect(r.last.code).toBe("decisionWithoutData");
  });
});

describe("S09 — marka tanlash", () => {
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S09, [choice("q1", "b"), choice("q2", "b"), choice("q3", "b"), choice("q4", "a"), report("m1")]);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("noto'g'ri tanlov jarimalanadi", () => {
    const r = run(SCENARIOS.S09, [choice("q1", "a")]);
    expect(r.last.code).toBe("wrongDecision");
  });
});

describe("S10 — gaz relesi", () => {
  const PATH: ActionOrFn[] = [rb("m1"), measure("gas"), choice("decide", "off"), sw("Q-SV10", "closed"), sw("Q-SV35", "closed"), sw("Q-T2-10", "open"), sw("Q-T2-35", "open"), sw("Q-T2-110", "open"), report("m1"), journalNow()];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S10, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: yuklama ostida ajratkich", () => {
    const r = run(SCENARIOS.S10, [rb("m1"), sw("QS-T2-10B", "open")]);
    expect(r.state.failure?.code).toBe("disconnectorUnderLoad");
  });
});

describe("S11 — yerga tutashuv", () => {
  const PATH: ActionOrFn[] = [rb("m1"), measure("volt"), choice("phase", "B"), sw("Q-F10-4", "open"), choice("next", "patrol"), report("m1"), journalNow()];
  it("to'g'ri yo'l: signal yo'qoladi", () => {
    const r = run(SCENARIOS.S11, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.alarms.some((a) => a.code === "earthFault" && a.active)).toBe(false);
    expect(r.state.status).toBe("completed");
  });
  it("1-toifa fiderni qidiruvda uzish — jarima, signal qoladi", () => {
    const r = run(SCENARIOS.S11, [rb("m1"), measure("volt"), choice("phase", "B"), sw("Q-F10-3", "open")]);
    expect(r.state.penalties.map((p) => p.code)).toContain("consumerLost");
    expect(r.state.alarms.some((a) => a.code === "earthFault" && a.active)).toBe(true);
  });
  it("taymer: uzoq kechikish — jarima", () => {
    const r = run(SCENARIOS.S11, [rb("m1"), wait(3 * 3600)]);
    expect(r.state.penalties.map((p) => p.code)).toContain("earthFaultTimeout");
  });
});

describe("S12 — moy sathi", () => {
  const PATH: ActionOrFn[] = [rb("m1"), measure("look"), choice("decide", "off"), sw("Q-SV10", "closed"), sw("Q-SV35", "closed"), sw("Q-T1-10", "open"), sw("Q-T1-35", "open"), sw("Q-T1-110", "open"), report("m1"), journalNow()];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S12, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: himoyani o'chirish", () => {
    const r = run(SCENARIOS.S12, [rb("m1"), measure("look"), choice("decide", "gas")]);
    expect(r.state.failure?.code).toBe("protectionDisabled");
  });
  it("kechikilsa gaz himoyasi o'chiradi, ABR yuklamani saqlaydi", () => {
    const r = run(SCENARIOS.S12, [rb("m1"), wait(3700)]);
    expect(r.state.devices["Q-T1-110"]).toBe("open");
    expect(r.state.alarms.some((a) => a.code === "gasTrip")).toBe(true);
    expect(r.state.devices["Q-SV10"]).toBe("closed");
  });
});

describe("S13 — izolyatsiya", () => {
  const PROTOCOL: Action = {
    type: "protocol",
    form: { kind: "insulation", tempC: 20, rows: [{ winding: "hv", r15: 820, r60: 880 }, { winding: "mv", r15: 560, r60: 610 }, { winding: "lv", r15: 300, r60: 330 }], conclusion: "unfit" },
  };
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S13, [PROTOCOL, measure("rw"), measure("oil"), choice("decide", "dry"), report("m1")]);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: yaroqsiz izolyatsiya bilan ishga tushirish", () => {
    const r = run(SCENARIOS.S13, [PROTOCOL, measure("rw"), measure("oil"), choice("decide", "energize")]);
    expect(r.state.failure?.code).toBe("energizeBadInsulation");
  });
});

describe("S14 — RPN nosozligi", () => {
  const down: Action = { type: "tap", transformerId: "T-2", dir: -1 };
  const PATH: ActionOrFn[] = [rb("m1"), choice("rpnQ", "stop"), choice("howQ", "equal"), down, tick(10), down, tick(10), down, tick(10), down, tick(10), sw("Q-SV10", "closed"), sw("Q-T1-10", "open"), report("m1"), journalNow()];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S14, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("nosoz RPN boshqarilmaydi", () => {
    const r = run(SCENARIOS.S14, [rb("m1"), { type: "tap", transformerId: "T-1", dir: 1 }]);
    expect(r.last.code).toBe("rpnStuck");
  });
  it("pog'onalar farqi bilan SV ulash — aylanma tok", () => {
    const r = run(SCENARIOS.S14, [rb("m1"), choice("rpnQ", "stop"), choice("howQ", "equal"), sw("Q-SV10", "closed")], "practice");
    expect(r.state.penalties.map((p) => p.code)).toContain("parallelRatio");
  });
});

describe("S15 — 110 kV QT", () => {
  const PATH: ActionOrFn[] = [rb("m1"), choice("reclose", "no"), sw("QS-W1L", "open"), sw("QS-W1B", "open"), { type: "verifyDead", nodeId: "W1" }, sw("QSG-W1L", "closed"), measure("patrol"), choice("ice", "melt"), report("m1"), journalNow()];
  it("ABR seksiya o'chirgichini ulagan, yuklama saqlangan", () => {
    const r = run(SCENARIOS.S15, []);
    expect(r.state.devices["Q-SV110"]).toBe("closed");
    expect(r.state.alarms.some((a) => a.code === "apvFail")).toBe(true);
  });
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S15, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: ko'r-ko'rona qayta ulash", () => {
    const r = run(SCENARIOS.S15, [rb("m1"), sw("Q-W1", "closed")]);
    expect(r.state.failure?.code).toBe("closeOntoFault");
  });
});

describe("S16 — yong'in", () => {
  const PATH: ActionOrFn[] = [
    { type: "call", to: "fire" },
    sw("Q-SV10", "closed"),
    sw("Q-SV35", "closed"),
    sw("Q-T1-10", "open"),
    sw("Q-T1-35", "open"),
    sw("Q-T1-110", "open"),
    sw("QS-T1-110T", "open"),
    sw("QS-T1-110B", "open"),
    sw("QS-T1-35T", "open"),
    sw("QS-T1-35B", "open"),
    sw("QS-T1-10T", "open"),
    sw("QS-T1-10B", "open"),
    { type: "inspect", targetId: "T-1" },
    report("m1"),
    journalNow(),
  ];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S16, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: kechikish — yong'in tarqaladi", () => {
    const r = run(SCENARIOS.S16, [{ type: "call", to: "fire" }, wait(1000)]);
    expect(r.state.failure?.code).toBe("fireSpread");
  });
  it("kritik: yuklama ostida ajratkich", () => {
    const r = run(SCENARIOS.S16, [sw("QS-T1-110B", "open")]);
    expect(r.state.failure?.code).toBe("disconnectorUnderLoad");
  });
});

describe("S17 — kaskad", () => {
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S17, [rb("m1"), sw("Q-F10-4", "open"), wait(1200), report("m1"), journalNow()]);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("2-toifani 3-toifadan oldin uzish — tartib buzilishi", () => {
    const r = run(SCENARIOS.S17, [rb("m1"), sw("Q-F35-2", "open")], "practice");
    expect(r.state.penalties.map((p) => p.code)).toContain("shedPriority");
  });
});

describe("S18 — yangi transformator (35 kV)", () => {
  const PROTOCOL: Action = { type: "protocol", form: { kind: "insulation", tempC: 18, rows: [{ winding: "hv", r15: 1900, r60: 2900 }, { winding: "lv", r15: 1100, r60: 1650 }], conclusion: "fit" } };
  const task = (taskId: string): Action => ({ type: "task", taskId });
  const PATH: ActionOrFn[] = [
    rb("m1"),
    task("docs"),
    measure("impact"),
    task("foundation"),
    task("assembly"),
    task("vacuum"),
    measure("oil"),
    PROTOCOL,
    measure("rw"),
    measure("ratio"),
    measure("group"),
    measure("noload"),
    choice("tests", "ok"),
    choice("relay", "ok"),
    task("phasing"),
    sw("QSG-T3-35", "open"),
    sw("QSG-T3-10", "open"),
    sw("QS-T3-35B", "closed"),
    sw("QS-T3-35T", "closed"),
    sw("QS-T3-10T", "closed"),
    sw("QS-T3-10B", "closed"),
    sw("Q-T3-35", "closed"),
    sw("Q-T3-35", "open"),
    sw("Q-T3-35", "closed"),
    sw("Q-T3-35", "open"),
    sw("Q-T3-35", "closed"),
    wait(1800),
    sw("Q-T3-10", "closed"),
    report("m1"),
    journalNow(),
  ];
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S18, PATH);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kritik: yerlagich olinmay kuchlanish berish", () => {
    const r = run(SCENARIOS.S18, [rb("m1"), sw("QS-T3-35B", "closed"), sw("QS-T3-35T", "closed"), sw("Q-T3-35", "closed")]);
    expect(r.state.failure?.code).toBe("energizeEarthed");
  });
});

describe("S19 — ABR ishlamadi", () => {
  it("boshlanishda seksiya kuchlanishsiz, ABR rad etgan", () => {
    const r = run(SCENARIOS.S19, []);
    expect(r.state.alarms.some((a) => a.code === "abrFail")).toBe(true);
    expect(r.state.devices["Q-SV10"]).toBe("open");
  });
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S19, [{ type: "checkPosition", deviceId: "Q-T1-10" }, sw("Q-SV10", "closed"), choice("reclose", "no"), report("m1"), journalNow()]);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("kechikish — jarima", () => {
    const r = run(SCENARIOS.S19, [wait(700)]);
    expect(r.state.penalties.map((p) => p.code)).toContain("stepLate");
  });
});

describe("S20 — chaqmoq", () => {
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S20, [rb("m1"), measure("counter"), measure("look"), measure("relay"), choice("decide", "keep"), report("m1"), journalNow()]);
    expect(clean(r)).toEqual([]);
    expect(r.state.status).toBe("completed");
  });
  it("noto'g'ri qaror", () => {
    const r = run(SCENARIOS.S20, [rb("m1"), measure("counter"), measure("look"), measure("relay"), choice("decide", "replace")]);
    expect(r.last.code).toBe("wrongDecision");
  });
});

describe("S21 — smena", () => {
  /** Smena yo'li: modullar tartibida — hodisagacha kutish, keyin modul amallari. */
  function shiftPath(seed: number): ActionOrFn[] {
    const sc = getScenario("S21", seed)!;
    const path: ActionOrFn[] = [];
    for (let i = 1; i <= 4; i++) {
      const p = `e${i}`;
      path.push((s) => {
        const ev = sc.timeline!.find((t) => t.id === `${p}-msg`)!;
        const at = (ev.trigger as { at: string }).at.split(":").map(Number);
        return wait(Math.max(0, at[0] * 3600 + at[1] * 60 - s.time + 1));
      });
      path.push(rb(`${p}-m`));
      const has = (id: string) => sc.steps.some((x) => x.id === id);
      if (has(`${p}-qs`)) path.push(sw("Q-F10-2", "open"), sw("QS-F10-2B", "open"), journalNow());
      if (has(`${p}-tap`)) for (let k = 0; k < 2; k++) path.push({ type: "tap", transformerId: "T-1", dir: 1 }, tick(10));
      if (has(`${p}-find`)) path.push(sw("Q-F10-4", "open"));
      if (has(`${p}-fans`)) path.push({ type: "fans", transformerId: "T-2", on: true });
      if (has(`${p}-gas`)) path.push(measure(`${p}-gas`), choice(`${p}-d`, "air"));
      path.push(report(`${p}-m`));
    }
    path.push(journalNow("Smena yakuni"));
    return path;
  }
  for (const seed of [1, 7, 42]) {
    it(`to'g'ri yo'l, urug' ${seed}`, () => {
      const sc = getScenario("S21", seed)!;
      const r = run(sc, shiftPath(seed), "exam", seed);
      expect(clean(r)).toEqual([]);
      expect(r.state.status).toBe("completed");
      expect(summarize(r.state).stars).toBe(3);
    });
  }
  it("turli urug' — turli hodisalar", () => {
    const sets = [1, 2, 3, 4, 5].map((seed) => getScenario("S21", seed)!.steps.map((s) => s.id).join());
    expect(new Set(sets).size).toBeGreaterThan(1);
  });
});

describe("tick va xavfsizlik", () => {
  it("tick: yakunlangan stsenariyda hech narsa o'zgarmaydi", () => {
    const r = run(SCENARIOS.S09, [choice("q1", "b"), choice("q2", "b"), choice("q3", "b"), choice("q4", "a"), report("m1")]);
    const ctx: SimContext = r.ctx;
    expect(applyAction(ctx, r.state, tick(60)).state.time).toBe(r.state.time);
  });
});
