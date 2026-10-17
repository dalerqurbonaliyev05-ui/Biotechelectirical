import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, notice, reportStep, switchStep } from "./helpers";

// Favqulodda: T-1 da yong'in. Avval harakat (101, yuklamani o'tkazish, o'chirish, ajratish), keyin xabar.
export const S16: ScenarioDef = {
  id: "S16",
  level: 4,
  title: "Transformatorda yong'in",
  objective: "Favqulodda holatda to'g'ri tartib, ABR, xabar berish",
  briefing:
    "T-1 dan moy otilib chiqdi, portlash diafragmasi yorildi, yong'in boshlandi, himoya o'chirmadi. Favqulodda holat: dispetcher buyrug'ini kutmasdan harakat qiling — 101 ga xabar bering, yuklamani T-2 ga o'tkazing, T-1 ni barcha tomondan o'chiring va ajratkichlar bilan ajrating, keyin dispetcherga xabar bering. Yuklama ostida ajratkichni ochish — kritik xato.",
  kind: "switching",
  situation: { timeStart: "02:15", weather: "wind", season: "summer", ambientC: 27, loadFactor: 0.7 },
  orderRequired: false,
  timeline: [{ id: "fire", trigger: "start", event: { kind: "transformerFault", transformerId: "T-1", fault: "fire", trip: false } }],
  messages: [
    notice("m1", "Yangiobod PS, telemexanika T-1 da yong'in signalini ko'rsatmoqda! Vaziyatni darhol xabar qiling.", {
      report: { afterStep: "isolate", text: "T-1 da yong'in: 101 ga xabar berildi, yuklama T-2 ga o'tkazildi, T-1 barcha tomondan o'chirildi va ajratildi." },
    }),
  ],
  steps: [
    { id: "call", label: "101 — yong'in xizmatiga xabar berish", match: { type: "call", to: "fire" }, explain: "Yong'in xizmati darhol chaqiriladi.", deadlineSec: 300, hint: "«Dispetcher» bo'limidagi «101» tugmasi." },
    switchStep("sv10", "Q-SV10", "closed", "Q-SV10 ni ulash — 10 kV yuklamani T-2 ga", [], "Iste'molchilarni saqlash uchun yuklama zaxiraga o'tkaziladi (ABR qo'lda o'chirishda ishlamaydi)."),
    switchStep("sv35", "Q-SV35", "closed", "Q-SV35 ni ulash — 35 kV yuklamani T-2 ga", [], "35 kV ham."),
    switchStep("off10", "Q-T1-10", "open", "Q-T1-10 ni o'chirish", ["sv10"], "Avval o'chirgichlar."),
    switchStep("off35", "Q-T1-35", "open", "Q-T1-35 ni o'chirish", ["sv35"], "Avval o'chirgichlar."),
    switchStep("off110", "Q-T1-110", "open", "Q-T1-110 ni o'chirish — T-1 to'liq kuchlanishsiz", ["off10", "off35"], "Yonayotgan transformator imkon qadar tez kuchlanishsizlantiriladi.", {
      deadlineSec: 900,
      deadlineCritical: "fireSpread",
    }),
    ...(["110", "35", "10"] as const).flatMap((side) => [
      switchStep(`qsT${side}`, `QS-T1-${side}T`, "open", `QS-T1-${side}T ni ochish`, ["off110"], "Ajratkichlar faqat o'chirgichlardan keyin."),
      switchStep(`qsB${side}`, `QS-T1-${side}B`, "open", `QS-T1-${side}B ni ochish`, [`qsT${side}`], "Ko'rinadigan uzilish — o'chirish brigadasi uchun xavfsiz."),
    ]),
    { id: "isolate", label: "T-1 barcha tomondan ajratilganini tasdiqlash (ko'zdan kechirish)", match: { type: "inspect", targetId: "T-1" }, after: ["qsB110", "qsB35", "qsB10"], explain: "Hamma tomondan ko'rinadigan uzilish borligi tekshiriladi." },
    reportStep("report", "m1", ["isolate", "call"]),
    journalStep("journal", ["report"]),
  ],
  goals: [{ type: "loadsSupplied", loadIds: ["L-F35-1", "L-F35-2", "L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] }],
  journal: { required: true },
  analysis:
    "Favqulodda holatda (yong'in, odamga xavf) operator dispetcher buyrug'ini kutmasdan harakat qiladi va darhol keyin xabar beradi: 101 ga xabar, yuklamani zaxiraga o'tkazish, transformatorni avval o'chirgichlar, keyin ajratkichlar bilan barcha tomondan uzish. Yuklama ostida ajratkich ochilsa — yoy va yangi avariya. Hammasi jurnalga yoziladi.",
};
