import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Quvvat yetishmayapti: zaxiradagi T-2 ni parallel ishga ulash (pog'onalarni tenglash, fazirovka).
export const S07: ScenarioDef = {
  id: "S07",
  level: 2,
  title: "Quvvat yetishmayapti",
  objective: "Zaxira transformatorni parallel ulash, fazirovka; RPN yordam bermasligi",
  briefing:
    "Kechki cho'qqi: barcha yuklama SV orqali T-1 da va u ortiqcha yuklangan. T-2 zaxirada (o'chirgichlari ochiq, ajratkichlari yopiq), uning RPN pog'onasi T-1 nikidan farq qiladi. T-2 ni salt yurishda kuchlanishga qo'ying, pog'onalarni tenglang, fazirovka qiling va T-1 bilan parallel ishlashga ulang.",
  kind: "switching",
  situation: { timeStart: "17:30", weather: "clear", season: "autumn", ambientC: 20, loadFactor: 1.25 },
  timeScale: 10,
  orderRequired: true,
  phasingRequired: ["T-2"],
  initial: {
    devices: { "Q-T2-110": "open", "Q-T2-35": "open", "Q-T2-10": "open", "Q-SV10": "closed", "Q-SV35": "closed" },
    taps: { "T-1": 0, "T-2": 3 },
  },
  messages: [
    order(
      "m1",
      "Yangiobod PS. T-1 ortiqcha yuklangan. Zaxiradagi T-2 ni ishga tushirib, T-1 bilan 35 va 10 kV da parallel ishlashga ulang. Bajarilgach xabar bering.",
      "Tushundim: T-2 ni 110 kV dan salt yurishga qo'yaman, pog'onalarni tenglab, fazirovkadan keyin 35 va 10 kV da T-1 bilan parallel ulayman.",
      [["Tushundim: T-1 RPN pog'onasini o'zgartirib quvvatni oshiraman.", "RPN quvvatni oshirmaydi."]],
      { report: { afterStep: "on10", text: "T-2 ishga tushirildi va T-1 bilan parallel ishlayapti, T-1 yuklamasi me'yorda.", requireGoals: true } },
    ),
  ],
  decisions: [
    {
      id: "rpnQ",
      prompt: "T-1 ortiqcha yuklangan. RPN pog'onasini o'zgartirish yordam beradimi?",
      after: "rb",
      options: [
        { id: "no", text: "Yo'q — RPN o'ramlar nisbatini o'zgartirib faqat kuchlanishni rostlaydi, transformator quvvatini oshirmaydi", correct: true },
        { id: "yes", text: "Ha — pog'onani oshirsak transformator quvvati ham oshadi", why: "Quvvat sovutish va o'ram kesimi bilan cheklanadi; RPN faqat kuchlanishni o'zgartiradi." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "rpnQ", label: "Savol: RPN quvvatni oshiradimi?", match: { type: "choice", decisionId: "rpnQ" }, after: ["rb"], explain: "Quvvat yetishmasa — yechim boshqa transformator yoki yuklamani kamaytirish." },
    switchStep("on110", "Q-T2-110", "closed", "Q-T2-110 ni ulash — T-2 ni salt yurishda kuchlanishga qo'yish", ["rb"], "Avval YK tomondan salt yurish: transformator kuchlanish ostida tekshiriladi, yuklama hali yo'q."),
    {
      id: "tap",
      label: "T-2 RPN pog'onasini T-1 niki bilan tenglash (bittadan, pauza bilan)",
      match: { type: "tap", transformerId: "T-2" },
      after: ["on110"],
      explain: "Parallel ishlash sharti: transformatsiya koeffitsientlari yaqin bo'lishi kerak — aks holda aylanma tok oqadi.",
      hint: "T-2 pog'onasi +3, T-1 niki 0. T-2 kartasida «Kuchlanishni oshirish ▲» (pog'ona kamayadi) — 3 marta.",
    },
    {
      id: "phasing",
      label: "Fazirovka va parallel ishlash shartlarini tekshirish (T-1 va T-2)",
      match: { type: "phasing" },
      after: ["tap"],
      explain: "Ulanish guruhi, koeffitsient va fazalar mosligi tekshiriladi. Mos kelmasa — ulash taqiqlanadi.",
      hint: "T-2 kartasidagi «Fazirovka (T-1 bilan)» tugmasi.",
    },
    switchStep("on35", "Q-T2-35", "closed", "Q-T2-35 ni ulash — 35 kV da parallel ishlash", ["phasing"], "Shartlar bajarilgach, past tomon o'chirgichlari ulanadi."),
    switchStep("on10", "Q-T2-10", "closed", "Q-T2-10 ni ulash — 10 kV da parallel ishlash", ["phasing"], "Yuklama ikkala transformator orasida uk ga teskari proporsional taqsimlanadi."),
    journalStep("journal", ["on35", "on10"]),
    reportStep("report", "m1", ["journal"]),
  ],
  goals: [
    { type: "tapsEqual", a: "T-1", b: "T-2" },
    { type: "transformerLoadMax", transformerId: "T-1", k: 1.0 },
  ],
  journal: { required: true },
  analysis:
    "Parallel ulash shartlari: bir xil ulanish guruhi, transformatsiya koeffitsientlari farqi kichik (pog'onalar tenglanadi), uk% yaqin, quvvatlar nisbati katta emas. Fazirovka — alohida majburiy qadam. Pog'onalar farqi bilan ulansa, transformatorlar orasida tenglashtiruvchi (aylanma) tok oqadi. RPN quvvat muammosini hal qilmaydi.",
};
