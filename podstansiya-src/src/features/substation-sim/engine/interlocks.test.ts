import { describe, expect, it } from "vitest";
import { TOPOLOGY } from "../data/equipment";
import { evaluateSwitch } from "./interlocks";
import { createInitialState } from "./state";
import type { SimState } from "./types";

const ctx = { orderRequired: false };
function st(over: Partial<SimState["devices"]> = {}, extra: Partial<SimState> = {}): SimState {
  const s = createInitialState(TOPOLOGY);
  s.devices = { ...s.devices, ...over } as SimState["devices"];
  return { ...s, ...extra };
}

describe("interlocks — ajratkich", () => {
  it("o'chirgich ulangan holda ajratkichni ochish — kritik (yuklama ostida)", () => {
    const r = evaluateSwitch(TOPOLOGY, st(), "QS-F10-1B", "open", ctx);
    expect(r.severity).toBe("critical");
    expect(r.code).toBe("disconnectorUnderLoad");
  });

  it("o'chirgich ochiq bo'lsa ajratkichni ochish mumkin", () => {
    const r = evaluateSwitch(TOPOLOGY, st({ "Q-F10-1": "open" }), "QS-F10-1B", "open", ctx);
    expect(r.severity).toBe("ok");
  });

  it("salt yurishdagi transformatorni ajratkich bilan uzish — magnitlanish toki (sozlanadigan, kritik)", () => {
    const s = st({ "Q-T1-10": "open", "Q-T1-35": "open" });
    const r = evaluateSwitch(TOPOLOGY, s, "QS-T1-110B", "open", ctx);
    expect(r.code).toBe("disconnectorMagnetizing");
    expect(r.severity).toBe("critical");
  });

  it("ochiq o'chirgich orqali yuklamani ajratkich bilan ulash — kritik", () => {
    const s = st({ "Q-F10-1": "closed", "QS-F10-1B": "open" });
    const r = evaluateSwitch(TOPOLOGY, s, "QS-F10-1B", "closed", ctx);
    expect(r.code).toBe("disconnectorUnderLoad");
  });

  it("bo'sh (yuklamasiz) shinani ajratkich bilan kuchlanishga ulash ruxsat (zaryad toki)", () => {
    const s = st({ "QS-SV10-1": "open" });
    const r = evaluateSwitch(TOPOLOGY, s, "QS-SV10-1", "closed", ctx);
    expect(r.severity).toBe("ok");
  });
});

describe("interlocks — yerlagich", () => {
  it("kuchlanish ostidagi uchastkaga yerlagich — kritik", () => {
    const r = evaluateSwitch(TOPOLOGY, st(), "QSG-F10-1", "closed", ctx);
    expect(r.code).toBe("earthOnLive");
    expect(r.severity).toBe("critical");
  });

  it("kuchlanish yo'qligi tekshirilmagan — kritik", () => {
    const s = st({ "Q-F10-1": "open", "QS-F10-1B": "open" });
    const r = evaluateSwitch(TOPOLOGY, s, "QSG-F10-1", "closed", ctx);
    expect(r.code).toBe("earthWithoutVerify");
  });

  it("kuchlanish yo'qligi tekshirilgan — ruxsat", () => {
    const s = st({ "Q-F10-1": "open", "QS-F10-1B": "open" }, { verifiedDead: { "F10-1": 0 } });
    const r = evaluateSwitch(TOPOLOGY, s, "QSG-F10-1", "closed", ctx);
    expect(r.severity).toBe("ok");
  });

  it("yerlagich ulangan uchastkaga kuchlanish berish — kritik", () => {
    const s = st({ "Q-F10-1": "open", "QSG-F10-1": "closed" });
    const r = evaluateSwitch(TOPOLOGY, s, "Q-F10-1", "closed", ctx);
    expect(r.code).toBe("energizeEarthed");
    expect(r.severity).toBe("critical");
  });

  it("yerlangan kuchlanishsiz uchastkani ulash — qoidabuzarlik", () => {
    const s = st({ "Q-F10-1": "open", "QS-F10-1B": "open", "QSG-F10-1": "closed" });
    const r = evaluateSwitch(TOPOLOGY, s, "Q-F10-1", "closed", ctx);
    expect(r.code).toBe("closeOntoEarthedDead");
    expect(r.severity).toBe("violation");
  });

  it("brigada ishlayotganda yerlagichni olish — kritik", () => {
    const s = st({ "Q-F10-1": "open", "QS-F10-1B": "open", "QSG-F10-1": "closed" }, { admitted: true });
    const r = evaluateSwitch(TOPOLOGY, s, "QSG-F10-1", "open", ctx);
    expect(r.code).toBe("removeEarthDuringWork");
  });
});

describe("interlocks — tashkiliy", () => {
  it("dispetcher buyrug'isiz kommutatsiya — qoidabuzarlik", () => {
    const r = evaluateSwitch(TOPOLOGY, st(), "Q-F10-4", "open", { orderRequired: true });
    expect(r.code).toBe("switchWithoutOrder");
  });

  it("'Ulamang' plakati osilgan uskunani ulash — qoidabuzarlik", () => {
    const s = st({ "Q-F10-4": "open" }, { posters: { "Q-F10-4": ["doNotSwitch"] } });
    const r = evaluateSwitch(TOPOLOGY, s, "Q-F10-4", "closed", ctx);
    expect(r.code).toBe("switchPostered");
  });

  it("allaqachon shu holatda", () => {
    expect(evaluateSwitch(TOPOLOGY, st(), "Q-F10-4", "closed", ctx).code).toBe("alreadyInPosition");
  });
});
