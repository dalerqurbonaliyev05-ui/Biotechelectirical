// Har bir stsenariy uchun: ma'lumot to'g'riligi, kamida bitta "to'g'ri yo'l" va bitta "kritik xato" testi.
import { describe, expect, it } from "vitest";
import { TOPOLOGY } from "../equipment";
import { journalNow, run, sw, type ActionOrFn } from "../../engine/testkit";
import { validateSteps } from "../../engine/sequence";
import { summarize } from "../../engine/scoring";
import type { Action } from "../../engine/types";
import { SCENARIOS } from "./index";
import { SCENARIO_CATALOG } from "./catalog";

const ALL_IDS = new Set<string>([
  ...TOPOLOGY.switches.map((s) => s.id),
  ...TOPOLOGY.earthSwitches.map((e) => e.id),
  ...TOPOLOGY.transformers.map((t) => t.id),
  ...TOPOLOGY.loads.map((l) => l.id),
  ...TOPOLOGY.instruments.map((i) => i.id),
  ...TOPOLOGY.nodes.map((n) => n.id),
]);

const tick = (dtSec: number): Action => ({ type: "tick", dtSec });
const rb = (messageId: string, optionId = "ok"): Action => ({ type: "readback", messageId, optionId });
const report = (messageId: string): Action => ({ type: "report", messageId });

describe("stsenariy ma'lumotlari", () => {
  for (const sc of Object.values(SCENARIOS)) {
    it(`${sc.id}: qadamlar DAG'i to'g'ri va uskuna id'lari mavjud`, () => {
      expect(validateSteps(sc.steps)).toEqual([]);
      for (const step of sc.steps) {
        for (const m of Array.isArray(step.match) ? step.match : [step.match]) {
          const ids = "deviceId" in m ? [m.deviceId] : "targetId" in m ? [m.targetId] : "nodeIds" in m ? m.nodeIds : "transformerId" in m ? [m.transformerId] : [];
          for (const id of ids) expect(ALL_IDS.has(id), `${sc.id}/${step.id}: ${id}`).toBe(true);
          if (m.type === "readback" || m.type === "report") expect(sc.messages.some((x) => x.id === m.messageId)).toBe(true);
        }
      }
      expect(SCENARIO_CATALOG.find((c) => c.id === sc.id)?.playable).toBe(true);
    });
  }
});

// ---------- S01 ----------
const S01_TARGETS = ["W1", "B110-1", "Q-W1", "QS-W1L", "QSG-W1L", "T-1", "TT-T1-110", "TN-110-1", "OPN-T1-110", "Q-SV10", "L-F10-1"];
describe("S01 — tanishuv", () => {
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S01, [...S01_TARGETS.map((id): Action => ({ type: "inspect", targetId: id })), report("m1")]);
    expect(r.state.status).toBe("completed");
    expect(summarize(r.state).score).toBe(100);
  });
  it("kritik xato: buyruqsiz yuklama ostida ajratkichni ochish", () => {
    const r = run(SCENARIOS.S01, [sw("QS-W1B", "open")]);
    expect(r.state.status).toBe("failed");
    expect(r.state.failure?.code).toBe("disconnectorUnderLoad");
  });
});

// ---------- S02 ----------
const PERMIT_OK: Action = {
  type: "permitIssue",
  permit: {
    workName: "T-1 ta'mirlash",
    leader: "Rahimov A.",
    brigadeSize: 3,
    liveParts: ["B110-1", "B35-1", "B10-1"],
    measures: ["switchedOff", "verifiedDead", "earthed", "posters", "fenced"],
  },
};
const S02_PATH: ActionOrFn[] = [
  rb("m1"),
  PERMIT_OK,
  sw("Q-SV10", "closed"),
  sw("Q-SV35", "closed"),
  sw("Q-T1-10", "open"),
  sw("Q-T1-35", "open"),
  sw("Q-T1-110", "open"),
  { type: "checkPosition", deviceId: "Q-T1-110" },
  sw("QS-T1-110T", "open"),
  sw("QS-T1-110B", "open"),
  sw("QS-T1-35T", "open"),
  sw("QS-T1-35B", "open"),
  sw("QS-T1-10T", "open"),
  sw("QS-T1-10B", "open"),
  { type: "poster", targetId: "QS-T1-110B", poster: "doNotSwitch", on: true },
  { type: "poster", targetId: "QS-T1-35B", poster: "doNotSwitch", on: true },
  { type: "poster", targetId: "QS-T1-10B", poster: "doNotSwitch", on: true },
  { type: "verifyDead", nodeId: "T1:H" },
  sw("QSG-T1-110", "closed"),
  { type: "verifyDead", nodeId: "T1:M" },
  sw("QSG-T1-35", "closed"),
  { type: "verifyDead", nodeId: "T1:L" },
  sw("QSG-T1-10", "closed"),
  { type: "poster", targetId: "T-1", poster: "workHere", on: true },
  journalNow("T-1 ni rejali ta'mirga chiqarish"),
  { type: "admit" },
  report("m1"),
];

describe("S02 — transformatorni ta'mirga chiqarish", () => {
  it("to'g'ri yo'l — 100 ball, 3 yulduz, iste'molchilar uzilmagan", () => {
    const r = run(SCENARIOS.S02, S02_PATH);
    expect(r.state.penalties).toEqual([]);
    expect(r.state.status).toBe("completed");
    expect(summarize(r.state).stars).toBe(3);
  });

  it("boshqa to'g'ri tartib (35 kV avval, so'ng 10 kV) ham qabul qilinadi", () => {
    const path = [...S02_PATH];
    const i10 = path.findIndex((a) => typeof a === "object" && a.type === "switch" && a.deviceId === "Q-T1-10");
    [path[i10], path[i10 + 1]] = [path[i10 + 1], path[i10]];
    const r = run(SCENARIOS.S02, path);
    expect(r.state.penalties).toEqual([]);
  });

  it("kritik xato: o'chirgichdan oldin ajratkichni ochish (imtihon rejimi)", () => {
    const r = run(SCENARIOS.S02, [rb("m1"), sw("Q-SV10", "closed"), sw("QS-T1-10B", "open")]);
    expect(r.state.status).toBe("failed");
    expect(r.state.failure?.code).toBe("disconnectorUnderLoad");
  });

  it("kritik xato: kuchlanish yo'qligini tekshirmay yerlash", () => {
    const upToDisconnectors = S02_PATH.slice(0, 17);
    const r = run(SCENARIOS.S02, [...upToDisconnectors, sw("QSG-T1-110", "closed")]);
    expect(r.state.failure?.code).toBe("earthWithoutVerify");
  });

  it("yuklamani o'tkazmay o'chirish — iste'molchilar uzilishi jarimasi va tartib xatosi", () => {
    const r = run(SCENARIOS.S02, [rb("m1"), sw("Q-T1-10", "open")], "practice");
    const codes = r.state.penalties.map((p) => p.code);
    expect(codes).toContain("wrongOrder");
    expect(codes).toContain("consumerLost");
  });

  it("o'qitish rejimida noto'g'ri tartib to'siladi", () => {
    const r = run(SCENARIOS.S02, [rb("m1"), sw("Q-SV10", "closed"), sw("Q-SV35", "closed"), sw("Q-T1-110", "open")], "training");
    expect(r.last.applied).toBe(false);
    expect(r.last.code).toBe("wrongOrder");
    expect(r.state.devices["Q-T1-110"]).toBe("closed");
  });

  it("tayyorlanmagan joyga dopusk — qoidabuzarlik", () => {
    const r = run(SCENARIOS.S02, [rb("m1"), PERMIT_OK, { type: "admit" }], "practice");
    expect(r.state.penalties.map((p) => p.code)).toContain("admitNotPrepared");
  });
});

// ---------- S03 ----------
const S03_PATH: ActionOrFn[] = [
  rb("m1"),
  { type: "finishWork" },
  { type: "poster", targetId: "T-1", poster: "workHere", on: false },
  sw("QSG-T1-110", "open"),
  sw("QSG-T1-35", "open"),
  sw("QSG-T1-10", "open"),
  { type: "poster", targetId: "QS-T1-110B", poster: "doNotSwitch", on: false },
  { type: "poster", targetId: "QS-T1-35B", poster: "doNotSwitch", on: false },
  { type: "poster", targetId: "QS-T1-10B", poster: "doNotSwitch", on: false },
  sw("QS-T1-110B", "closed"),
  sw("QS-T1-110T", "closed"),
  sw("QS-T1-35B", "closed"),
  sw("QS-T1-35T", "closed"),
  sw("QS-T1-10B", "closed"),
  sw("QS-T1-10T", "closed"),
  sw("Q-T1-110", "closed"),
  sw("Q-T1-35", "closed"),
  sw("Q-T1-10", "closed"),
  sw("Q-SV10", "open"),
  sw("Q-SV35", "open"),
  journalNow("T-1 ni ishga tushirish"),
  report("m1"),
];

describe("S03 — ishga tushirish", () => {
  it("to'g'ri yo'l", () => {
    const r = run(SCENARIOS.S03, S03_PATH);
    expect(r.state.penalties).toEqual([]);
    expect(r.state.status).toBe("completed");
  });

  it("kritik xato: yerlagich olinmay transformatorga kuchlanish berish", () => {
    const r = run(SCENARIOS.S03, [
      rb("m1"),
      { type: "finishWork" },
      { type: "poster", targetId: "QS-T1-110B", poster: "doNotSwitch", on: false },
      sw("QS-T1-110B", "closed"),
      sw("QS-T1-110T", "closed"),
      sw("Q-T1-110", "closed"),
    ]);
    expect(r.state.status).toBe("failed");
    expect(r.state.failure?.code).toBe("energizeEarthed");
  });

  it("kritik xato: brigada ishlayotganda yerlagichni olish", () => {
    const r = run(SCENARIOS.S03, [rb("m1"), sw("QSG-T1-10", "open")]);
    expect(r.state.failure?.code).toBe("removeEarthDuringWork");
  });
});

// ---------- S04 ----------
describe("S04 — operativ jurnal", () => {
  const PATH: ActionOrFn[] = [
    rb("m1"),
    sw("Q-F10-4", "open"),
    sw("QS-F10-4B", "open"),
    journalNow("F10-4 ni ta'mirga o'chirish"),
    report("m1"),
    rb("m2"),
    sw("QS-F10-4B", "closed"),
    sw("Q-F10-4", "closed"),
    journalNow("F10-4 ni ishga tushirish"),
    report("m2"),
    rb("m3"),
    sw("Q-F35-2", "open"),
    sw("QS-F35-2L", "open"),
    sw("QS-F35-2B", "open"),
    journalNow("F35-2 ni o'chirish"),
    report("m3"),
  ];

  it("to'g'ri yo'l: uchta buyruq va uchta to'g'ri jurnal yozuvi", () => {
    const r = run(SCENARIOS.S04, PATH);
    expect(r.state.penalties).toEqual([]);
    expect(r.state.status).toBe("completed");
    expect(r.state.journal.length).toBe(3);
  });

  it("2-buyruq soati 11:30 ga suriladi", () => {
    const r = run(SCENARIOS.S04, PATH.slice(0, 5));
    expect(r.state.time).toBeGreaterThanOrEqual(11.5 * 3600);
  });

  it("jurnal xatolari jarimalanadi (noto'g'ri nom, bajaruvchi yo'q)", () => {
    const r = run(SCENARIOS.S04, [
      ...PATH.slice(0, 3),
      { type: "journal", entry: { time: "09:02", from: "Dispetcher", orderText: "", doneText: "Q-F10-04 o'chirildi", executor: "" } },
    ]);
    const codes = r.state.penalties.map((p) => p.code);
    expect(codes).toEqual(expect.arrayContaining(["journalNames", "journalMissingOps", "journalExecutor"]));
  });

  it("kritik xato: aravachani yuklama ostida ajratish", () => {
    const r = run(SCENARIOS.S04, [rb("m1"), sw("QS-F10-4B", "open")]);
    expect(r.state.failure?.code).toBe("disconnectorUnderLoad");
  });
});

// ---------- S05 ----------
describe("S05 — RPN", () => {
  const tap = (): Action => ({ type: "tap", transformerId: "T-1", dir: 1 });
  it("to'g'ri yo'l: 4 pog'ona pauza bilan → kuchlanish oraliqda", () => {
    const r = run(SCENARIOS.S05, [rb("m1"), tap(), tick(10), tap(), tick(10), tap(), tick(10), tap(), tick(10), journalNow("RPN"), report("m1")]);
    expect(r.state.taps["T-1"]).toBe(-2);
    expect(r.state.penalties).toEqual([]);
    expect(r.state.status).toBe("completed");
  });

  it("pauzasiz ketma-ket buyruq — mexanizm band", () => {
    const r = run(SCENARIOS.S05, [rb("m1"), tap(), tap()]);
    expect(r.last.code).toBe("rpnBusy");
    expect(r.state.taps["T-1"]).toBe(1);
  });

  it("kuchlanish oraliqqa kirmay hisobot — qoidabuzarlik", () => {
    const r = run(SCENARIOS.S05, [rb("m1"), tap(), tick(10), journalNow("RPN"), report("m1")], "practice");
    expect(r.last.code).toBe("reportEarly");
  });

  it("kritik xato: kuchlanishni ko'tarish uchun yuklama ostida ajratkich bilan T-2 ga o'tish", () => {
    const r = run(SCENARIOS.S05, [rb("m1"), sw("QS-T1-10B", "open")]);
    expect(r.state.failure?.code).toBe("disconnectorUnderLoad");
  });
});
