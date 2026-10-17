import type { ScenarioDef } from "../../engine/scenario";
import { T2_OUT, journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Kaskad: bo'ron + yuklama o'sishi + zaxira transformator ta'mirda → iste'molchilarni toifa tartibida cheklash.
export const S17: ScenarioDef = {
  id: "S17",
  level: 4,
  title: "Kaskad nosozlik",
  objective: "Ustuvorlik va iste'molchilarni toifa bo'yicha uzish",
  briefing:
    "Kuchli bo'ron, yuklama o'smoqda, T-2 ta'mirda — hamma yuklama T-1 da. W2 liniyasida qisqa o'chishlar bo'lishi mumkin. Dispetcher buyrug'i bilan T-1 yuklamasini cheklang: avval 3-toifa, 1-toifa iste'molchilarni (kasalxona, suv nasos stansiyasi) uzmang. Soat tezlashtirilgan (1 s = 20 s).",
  kind: "switching",
  situation: { timeStart: "18:40", weather: "storm", season: "summer", ambientC: 30, loadFactor: 1.2 },
  timeScale: 20,
  orderRequired: true,
  loadShedding: true,
  allowedOutages: ["L-F10-4"],
  initial: { devices: { ...T2_OUT } },
  timeline: [
    { id: "grow", trigger: { afterSec: 300 }, event: { kind: "setLoad", factor: 1.4 } },
    { id: "w2", trigger: { afterSec: 600 }, event: { kind: "lineFault", breakerId: "Q-W2", nodeId: "W2", sourceId: "SRC-W2", apv: "success" } },
  ],
  messages: [
    order(
      "m1",
      "Yangiobod PS. Bo'ron, yuklama o'smoqda, T-2 ta'mirda. T-1 yuklamasini 1,1 dan oshirmang: iste'molchilarni toifa tartibida cheklang, 1-toifani uzmang. Bajarilgach xabar bering.",
      "Tushundim: T-1 yuklamasini 1,1 dan oshirmayman, avval 3-toifa iste'molchilarni cheklayman, 1-toifani uzmayman.",
      [["Tushundim: avval kasalxona fiderini o'chiraman.", "1-toifa (kasalxona) eng oxirgi navbatda uziladi."]],
      { report: { afterStep: "watch", text: "F10-4 (3-toifa) o'chirildi, T-1 yuklamasi 1,1 dan past, 1-toifa iste'molchilar ta'minlanmoqda.", requireGoals: true } },
    ),
  ],
  steps: [
    readbackStep("rb", "m1"),
    switchStep("shed", "Q-F10-4", "open", "Q-F10-4 ni o'chirish (3-toifa)", ["rb"], "Avval eng kam muhim (3-toifa) iste'molchi."),
    { id: "watch", label: "Yuklama va haroratni 20 daqiqa kuzatish (⏩)", match: { type: "wait", minSec: 1200 }, after: ["shed"], explain: "Yuklama o'sishda davom etishi mumkin — kuzatiladi." },
    reportStep("report", "m1", ["watch"]),
    journalStep("journal", ["report"]),
  ],
  goals: [
    { type: "transformerLoadMax", transformerId: "T-1", k: 1.1 },
    { type: "loadsSupplied", loadIds: ["L-F10-1", "L-F10-3"] },
  ],
  journal: { required: true },
  analysis:
    "Bir vaqtda bir nechta muammo bo'lsa — ustuvorlik: odamlar xavfsizligi, 1-toifa iste'molchilar ta'minoti, uskunani saqlash. Yuklama cheklanganda iste'molchilar toifa tartibida uziladi: 3-toifa birinchi, 2-toifa keyin, 1-toifa eng oxirida. Har bir uzilish iqtisodiy zarar va uzilish davomiyligiga ta'sir qiladi.",
};
