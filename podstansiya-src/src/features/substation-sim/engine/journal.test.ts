import { describe, expect, it } from "vitest";
import { checkJournalEntry, extractDeviceNames, formatClock, normalizeText, parseTime } from "./journal";

const labels = ["Q-T1-10", "Q-T1-35", "Q-T1-110", "QS-T1-10T", "QSG-T1-10"];
const ops = [
  { label: "Q-T1-10", t: 9 * 3600 + 5 * 60 },
  { label: "Q-T1-35", t: 9 * 3600 + 6 * 60 },
];

describe("jurnal", () => {
  it("vaqt formatlari", () => {
    expect(parseTime("09:07")).toBe(9 * 3600 + 7 * 60);
    expect(parseTime("25:00")).toBeNull();
    expect(formatClock(9 * 3600 + 7 * 60)).toBe("09:07");
  });

  it("kirill harflari va tire turlari normallashtiriladi", () => {
    expect(normalizeText("Q – Т1 — 10")).toBe("Q-T1-10");
    expect(extractDeviceNames("Отключен Q-T1-10, затем Q-T1-35")).toEqual(["Q-T1-10", "Q-T1-35"]);
  });

  it("to'g'ri yozuv — muammosiz", () => {
    const issues = checkJournalEntry(
      { time: "09:06", from: "Dispetcher", orderText: "T-1 ni ta'mirga chiqarish", doneText: "O'chirildi Q-T1-10, Q-T1-35", executor: "Karimov" },
      ops,
      labels,
      9 * 3600 + 8 * 60,
    );
    expect(issues).toEqual([]);
  });

  it("xatolar: vaqt, noto'g'ri nom, tushib qolgan amal, tartib, bajaruvchi", () => {
    const issues = checkJournalEntry(
      { time: "11:00", from: "D", orderText: "", doneText: "O'chirildi Q-T1-35, Q-T1-100", executor: "" },
      ops,
      labels,
      0,
    ).map((i) => i.code);
    expect(issues).toEqual(expect.arrayContaining(["journalTime", "journalNames", "journalMissingOps", "journalExecutor"]));
    const order = checkJournalEntry({ time: "09:06", from: "D", orderText: "", doneText: "Q-T1-35, Q-T1-10", executor: "X" }, ops, labels, 0).map((i) => i.code);
    expect(order).toContain("journalOrder");
  });
});
