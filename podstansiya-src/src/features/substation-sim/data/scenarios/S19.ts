import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, notice, reportStep, switchStep } from "./helpers";

// ABR ishlamadi: T-1 10 kV kirishi MTZ bilan o'chdi, ABR rad etdi — zaxirani qo'lda ulash.
export const S19: ScenarioDef = {
  id: "S19",
  level: 4,
  title: "ABR ishlamadi",
  objective: "Zaxirani qo'lda ulash",
  briefing:
    "10 kV I seksiya kirish o'chirgichi Q-T1-10 himoya bilan o'chdi, ABR rad etdi — seksiya (kasalxona bilan) kuchlanishsiz. Mahalliy yo'riqnoma bo'yicha zaxirani qo'lda tez ulang, so'ng dispetcherga xabar bering. Himoya sababi aniqlanmaguncha kirish o'chirgichini qayta ulamang.",
  kind: "switching",
  situation: { timeStart: "11:05", weather: "clear", season: "autumn", ambientC: 18, loadFactor: 0.75 },
  orderRequired: false,
  timeline: [
    { id: "abr", trigger: "start", event: { kind: "abrFail" } },
    { id: "trip", trigger: "start", event: { kind: "trip", deviceIds: ["Q-T1-10"], code: "mtzTrip" } },
  ],
  messages: [
    notice("m1", "Yangiobod PS, 10 kV I seksiya kuchlanishsiz ko'rinmoqda. Vaziyatni xabar qiling.", {
      trigger: { afterEvent: "trip" },
      report: { afterStep: "sv10", text: "Q-T1-10 MTZ bilan o'chdi, ABR ishlamadi. Q-SV10 qo'lda ulandi, 10 kV I seksiya T-2 dan ta'minlanmoqda." },
    }),
  ],
  decisions: [
    {
      id: "reclose",
      prompt: "Q-T1-10 ni qayta ulash mumkinmi?",
      options: [
        { id: "no", text: "Yo'q — himoya ishlash sababi aniqlanmaguncha va dispetcher ruxsatisiz ulanmaydi", correct: true },
        { id: "yes", text: "Ha — darhol qayta ulash kerak", why: "Nosozlik saqlanib qolgan bo'lsa — qayta qisqa tutashuv." },
      ],
    },
  ],
  steps: [
    { id: "chk", label: "Q-T1-10 o'chganini joyida tekshirish", match: { type: "checkPosition", deviceId: "Q-T1-10" }, explain: "SV ni ulashdan oldin kirish o'chirgichi ochiqligiga ishonch hosil qilinadi (teskari ta'minot bo'lmasin)." },
    switchStep("sv10", "Q-SV10", "closed", "Q-SV10 ni qo'lda ulash — seksiyani zaxiradan ta'minlash", ["chk"], "ABR o'rniga qo'lda — 1-toifa iste'molchilar uchun tezlik muhim.", { deadlineSec: 600 }),
    { id: "reclose", label: "Qaror: kirish o'chirgichini qayta ulash", match: { type: "choice", decisionId: "reclose" }, explain: "Himoya sababi aniqlanmaguncha qayta ulanmaydi." },
    reportStep("report", "m1", ["sv10"]),
    journalStep("journal", ["report"]),
  ],
  goals: [{ type: "loadsSupplied", loadIds: ["L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] }],
  journal: { required: true },
  analysis:
    "ABR rad etsa, operator mahalliy yo'riqnoma bo'yicha zaxirani qo'lda ulaydi: avval kirish o'chirgichi ochiqligini tekshiradi, so'ng seksiya o'chirgichini ulaydi va dispetcherga xabar beradi. Himoya bilan o'chgan kirish o'chirgichi sabab aniqlanmaguncha qayta ulanmaydi.",
};
