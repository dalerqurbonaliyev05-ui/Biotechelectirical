import { describe, expect, it } from "vitest";
import { bareScenario, run, sw } from "./testkit";
import { summarize } from "./scoring";
import type { ScenarioDef } from "./scenario";

// Kichik sinov stsenariysi: F10-4 fiderini o'chirish (Q, keyin aravacha)
const sc: ScenarioDef = bareScenario({
  orderRequired: true,
  allowedOutages: ["L-F10-4"],
  messages: [
    {
      id: "m1",
      trigger: "start",
      from: "Dispetcher",
      text: "F10-4 ni o'chiring",
      isOrder: true,
      readback: { prompt: "", options: [{ id: "ok", text: "", correct: true }, { id: "bad", text: "", correct: false }] },
      expectsReport: { afterStep: "s2", text: "" },
    },
  ],
  steps: [
    { id: "s0", label: "", match: { type: "readback", messageId: "m1" }, explain: "" },
    { id: "s1", label: "", match: { type: "switch", deviceId: "Q-F10-4", to: "open" }, after: ["s0"], explain: "" },
    { id: "s2", label: "", match: { type: "switch", deviceId: "QS-F10-4B", to: "open" }, after: ["s1"], explain: "" },
    { id: "s3", label: "", match: { type: "report", messageId: "m1" }, after: ["s2"], explain: "" },
  ],
});

describe("simulator", () => {
  it("to'g'ri yo'l — yakunlanadi, 100 ball", () => {
    const r = run(sc, [{ type: "readback", messageId: "m1", optionId: "ok" }, sw("Q-F10-4", "open"), sw("QS-F10-4B", "open"), { type: "report", messageId: "m1" }]);
    expect(r.state.status).toBe("completed");
    expect(summarize(r.state).score).toBe(100);
  });

  it("imtihon rejimi: kritik xato bajariladi va stsenariy to'xtaydi", () => {
    const r = run(sc, [{ type: "readback", messageId: "m1", optionId: "ok" }, sw("QS-F10-4B", "open")]);
    expect(r.last.code).toBe("disconnectorUnderLoad");
    expect(r.last.applied).toBe(true);
    expect(r.state.status).toBe("failed");
    expect(summarize(r.state).stars).toBe(0);
  });

  it("o'qitish rejimi: kritik xato to'siladi, stsenariy davom etadi", () => {
    const r = run(sc, [{ type: "readback", messageId: "m1", optionId: "ok" }, sw("QS-F10-4B", "open")], "training");
    expect(r.last.applied).toBe(false);
    expect(r.state.status).toBe("running");
    expect(r.state.devices["QS-F10-4B"]).toBe("closed");
    expect(r.state.penalties.length).toBe(1);
  });

  it("buyruqsiz kommutatsiya — qoidabuzarlik", () => {
    const r = run(sc, [sw("Q-F10-4", "open")]);
    expect(r.last.code).toBe("switchWithoutOrder");
  });

  it("noto'g'ri qaytarib o'qish — buyruq qabul qilinmaydi", () => {
    const r = run(sc, [{ type: "readback", messageId: "m1", optionId: "bad" }]);
    expect(r.state.acceptedOrders).toEqual([]);
    expect(r.last.code).toBe("readbackWrong");
  });

  it("ish bajarilmay hisobot — qoidabuzarlik", () => {
    const r = run(sc, [{ type: "readback", messageId: "m1", optionId: "ok" }, { type: "report", messageId: "m1" }]);
    expect(r.last.code).toBe("reportEarly");
  });

  it("ruxsat etilmagan iste'molchi uzilishi jarimalanadi", () => {
    const r = run(sc, [{ type: "readback", messageId: "m1", optionId: "ok" }, sw("Q-T1-10", "open")]);
    const codes = r.state.penalties.map((p) => p.code);
    expect(codes).toContain("consumerLost");
    expect(codes).toContain("extraneous");
  });

  it("vaqt va harorat: tick moy haroratini o'zgartiradi, soat oldinga yuradi", () => {
    const r = run(sc, [{ type: "tick", dtSec: 3600 }]);
    expect(r.state.time).toBe(10 * 3600);
  });

  it("yakunlash: bajarilmagan qadamlar jarimalanadi", () => {
    const r = run(sc, [{ type: "finish" }]);
    expect(r.state.status).toBe("completed");
    expect(r.state.penalties.filter((p) => p.code === "missingStep").length).toBe(4);
  });
});
