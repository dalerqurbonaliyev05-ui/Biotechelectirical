import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Qorli kunda 110 kV W1 liniyada QT: APV muvaffaqiyatsiz, ABR SV110 ni uladi. Liniyani ajratish va yerlash.
export const S15: ScenarioDef = {
  id: "S15",
  level: 3,
  title: "Qorli kunda 110 kV liniyada qisqa tutashuv",
  objective: "Himoya, APV muvaffaqiyatsiz, obxod, muzni eritish",
  briefing:
    "Qor va muz bosishi, kuchli shamol. W1 liniyasida qisqa tutashuv: himoya o'chirdi, APV muvaffaqiyatsiz, ABR 110 kV seksiya o'chirgichini uladi. «Ko'r-ko'rona» qayta ulash taqiqlanadi. Dispetcher buyrug'i bilan liniyani ajrating, yerlang va ko'rik natijasiga ko'ra qaror qabul qiling.",
  kind: "switching",
  situation: { timeStart: "04:50", weather: "ice", season: "winter", ambientC: -6, loadFactor: 0.85 },
  orderRequired: true,
  timeline: [{ id: "kz", trigger: "start", event: { kind: "lineFault", breakerId: "Q-W1", nodeId: "W1", sourceId: "SRC-W1", apv: "fail" } }],
  messages: [
    order(
      "m1",
      "Yangiobod PS. W1 liniyasi QT bilan o'chdi, APV muvaffaqiyatsiz, qarama-qarshi uchi ham o'chirilgan. Q-W1 ni qayta ulash taqiqlanadi. W1 ni ajratib, yerlang; ko'rik natijasini xabar qiling.",
      "Tushundim: Q-W1 ni ulamayman; QS-W1L va QS-W1B ni ochaman, kuchlanish yo'qligini tekshirib, QSG-W1L bilan yerlayman va ko'rik natijasini xabar qilaman.",
      [["Tushundim: Q-W1 ni bir marta qo'lda qayta ulab ko'raman.", "APV muvaffaqiyatsiz — QT barqaror. Ko'r-ko'rona ulash avariyani takrorlaydi."]],
      { trigger: { afterEvent: "kz" }, report: { afterStep: "ice", text: "W1 ajratilgan va yerlangan. Ko'rik: muz qatlami 20–25 mm, simlar tebranishi. Muzni eritish sxemasini so'rayman." } },
    ),
  ],
  measurements: [
    {
      id: "patrol",
      label: "W1 liniyasi ko'rigi natijasi (obxod)",
      targetId: "W1",
      kind: "inspection",
      durationSec: 3600,
      fixed: 0,
      variants: [{ category: "ice", values: { "Muz qatlami": "20–25 mm", Simlar: "kuchli tebranish (plyaska)", "37–38-tayanchlar": "simlar yaqinlashgan, eritma izlari" } }],
    },
  ],
  decisions: [
    {
      id: "reclose",
      prompt: "Q-W1 ni qo'lda bir marta qayta ulab ko'rish kerakmi?",
      after: "rb",
      options: [
        { id: "no", text: "Yo'q — APV muvaffaqiyatsiz, QT barqaror; liniya ko'riksiz va dispetcher ruxsatisiz ulanmaydi", correct: true },
        { id: "yes", text: "Ha — balki shox tushib ketgandir", why: "«Ko'r-ko'rona» ulash — QT ni takrorlaydi, uskunaga va tizimga zarar." },
      ],
    },
    {
      id: "ice",
      prompt: "Ko'rik natijasiga ko'ra qanday chora ko'rish taklif qilinadi?",
      after: "patrol",
      options: [
        { id: "melt", text: "Dispetcher buyrug'i bilan liniyani ikki uchidan uzib, muzni tok bilan eritish sxemasini yig'ish (yoki mexanik tozalash)", correctWhen: { measurementId: "patrol", categories: ["ice"] } },
        { id: "load", text: "Liniyani yuklama bilan ulab, sim qizib muz eriydi", severity: "critical", failCode: "closeOntoFault", why: "Liniyada barqaror QT bor — kuchlanish berish avariya." },
        { id: "wait", text: "Hech narsa qilmay, ob-havo yaxshilanishini kutish", why: "Muz qalinlashib, simlar uzilishi va tayanchlar sinishi mumkin." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "reclose", label: "Qaror: qayta ulash", match: { type: "choice", decisionId: "reclose" }, after: ["rb"], explain: "APV muvaffaqiyatsizligidan keyin ko'r-ko'rona ulash taqiqlanadi." },
    switchStep("qsL", "QS-W1L", "open", "QS-W1L (liniya ajratkichi) ni ochish", ["rb"], "Liniya tomonidagi ajratkich birinchi."),
    switchStep("qsB", "QS-W1B", "open", "QS-W1B (shina ajratkichi) ni ochish", ["qsL"], "So'ng shina tomonidagi."),
    { id: "verify", label: "W1 da kuchlanish yo'qligini tekshirish", match: { type: "verifyDead", nodeIds: ["W1"] }, after: ["qsB"], explain: "Liniya ikki uchidan o'chirilganiga ishonch hosil qilinadi." },
    switchStep("earth", "QSG-W1L", "closed", "QSG-W1L yerlagichini ulash", ["verify"], "Ko'rik va ta'mir uchun liniya yerlanadi."),
    { id: "patrol", label: "Liniya ko'rigi natijasini olish", match: { type: "measure", measurementId: "patrol" }, after: ["earth"], explain: "Obxod brigadasi shikast joyini aniqlaydi.", hint: "W1 liniyasini tanlang → «Ko'rik natijasi»." },
    { id: "ice", label: "Qaror: muzga qarshi chora", match: { type: "choice", decisionId: "ice" }, after: ["patrol"], explain: "Muz tok bilan eritiladi yoki mexanik tozalanadi." },
    reportStep("report", "m1", ["ice"]),
    journalStep("journal", ["report"]),
  ],
  goals: [{ type: "device", deviceId: "QSG-W1L", pos: "closed" }],
  journal: { required: true },
  analysis:
    "110 kV va undan yuqori (samarali yerlangan neytral) tarmoqda bir fazali tutashuv — qisqa tutashuv: himoya darhol o'chiradi, APV qayta ulaydi. APV muvaffaqiyatsiz bo'lsa — QT barqaror: liniya ko'riksiz va dispetcher ruxsatisiz ulanmaydi. ABR yuklamani zaxiradan ta'minlaydi. Muz bosganda — tok bilan eritish yoki mexanik tozalash.",
};
