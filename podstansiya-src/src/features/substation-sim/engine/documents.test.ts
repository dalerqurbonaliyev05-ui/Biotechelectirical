import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../data/scenarios";
import { ancestors, blankCards, checkBlank, nextBlankStep } from "./blank";
import { checkPermit, withinPermitTime, workplaceGaps } from "./permit";
import { absorption, checkProtocol, expectedConclusion, windingFit } from "./protocol";
import { createInitialState } from "./state";
import { TOPOLOGY } from "../data/equipment";
import type { PermitForm } from "./types";

const S02 = SCENARIOS.S02;
const S03 = SCENARIOS.S03;
const spec = S02.permit!;

const good: PermitForm = {
  number: "7",
  workName: "T-1 ta'mir",
  place: "T-1",
  startTime: "09:00",
  endTime: "17:00",
  issuer: { name: "A", group: 5 },
  admitter: { name: "B", group: 4 },
  leader: { name: "C", group: 5 },
  producer: { name: "D", group: 4 },
  members: [{ name: "E", group: 3 }],
  switchedOff: [...spec.required.switchedOff],
  earthing: [...spec.required.earthing],
  posters: ["QS-T1-110B", "QS-T1-35B", "QS-T1-10B"],
  liveParts: [...spec.required.liveParts],
};

describe("naryad-ruxsatnoma", () => {
  it("to'g'ri naryad — muammosiz", () => {
    expect(checkPermit(good, spec)).toEqual([]);
  });
  it("bo'sh maydonlar, past guruh, kichik brigada, noto'g'ri vaqt", () => {
    const codes = checkPermit(
      { ...good, number: "", producer: { name: "D", group: 3 }, members: [], startTime: "17:00", endTime: "09:00" },
      spec,
    ).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["permitIncomplete", "permitGroupLow", "permitBrigadeSmall", "permitTimeInvalid"]));
  });
  it("o'chiriladigan apparatlar, yerlagichlar, plakatlar va kuchlanish ostidagi qismlar", () => {
    const codes = checkPermit(
      { ...good, switchedOff: ["Q-T1-10", "Q-SV10"], earthing: ["QSG-T2-10"], posters: [], liveParts: ["T1:H"] },
      spec,
    ).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["permitSwitchingWrong", "permitEarthingWrong", "permitPostersMissing", "permitLivePartsWrong"]));
  });
  it("ish joyi tayyorligi va muddat", () => {
    const s = createInitialState(TOPOLOGY, S02);
    expect(workplaceGaps(s, good, spec).length).toBeGreaterThan(0);
    expect(withinPermitTime(good, 10 * 3600)).toBe(true);
    expect(withinPermitTime(good, 18 * 3600)).toBe(false);
  });
});

describe("kommutatsiya blankasi", () => {
  const b = S02.blank!;
  it("qadamlar tartibidagi blanka to'g'ri", () => {
    expect(checkBlank(b.stepIds, b, S02.steps)).toEqual([]);
  });
  it("ortiqcha, yetishmagan va tartib xatolari", () => {
    const order = [...b.stepIds];
    const iQ110 = order.indexOf("off-Q-110");
    const iDisc = order.indexOf("open-QS-T1-110T");
    [order[iQ110], order[iDisc]] = [order[iDisc], order[iQ110]];
    const codes = checkBlank([...order.slice(1), "x-sv110"], b, S02.steps).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["blankExtra", "blankMissing", "blankOrder"]));
  });
  it("tranzitiv oldingi qadamlar", () => {
    expect(ancestors(S02.steps).get("earth-110")?.has("off-Q-110")).toBe(true);
  });
  it("keyingi blanka qadami va kartalar aralashmasi", () => {
    expect(nextBlankStep(b.stepIds, [b.stepIds[0]], b)).toBe(b.stepIds[1]);
    const cards = blankCards(b, S02.steps, 2);
    expect(cards.length).toBe(b.stepIds.length + b.distractors.length);
    expect(blankCards(b, S02.steps, 2)).toEqual(cards);
  });
});

describe("izolyatsiya protokoli", () => {
  const p = S03.protocol!;
  it("absorbsiya koeffitsienti va yaroqlilik", () => {
    expect(absorption(1000, 1500)).toBeCloseTo(1.5, 9);
    expect(windingFit({ r15: 1000, r60: 1100, factoryR60: 1200 })).toBe(false);
    expect(windingFit({ r15: 1000, r60: 1500, factoryR60: 4000 })).toBe(false);
    expect(expectedConclusion(p)).toBe("fit");
  });
  it("to'g'ri va noto'g'ri protokol", () => {
    const rows = p.readings.map((r) => ({ winding: r.winding, r15: r.r15, r60: r.r60 }));
    expect(checkProtocol({ kind: "insulation", tempC: p.tempC, rows, conclusion: "fit" }, p)).toEqual([]);
    const bad = checkProtocol({ kind: "insulation", tempC: 40, rows: [{ ...rows[0], r60: 100 }], conclusion: "unfit" }, p).map((i) => i.code);
    expect(bad).toEqual(expect.arrayContaining(["protocolIncomplete", "protocolValues", "protocolConclusion"]));
  });
});
