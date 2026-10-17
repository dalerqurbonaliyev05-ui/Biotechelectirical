import type { ScenarioDef } from "../../engine/scenario";
import { journalStep, order, readbackStep, reportStep } from "./helpers";

// Chaqmoq: W2 da QT, APV muvaffaqiyatli, OPN ishladi — ko'rik va qaror.
export const S20: ScenarioDef = {
  id: "S20",
  level: 4,
  title: "Chaqmoq urishi",
  objective: "OPN va himoyalar ishlagandan keyin ko'rik va tekshiruv",
  briefing:
    "Momaqaldiroq. W2 liniyasiga chaqmoq urdi: himoya o'chirdi, APV muvaffaqiyatli qayta uladi, OPN-W2 ishladi. Podstansiyani ko'rikdan o'tkazing, hisoblagich va himoya ko'rsatkichlarini qayd eting va qaror qabul qiling.",
  kind: "switching",
  situation: { timeStart: "16:25", weather: "storm", season: "spring", ambientC: 21, loadFactor: 0.8 },
  orderRequired: true,
  timeline: [
    { id: "strike", trigger: "start", event: { kind: "lineFault", breakerId: "Q-W2", nodeId: "W2", sourceId: "SRC-W2", apv: "success" } },
    { id: "opn", trigger: "start", event: { kind: "alarm", code: "opnOperated", params: { opn: "OPN-W2" } } },
  ],
  messages: [
    order(
      "m1",
      "Yangiobod PS. W2 da chaqmoq: himoya o'chirdi, APV muvaffaqiyatli. OPN va 110 kV uskunani ko'rikdan o'tkazing, natijani xabar qiling.",
      "Tushundim: OPN-W2 va 110 kV uskunani ko'rikdan o'tkazaman, hisoblagich va himoya ko'rsatkichlarini qayd etib, xabar beraman.",
      [["Tushundim: W2 ni o'chirib, OPN ni almashtiraman.", "Ko'riksiz o'chirish va almashtirish asossiz."]],
      { trigger: { afterEvent: "strike" }, report: { afterStep: "decide", text: "OPN-W2 hisoblagichi 14 → 15, tashqi shikast yo'q; himoya va APV to'g'ri ishlagan. OPN ishda qoldirildi, navbatdan tashqari sinov rejalashtirildi." } },
    ),
  ],
  measurements: [
    { id: "counter", label: "OPN-W2 ishlash hisoblagichi", targetId: "OPN-W2", kind: "counter", durationSec: 300, fixed: 0, variants: [{ category: "plusOne", values: { "Avvalgi ko'rsatkich": "14", "Hozirgi ko'rsatkich": "15" } }] },
    { id: "look", label: "OPN-W2 tashqi ko'rigi", targetId: "OPN-W2", kind: "inspection", durationSec: 600, fixed: 0, variants: [{ category: "intact", values: { Qoplama: "yoriq va kuyish izi yo'q", "Yerlash o'tkazgichi": "butun" } }] },
    { id: "relay", label: "W2 himoya va APV ko'rsatkichlari", targetId: "W2", kind: "docs", durationSec: 600, fixed: 0, variants: [{ category: "ok", values: { Himoya: "masofaviy himoya, 1-zona", APV: "1 marta, muvaffaqiyatli", "Avariyaviy ossillograf": "yozuv bor" } }] },
  ],
  decisions: [
    {
      id: "decide",
      prompt: "Ko'rik natijasiga ko'ra:",
      after: "relay",
      options: [
        { id: "keep", text: "OPN ni ishda qoldirish, hisoblagich ko'rsatkichini jurnalga yozish, navbatdan tashqari sinov (o'tkazuvchanlik toki) ni rejalashtirish", correct: true },
        { id: "replace", text: "OPN ni darhol o'chirib almashtirish", why: "Shikast belgisi yo'q — ishlash OPN ning vazifasi; almashtirish asossiz." },
        { id: "nothing", text: "Hech narsa qilmaslik va yozmaslik", why: "Har bir ishlash qayd etiladi; bir necha ishlashdan keyin sinov kerak bo'ladi." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1"),
    { id: "counter", label: "OPN-W2 hisoblagichini o'qish", match: { type: "measure", measurementId: "counter" }, after: ["rb"], explain: "Ishlash soni qayd etiladi.", hint: "Sxemada OPN-W2 ni tanlang." },
    { id: "look", label: "OPN-W2 ni ko'zdan kechirish", match: { type: "measure", measurementId: "look" }, after: ["rb"], explain: "Qoplamada yoriq, kuyish izlari tekshiriladi." },
    { id: "relay", label: "Himoya va APV ko'rsatkichlarini qayd etish", match: { type: "measure", measurementId: "relay" }, after: ["rb"], explain: "Qaysi himoya ishlagani va APV natijasi yoziladi." },
    { id: "decide", label: "Qaror", match: { type: "choice", decisionId: "decide" }, after: ["counter", "look", "relay"], explain: "Shikast bo'lmasa OPN ishda qoladi." },
    reportStep("report", "m1", ["decide"]),
    journalStep("journal", ["report"]),
  ],
  journal: { required: true },
  analysis:
    "Chaqmoqdan keyin: qaysi himoya ishlagani va APV natijasi, OPN hisoblagichi ko'rsatkichlari qayd etiladi, OPN va 110 kV uskunasi ko'zdan kechiriladi. Tashqi shikast bo'lmasa OPN ishda qoladi va navbatdan tashqari sinov rejalashtiriladi. Hammasi jurnalga yoziladi.",
};
