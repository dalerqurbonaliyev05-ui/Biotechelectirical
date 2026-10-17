import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Moy sathi pasaydi: radiator flanetsidan oqish. Vaqtida o'chirilmasa gaz relesi o'chiradi.
export const S12: ScenarioDef = {
  id: "S12",
  level: 3,
  title: "Moy sathi tushib ketdi",
  objective: "Moy oqishi sababini topish va qaror",
  briefing:
    "T-1 «moy sathi past» signali. Transformatorni ko'zdan kechiring, sababni toping va qaror qabul qiling. Moy sathi gaz relesidan pastga tushsa, gaz himoyasi transformatorni o'chiradi.",
  kind: "switching",
  situation: { timeStart: "12:10", weather: "clear", season: "summer", ambientC: 32, loadFactor: 0.8 },
  orderRequired: true,
  timeline: [
    { id: "lvl", trigger: "start", event: { kind: "alarm", code: "oilLevelLow", params: { transformer: "T-1" } } },
    { id: "trip", trigger: { afterSec: 3600 }, event: { kind: "transformerFault", transformerId: "T-1", fault: "gas", trip: true, onlyIfEnergized: true } },
  ],
  messages: [
    order(
      "m1",
      "Yangiobod PS. T-1 moy sathi past signali. Ko'zdan kechiring; oqish bo'lsa yuklamani T-2 ga o'tkazib, T-1 ni o'chiring va xabar bering.",
      "Tushundim: T-1 ni ko'zdan kechiraman, oqish bo'lsa yuklamani SV orqali T-2 ga o'tkazib, T-1 ni o'chiraman.",
      [["Tushundim: gaz relesini o'chirib qo'yaman.", "Himoyani o'chirish taqiqlanadi."]],
      { report: { afterStep: "off110", text: "T-1 radiator flanetsidan moy oqmoqda — yuklama T-2 ga o'tkazildi, T-1 o'chirildi." } },
    ),
  ],
  measurements: [
    {
      id: "look",
      label: "T-1 ni ko'zdan kechirish (obxod)",
      targetId: "T-1",
      kind: "inspection",
      durationSec: 900,
      fixed: 0,
      variants: [
        {
          category: "leak",
          values: { "Kengaytirgich moy ko'rsatkichi": "minimal belgidan past", "Oqish joyi": "3-radiatorning pastki flanetsi, tomchilab", "Moy qabul qilgich": "moy dog'i bor" },
        },
      ],
    },
  ],
  decisions: [
    {
      id: "decide",
      prompt: "Ko'rik natijasi bo'yicha qaror:",
      after: "look",
      options: [
        { id: "top", text: "Moy quyib, ishni davom ettirish", why: "Oqish davom etadi; ishlab turgan transformatorga moy quyish xavfli." },
        { id: "off", text: "Yuklamani T-2 ga o'tkazib, T-1 ni o'chirish; oqishni bartaraf etib, moy quyish", correctWhen: { measurementId: "look", categories: ["leak"] } },
        { id: "gas", text: "Gaz relesini o'chirib qo'yish, keyin sekin-asta hal qilish", severity: "critical", failCode: "protectionDisabled", why: "Himoyani o'chirish — avariya xavfi." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "look", label: "T-1 ni ko'zdan kechirib, oqish joyini topish", match: { type: "measure", measurementId: "look" }, after: ["rb"], explain: "Moy ko'rsatkichi, radiatorlar, flanetslar, kranlar, moy qabul qilgich tekshiriladi.", hint: "T-1 kartasidagi «Ko'zdan kechirish»." },
    { id: "decide", label: "Qaror", match: { type: "choice", decisionId: "decide" }, after: ["look"], explain: "Oqish — transformator o'chiriladi." },
    switchStep("sv10", "Q-SV10", "closed", "Q-SV10 ni ulash", ["decide"], "Yuklamani zaxiraga o'tkazish."),
    switchStep("sv35", "Q-SV35", "closed", "Q-SV35 ni ulash", ["decide"], "Yuklamani zaxiraga o'tkazish."),
    switchStep("off10", "Q-T1-10", "open", "Q-T1-10 ni o'chirish", ["sv10"], "Avval past tomon."),
    switchStep("off35", "Q-T1-35", "open", "Q-T1-35 ni o'chirish", ["sv35"], "Avval past tomon."),
    switchStep("off110", "Q-T1-110", "open", "Q-T1-110 ni o'chirish", ["off10", "off35"], "Oxirida YK.", { deadlineSec: 3600 }),
    reportStep("report", "m1", ["off110"]),
    journalStep("journal", ["report"]),
  ],
  goals: [{ type: "loadsSupplied", loadIds: ["L-F35-1", "L-F35-2", "L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] }],
  journal: { required: true },
  analysis:
    "Moy sathi pasaysa — sabab ko'rik bilan topiladi (flanets, kran, payvand chok, radiator). Oqish bo'lsa transformator yuklamadan bo'shatilib o'chiriladi; aks holda sath gaz relesidan pastga tushib, gaz himoyasi transformatorni avariyaviy o'chiradi. Himoyalarni o'chirish taqiqlanadi.",
};
