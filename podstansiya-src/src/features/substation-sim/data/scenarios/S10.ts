import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Gaz relesi signalga ishladi: gaz namunasi sariq va yonuvchi — T-2 ni yuklamadan bo'shatib o'chirish.
export const S10: ScenarioDef = {
  id: "S10",
  level: 3,
  title: "Gaz relesi signalga ishladi",
  objective: "Gaz namunasini olish va qaror qabul qilish",
  briefing:
    "T-2 gaz relesi «signal» ga ishladi. Gaz namunasini oling, rangi va yonuvchanligini baholang, qaror qabul qiling. Agar transformatorni o'chirish kerak bo'lsa — iste'molchilarni uzmasdan, yuklamani T-1 ga o'tkazib o'chiring.",
  kind: "switching",
  situation: { timeStart: "07:40", weather: "clear", season: "spring", ambientC: 16, loadFactor: 0.75 },
  orderRequired: true,
  timeline: [{ id: "gas", trigger: "start", event: { kind: "alarm", code: "gasSignal", params: { transformer: "T-2" } } }],
  messages: [
    order(
      "m1",
      "Yangiobod PS. Telemexanika T-2 gaz relesi signalini ko'rsatmoqda. Gaz namunasini olib baholang; kerak bo'lsa yuklamani T-1 ga o'tkazib, T-2 ni o'chiring va xabar bering.",
      "Tushundim: T-2 gaz relesidan namuna olaman; kerak bo'lsa yuklamani SV orqali T-1 ga o'tkazib, T-2 ni o'chiraman va xabar beraman.",
      [["Tushundim: signalni o'chirib, kuzatishni davom ettiraman.", "Gaz signali — ichki nosozlik belgisi bo'lishi mumkin, uni tekshirmasdan e'tiborsiz qoldirib bo'lmaydi."]],
      { report: { afterStep: "off110", text: "T-2 gaz relesidagi gaz sariq va yonuvchi — T-2 yuklamadan bo'shatilib o'chirildi, yuklama T-1 da." } },
    ),
  ],
  measurements: [
    {
      id: "gas",
      label: "Gaz relesidan gaz namunasini olish",
      targetId: "T-2",
      kind: "gasSample",
      durationSec: 900,
      fixed: 0,
      variants: [{ category: "yellowFlammable", values: { Rangi: "sariq", Yonuvchanligi: "yonadi", "Gaz hajmi": "≈150 sm³" } }],
    },
  ],
  decisions: [
    {
      id: "decide",
      prompt: "Gaz namunasi bo'yicha qaror:",
      after: "gas",
      options: [
        { id: "air", text: "Gaz rangsiz va yonmaydi — havo; uni chiqarib, kuzatishni davom ettirish", why: "Namuna sariq va yonuvchi — bu havo emas." },
        {
          id: "off",
          text: "Sariq, yonuvchi gaz — qog'oz/karton izolyatsiya shikastlanishi: yuklamani o'tkazib, T-2 ni o'chirish, moyni xromatografik tahlilga yuborish",
          correctWhen: { measurementId: "gas", categories: ["yellowFlammable"] },
        },
        { id: "ignore", text: "Signal zanjirini o'chirib, transformatorni ishlatishni davom ettirish", why: "Himoyani o'chirish taqiqlanadi; nosozlik rivojlanib, og'ir gaz va avariyaga olib keladi." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "gas", label: "T-2 gaz relesidan gaz namunasini olish", match: { type: "measure", measurementId: "gas" }, after: ["rb"], explain: "Gaz rangi va yonuvchanligi nosozlik turini ko'rsatadi.", hint: "T-2 kartasidagi «Gaz namunasini olish»." },
    { id: "decide", label: "Gaz bo'yicha qaror", match: { type: "choice", decisionId: "decide" }, after: ["gas"], explain: "Rangsiz-yonmaydigan — havo; sariq — qog'oz/yog'och; kulrang-oq — karton; qora — moy parchalanishi (yoy)." },
    switchStep("sv10", "Q-SV10", "closed", "Q-SV10 ni ulash — 10 kV yuklamani T-1 ga o'tkazish", ["decide"], "Iste'molchilar uzilmasligi uchun avval SV ulanadi."),
    switchStep("sv35", "Q-SV35", "closed", "Q-SV35 ni ulash — 35 kV yuklamani T-1 ga o'tkazish", ["decide"], "35 kV ham xuddi shunday."),
    switchStep("off10", "Q-T2-10", "open", "Q-T2-10 ni o'chirish", ["sv10"], "Avval past tomonlar."),
    switchStep("off35", "Q-T2-35", "open", "Q-T2-35 ni o'chirish", ["sv35"], "Avval past tomonlar."),
    switchStep("off110", "Q-T2-110", "open", "Q-T2-110 ni o'chirish", ["off10", "off35"], "Oxirida YK o'chirgichi."),
    reportStep("report", "m1", ["off110"]),
    journalStep("journal", ["report"]),
  ],
  goals: [{ type: "loadsSupplied", loadIds: ["L-F35-1", "L-F35-2", "L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] }],
  journal: { required: true },
  analysis:
    "Gaz relesi «signal» ga ishlasa: gaz namunasi olinadi va rangi, yonuvchanligi baholanadi (rangsiz yonmaydigan — havo; sariq — qog'oz/yog'och izolyatsiya; oq-kulrang — karton; qora/to'q kulrang yonuvchi — moyning yoy bilan parchalanishi). Yonuvchi gaz — ichki nosozlik: transformator yuklamadan bo'shatilib o'chiriladi, moyning xromatografik tahlili o'tkaziladi. «Og'ir gaz» bo'lsa himoya transformatorni o'zi o'chiradi.",
};
