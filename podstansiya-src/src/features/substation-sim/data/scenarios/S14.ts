import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// RPN nosozligi: T-1 RPN +4 pog'onada to'xtab qoldi. T-2 pog'onasini tenglab, yuklamani o'tkazish.
export const S14: ScenarioDef = {
  id: "S14",
  level: 3,
  title: "RPN nosozligi",
  objective: "Pog'onada to'xtab qolgan RPN bilan ishlash",
  briefing:
    "T-1 RPN mexanizmi +4 pog'onada to'xtab qoldi («RPN nosozligi» signali), 10 kV I seksiyada kuchlanish past. RPN ni boshqarmang. 10 kV I seksiya yuklamasini T-2 ga iste'molchilarni uzmasdan va aylanma toksiz o'tkazing.",
  kind: "switching",
  situation: { timeStart: "19:00", weather: "clear", season: "winter", ambientC: -2, loadFactor: 0.9, sourceKv: 112 },
  orderRequired: true,
  initial: { taps: { "T-1": 4, "T-2": 0 } },
  timeline: [{ id: "stuck", trigger: "start", event: { kind: "rpnStuck", transformerId: "T-1" } }],
  messages: [
    order(
      "m1",
      "Yangiobod PS. T-1 RPN nosozligi. RPN ni boshqarishni to'xtating, 10 kV I seksiya yuklamasini T-2 ga o'tkazing, T-1 ni 10 kV tomondan o'chiring.",
      "Tushundim: T-1 RPN ni boshqarmayman; T-2 pog'onasini tenglab, Q-SV10 ni ulab, Q-T1-10 ni o'chiraman.",
      [["Tushundim: RPN mexanizmini qo'lda aylantirib, pog'onani tiklayman.", "Nosoz RPN ni yuklama ostida qo'lda aylantirish taqiqlanadi."]],
      { report: { afterStep: "off10", text: "10 kV I seksiya yuklamasi T-2 ga o'tkazildi, Q-T1-10 o'chirildi, T-1 RPN ta'mirga." } },
    ),
  ],
  decisions: [
    {
      id: "rpnQ",
      prompt: "Nosoz RPN bilan nima qilinadi?",
      after: "rb",
      options: [
        { id: "stop", text: "RPN ni boshqarmaslik, mexanizmni qo'lda aylantirmaslik, ta'mirga chaqirish", correct: true },
        { id: "hand", text: "Mexanizmni yuritma shkafidan qo'lda aylantirib, pog'onani o'zgartirish", why: "Kontaktor oraliq holatda qolgan bo'lishi mumkin — yuklama ostida qo'lda aylantirish yoy va avariyaga olib keladi." },
      ],
    },
    {
      id: "howQ",
      prompt: "Yuklamani T-2 ga qanday o'tkazamiz?",
      after: "rb",
      options: [
        { id: "equal", text: "T-2 pog'onasini T-1 niki (+4) bilan tenglab, Q-SV10 ni ulash, so'ng Q-T1-10 ni o'chirish", correct: true },
        { id: "break", text: "Avval Q-T1-10 ni o'chirib, keyin Q-SV10 ni ulash", why: "Qisqa vaqtga bo'lsa ham kasalxona va boshqa iste'molchilar uziladi." },
        { id: "direct", text: "Pog'onalar farqi bilan darhol Q-SV10 ni ulash", why: "Pog'onalar farqi katta — transformatorlar orasida aylanma tok oqadi." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "rpnQ", label: "Qaror: nosoz RPN", match: { type: "choice", decisionId: "rpnQ" }, after: ["rb"], explain: "Nosoz RPN boshqarilmaydi." },
    { id: "howQ", label: "Qaror: yuklamani o'tkazish usuli", match: { type: "choice", decisionId: "howQ" }, after: ["rb"], explain: "Parallel ulash sharti — koeffitsientlar teng." },
    {
      id: "tapT2",
      label: "T-2 pog'onasini +4 ga keltirish (bittadan, pauza bilan)",
      match: { type: "tap", transformerId: "T-2", dir: -1 },
      after: ["howQ"],
      explain: "Pog'onalar tenglashgach parallel ulash mumkin.",
      hint: "T-2 kartasidagi «Kuchlanishni pasaytirish ▼» — 4 marta.",
    },
    switchStep("sv10", "Q-SV10", "closed", "Q-SV10 ni ulash (qisqa muddatli parallel ishlash)", ["tapT2"], "Pog'onalar teng — aylanma tok yo'q."),
    switchStep("off10", "Q-T1-10", "open", "Q-T1-10 ni o'chirish", ["sv10"], "Yuklama T-2 ga o'tdi."),
    reportStep("report", "m1", ["off10"]),
    journalStep("journal", ["report"]),
  ],
  goals: [
    { type: "tapsEqual", a: "T-1", b: "T-2" },
    { type: "loadsSupplied", loadIds: ["L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] },
  ],
  journal: { required: true },
  analysis:
    "RPN nosoz bo'lsa (pog'onada yoki oraliq holatda to'xtab qolsa) uni boshqarish va qo'lda aylantirish taqiqlanadi — RPN himoyasi transformatorni o'chirishi mumkin. Yuklama boshqa transformatorga iste'molchilarni uzmasdan o'tkaziladi: avval pog'onalar tenglanadi (aylanma tok bo'lmasligi uchun), so'ng SV ulanadi va nosoz transformator o'chiriladi.",
};
