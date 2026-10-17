import type { ScenarioDef } from "../../engine/scenario";
import { T2_OUT, journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Yuklama oshib ketdi: T-2 ta'mirda, jazirama, ventilyatorlar avtomatikasi ishdan chiqqan.
export const S06: ScenarioDef = {
  id: "S06",
  level: 2,
  title: "Yuklama oshib ketdi",
  objective: "Harorat grafigi, ventilyatorlar, qisqa muddatli ortiqcha yuklash chegarasi",
  briefing:
    "Yozgi jazirama, T-2 ta'mirda — butun yuklama SV orqali T-1 da. Tushdan keyin yuklama keskin oshadi, T-1 ventilyatorlari avtomatikasi ishdan chiqqan. Moy harorati trendini kuzating, sovutishni ta'minlang, dispetcherga xabar bering va ruxsat bilan 3-toifa iste'molchini cheklang. Soat tezlashtirilgan (1 s = 30 s); «⏩» tugmasi bilan vaqtni o'tkazishingiz mumkin.",
  kind: "switching",
  situation: { timeStart: "14:00", weather: "heat", season: "summer", ambientC: 38, loadFactor: 1.0 },
  timeScale: 30,
  orderRequired: true,
  loadShedding: true,
  allowedOutages: ["L-F10-4"],
  initial: { devices: { ...T2_OUT } },
  timeline: [
    { id: "fans", trigger: "start", event: { kind: "fansFail", transformerId: "T-1" } },
    { id: "load", trigger: { afterSec: 60 }, event: { kind: "setLoad", factor: 1.3 } },
  ],
  messages: [
    order(
      "m1",
      "Yangiobod PS. T-2 ta'mirda, yuklama o'smoqda. T-1 yuklamasi va moy haroratini nazorat qiling, sovutish ishlashini ta'minlang. Vaziyatni xabar qiling.",
      "Tushundim: T-1 yuklamasi va moy haroratini nazorat qilaman, sovutishni ta'minlayman, xabar beraman.",
      [["Tushundim: T-2 ni ishga tushiraman.", "T-2 ta'mirda — uni ishga tushirish mumkin emas."]],
      { report: { afterStep: "fans", text: "T-1 ortiqcha yuklangan, ventilyatorlar avtomatikasi ishlamadi — qo'lda yoqildi. Moy harorati o'smoqda. 3-toifa iste'molchini cheklashga ruxsat so'rayman." } },
    ),
    order(
      "m2",
      "Ruxsat beraman: F10-4 (3-toifa, bozor) ni o'chiring. T-1 moy haroratini kuzatib, 30 daqiqadan keyin xabar bering.",
      "Tushundim: Q-F10-4 ni o'chiraman, T-1 haroratini kuzatib, 30 daqiqadan keyin xabar beraman.",
      [["Tushundim: F10-1 (kasalxona) ni o'chiraman.", "Kasalxona — 1-toifa; u oxirgi navbatda uziladi."]],
      { trigger: { afterStep: "report1" }, report: { afterStep: "journal", text: "F10-4 o'chirildi, T-1 yuklamasi kamaydi, moy harorati me'yor chegarasida.", requireGoals: true } },
    ),
  ],
  decisions: [
    {
      id: "fansQ",
      prompt: "D sovutishli transformatorda ventilyatorlar haqida qaysi gap to'g'ri?",
      after: "rb1",
      options: [
        { id: "a", text: "Ventilyatorlar radiatorlarni puflab, moyni bilvosita sovutadi — ular o'chsa ruxsat etilgan yuklama kamayadi", correct: true },
        { id: "b", text: "Ventilyatorlar moyga havo puflaydi va uni aralashtiradi", why: "Ventilyatorlar moyga tegmaydi — ular radiatorlarni tashqaridan puflaydi." },
        { id: "c", text: "RPN pog'onasini o'zgartirib, transformator yuklamasini kamaytirish mumkin", why: "RPN kuchlanishni rostlaydi, quvvatni (yuklamani) emas." },
      ],
    },
  ],
  steps: [
    readbackStep("rb1", "m1"),
    {
      id: "fans",
      label: "T-1 ventilyatorlarini qo'lda yoqish",
      match: { type: "fans", transformerId: "T-1", on: true },
      after: ["rb1"],
      explain: "Avtomatika ishlamasa, ventilyatorlar qo'lda yoqiladi — busiz D transformatorning ruxsat etilgan quvvati keskin kamayadi.",
      hint: "T-1 kartasidagi «Ventilyatorlarni yoqish».",
    },
    { id: "fansQ", label: "Savol: ventilyatorlar qanday sovutadi?", match: { type: "choice", decisionId: "fansQ" }, after: ["rb1"], explain: "Sovutish turini tushunish — to'g'ri qaror asosi." },
    reportStep("report1", "m1", ["fans"], "Dispetcherga ortiqcha yuklanish haqida xabar berish va ruxsat so'rash"),
    readbackStep("rb2", "m2", "Ruxsatni qaytarib o'qish", ["report1"]),
    switchStep("shed", "Q-F10-4", "open", "Q-F10-4 ni o'chirish (3-toifa iste'molchi)", ["rb2"], "Yuklama cheklanganda avval 3-toifa, eng oxirida 1-toifa iste'molchilar uziladi."),
    {
      id: "watch",
      label: "Kamida 30 daqiqa harorat trendini kuzatish (⏩ +30 daq)",
      match: { type: "wait", minSec: 1800 },
      after: ["shed"],
      explain: "Moy harorati inersion — yuklama kamaygandan keyin ham bir muddat o'zgaradi; trend kuzatiladi.",
    },
    journalStep("journal", ["watch"]),
    reportStep("report2", "m2", ["journal"]),
  ],
  goals: [
    { type: "oilBelow", transformerId: "T-1", c: 95 },
    { type: "transformerLoadMax", transformerId: "T-1", k: 1.05 },
  ],
  journal: { required: true },
  analysis:
    "Ortiqcha yuklanishda: sovutish to'liq ishlashini ta'minlash (D tipida ventilyatorlar radiatorlarni puflaydi va moyni bilvosita sovutadi), moy harorati trendini kuzatish, avariyaviy ortiqcha yuklash jadvali va moy harorati chegaralariga rioya qilish, dispetcher ruxsati bilan iste'molchilarni toifa tartibida cheklash (3-toifa birinchi). RPN quvvatni oshirmaydi.",
};
