import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// 10 kV tarmoqda bir fazali yerga tutashuv: faza voltmetr bo'yicha, fider navbat bilan uzib topiladi.
export const S11: ScenarioDef = {
  id: "S11",
  level: 3,
  title: "Yomg'irda bir fazali yerga tutashuv",
  objective: "Voltmetrlar bo'yicha aniqlash, fiderlarni navbat bilan uzib qidirish",
  briefing:
    "Kuchli yomg'ir. 10 kV II seksiyada «yerga tutashuv» signali. Izolyatsiyalangan neytralli tarmoq cheklangan vaqt ishlashi mumkin — taymer ketmoqda. Kuchlanish transformatori voltmetrlari bo'yicha shikastlangan fazani aniqlang, fiderlarni navbat bilan qisqa muddatga uzib, shikastlangan fiderni toping. 1-toifa iste'molchini keraksiz uzmang.",
  kind: "switching",
  situation: { timeStart: "05:20", weather: "rain", season: "autumn", ambientC: 9, loadFactor: 0.6 },
  orderRequired: true,
  allowedOutages: ["L-F10-4"],
  freeSwitching: ["Q-F10-3", "Q-F10-4"],
  timeline: [{ id: "ef", trigger: "start", event: { kind: "earthFault", nodeId: "F10-4", phase: "B", severity: 0.97 } }],
  messages: [
    order(
      "m1",
      "Yangiobod PS. 10 kV II seksiyada yerga tutashuv. Shikastlangan fazani aniqlang, fiderlarni navbat bilan uzib, shikastlangan fiderni toping va uni o'chirilgan holda qoldiring. Natijani xabar qiling.",
      "Tushundim: 10 kV II seksiyada fazani voltmetr bo'yicha aniqlab, fiderlarni navbat bilan uzib qidiraman, topilganini o'chirilgan holda qoldiraman.",
      [["Tushundim: 10 kV II seksiyani butunlay o'chiraman.", "Seksiyani butunlay o'chirish barcha iste'molchilarni (shu jumladan 1-toifa nasos stansiyasini) uzadi."]],
      { report: { afterStep: "find", text: "Yerga tutashuv F10-4 da topildi, F10-4 o'chirilgan, signal yo'qoldi.", requireGoals: true } },
    ),
  ],
  measurements: [
    {
      id: "volt",
      label: "TN-10-2 voltmetrlari (fazalar kuchlanishi)",
      targetId: "TN-10-2",
      kind: "voltmeter",
      durationSec: 60,
      fixed: 0,
      variants: [{ category: "phaseB", values: { "U(A)": "10,0 kV", "U(B)": "0,2 kV", "U(C)": "10,1 kV", "3U0": "≈100 V (signal)" } }],
    },
  ],
  decisions: [
    {
      id: "phase",
      prompt: "Qaysi faza yerga tutashgan?",
      after: "volt",
      options: [
        { id: "A", text: "A faza", correctWhen: { measurementId: "volt", categories: ["phaseA"] }, why: "Shikastlangan fazada kuchlanish nolga yaqin, qolganlarida chiziqli kuchlanishgacha ko'tariladi." },
        { id: "B", text: "B faza", correctWhen: { measurementId: "volt", categories: ["phaseB"] }, why: "Voltmetrlarga qayta qarang." },
        { id: "C", text: "C faza", correctWhen: { measurementId: "volt", categories: ["phaseC"] }, why: "Voltmetrlarga qayta qarang." },
      ],
    },
    {
      id: "next",
      prompt: "Shikastlangan fider topildi. Keyingi harakat?",
      after: "find",
      options: [
        { id: "patrol", text: "Fiderni o'chirilgan holda qoldirib, liniyani ko'rikka (obxod) chiqarish", correct: true },
        { id: "retry", text: "Fiderni qayta ulab, tutashuv o'tib ketganini tekshirish", why: "Yomg'irda uzilgan sim yerda yotgan bo'lishi mumkin — odamlarga xavf; ko'riksiz ulanmaydi." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "volt", label: "Voltmetrlar bo'yicha holatni o'qish (TN-10-2)", match: { type: "measure", measurementId: "volt" }, after: ["rb"], explain: "Signal bilan birga fazalar kuchlanishi tekshiriladi.", hint: "Sxemada TN-10-2 ni tanlang." },
    { id: "phase", label: "Shikastlangan fazani aniqlash", match: { type: "choice", decisionId: "phase" }, after: ["volt"], explain: "Shikastlangan faza ~0, sog' fazalar — chiziqli kuchlanish." },
    switchStep("find", "Q-F10-4", "open", "Fiderlarni navbat bilan uzib, shikastlanganini topish (F10-4)", ["phase"], "Fider uzilganda signal yo'qolsa — tutashuv shu fiderda. Qidiruvni 3-toifali fiderdan boshlash maqsadga muvofiq.", {
      hint: "Kam muhim fiderdan boshlang; signal yo'qolganini kuzating.",
    }),
    { id: "next", label: "Keyingi harakat bo'yicha qaror", match: { type: "choice", decisionId: "next" }, after: ["find"], explain: "Ko'riksiz qayta ulash taqiqlanadi." },
    reportStep("report", "m1", ["find"]),
    journalStep("journal", ["report", "next"]),
  ],
  goals: [
    { type: "noActiveAlarm", code: "earthFault" },
    { type: "loadsSupplied", loadIds: ["L-F10-1", "L-F10-2", "L-F10-3"] },
  ],
  journal: { required: true },
  analysis:
    "Izolyatsiyalangan neytralli 6–35 kV tarmoqda bir fazali yerga tutashuv darhol o'chirmaydi: shikastlangan faza kuchlanishi nolga yaqin, qolgan ikkitasiniki chiziqli kuchlanishgacha ko'tariladi. Tarmoq cheklangan vaqt ishlaydi (muddat — TEKSHIRUV ro'yxatida). Shikastlangan fider navbat bilan uzib topiladi va o'chirilgan holda qoldiriladi; odamlarga xavf bo'lsa — darhol uziladi.",
};
