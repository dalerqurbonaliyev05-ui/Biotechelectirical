import type { ScenarioDef } from "../../engine/scenario";
import { order, readbackStep, reportStep } from "./helpers";

// Moy sinovi natijasi tasodifiy (urug' bo'yicha): me'yorda / namlangan / eskirgan.
export const S08: ScenarioDef = {
  id: "S08",
  level: 2,
  title: "Moyni filtrlash yoki almashtirish",
  objective: "Moy sinovi natijalari bo'yicha qaror",
  briefing:
    "Rejali nazorat: T-1 dan moy namunasi olib, laboratoriya natijalari bo'yicha xulosa chiqaring. Natijalar har safar boshqacha bo'lishi mumkin — me'yorlar bilan solishtiring.",
  kind: "switching",
  situation: { timeStart: "10:00", weather: "clear", season: "spring", ambientC: 22, loadFactor: 0.7 },
  orderRequired: false,
  messages: [
    order(
      "m1",
      "Yangiobod PS. T-1 dan moy namunasini olib, tahlil natijasiga ko'ra xulosa bering.",
      "Tushundim: T-1 dan moy namunasini olaman, natija bo'yicha xulosa beraman.",
      [["Tushundim: T-1 ni o'chirib, moyni almashtiraman.", "Avval tahlil — xulosa natijaga qarab chiqariladi."]],
      { from: "Bosh muhandis", report: { afterStep: "decide", text: "T-1 moy tahlili bajarildi, xulosa qarorga kiritildi." } },
    ),
  ],
  measurements: [
    {
      id: "oil",
      label: "Moy namunasini olish va laboratoriya tahlili",
      targetId: "T-1",
      kind: "oilSample",
      durationSec: 3600,
      variants: [
        { category: "ok", values: { "Probiv kuchlanishi": "54 kV", Namlik: "11 g/t", "Kislota soni": "0,04 mg KOH/g", Rangi: "och sariq, tiniq" } },
        { category: "wet", values: { "Probiv kuchlanishi": "29 kV", Namlik: "34 g/t", "Kislota soni": "0,07 mg KOH/g", Rangi: "och sariq, xira" } },
        { category: "aged", values: { "Probiv kuchlanishi": "41 kV", Namlik: "17 g/t", "Kislota soni": "0,32 mg KOH/g", Rangi: "to'q jigarrang, cho'kma bor" } },
      ],
    },
  ],
  decisions: [
    {
      id: "decide",
      prompt: "Moy tahlili natijasiga ko'ra qaror (me'yorlar: probiv ≥ 35 kV, namlik ≤ 25 g/t, kislota soni ≤ 0,25 — tekshirilsin):",
      after: "oil",
      options: [
        { id: "keep", text: "Moy me'yorda — ekspluatatsiyani davom ettirish, keyingi rejali sinov", correctWhen: { measurementId: "oil", categories: ["ok"] }, why: "Ko'rsatkichlar me'yordan tashqarida — moyga ishlov kerak." },
        { id: "dry", text: "Moyni quritish va filtrlash (namlik va probiv kuchlanishini tiklash)", correctWhen: { measurementId: "oil", categories: ["wet"] }, why: "Namlik va probiv me'yorda bo'lsa quritish keraksiz; eskirgan moyni quritish yordam bermaydi." },
        { id: "replace", text: "Moyni regeneratsiya qilish yoki almashtirish (kislota yuqori, cho'kma)", correctWhen: { measurementId: "oil", categories: ["aged"] }, why: "Kislota soni va rang me'yorda bo'lsa almashtirish iqtisodiy asossiz." },
        { id: "scrap", text: "Transformatorni darhol o'chirib, almashtirish", why: "Moy holati transformatorni almashtirishga asos emas." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1", "Topshiriqni qaytarib o'qish"),
    {
      id: "oil",
      label: "T-1 dan moy namunasini olish (tahlil natijasi)",
      match: { type: "measure", measurementId: "oil" },
      after: ["rb"],
      explain: "Namuna toza, quruq idishga, pastki kran orqali olinadi; natija me'yorlar bilan solishtiriladi.",
      hint: "T-1 kartasidagi «Moy namunasini olish».",
    },
    { id: "decide", label: "Natija bo'yicha qaror", match: { type: "choice", decisionId: "decide" }, after: ["oil"], explain: "Qaror me'yorlar bilan solishtirib chiqariladi." },
    reportStep("report", "m1", ["decide"], "Bosh muhandisga xulosa berish"),
  ],
  analysis:
    "Moy sifati: probiv kuchlanishi va namlik — izolyatsiya xususiyati (namlangan moy quritiladi va filtrlanadi), kislota soni va rangi — oksidlanish/eskirish (regeneratsiya yoki almashtirish). Me'yorlar kuchlanish sinfiga bog'liq va TEKSHIRUV ro'yxatida.",
};
