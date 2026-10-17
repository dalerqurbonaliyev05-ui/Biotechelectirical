import type { ScenarioDef } from "../../engine/scenario";
import { notice, reportStep } from "./helpers";

// O'ramlar izolyatsiyasi buzilgan: megger (protokol), o'ram qarshiligi, moy tahlili → qaror.
export const S13: ScenarioDef = {
  id: "S13",
  level: 3,
  title: "O'ramlar izolyatsiyasi buzilgan",
  objective: "Megger, o'ramlar qarshiligi, moy tahlili bo'yicha qaror",
  briefing:
    "T-2 rejali sinovlarda (o'chirilgan va yerlangan). Izolyatsiya qarshiligini o'lchab protokolga yozing, o'ramlar qarshiligi va moy tahlilini oling, natijalarga ko'ra qaror qabul qiling.",
  kind: "switching",
  situation: { timeStart: "09:30", weather: "clear", season: "spring", ambientC: 20, loadFactor: 0.6 },
  orderRequired: false,
  initial: {
    devices: {
      "Q-T2-110": "open",
      "Q-T2-35": "open",
      "Q-T2-10": "open",
      "QS-T2-110T": "open",
      "QS-T2-110B": "open",
      "QS-T2-35T": "open",
      "QS-T2-35B": "open",
      "QS-T2-10T": "open",
      "QS-T2-10B": "open",
      "QSG-T2-110": "closed",
      "QSG-T2-35": "closed",
      "QSG-T2-10": "closed",
      "Q-SV10": "closed",
      "Q-SV35": "closed",
    },
  },
  messages: [notice("m1", "T-2 sinov natijalarini rasmiylashtirib, xulosa bering.", { from: "Bosh muhandis", report: { afterStep: "decide", text: "T-2 sinovlari bajarildi, xulosa va qaror yuborildi." } })],
  protocol: {
    kind: "insulation",
    tempC: 20,
    readings: [
      { winding: "hv", label: "YuK (110 kV) — korpus", r15: 820, r60: 880, factoryR60: 3500 },
      { winding: "mv", label: "O'K (35 kV) — korpus", r15: 560, r60: 610, factoryR60: 2400 },
      { winding: "lv", label: "PK (10 kV) — korpus", r15: 300, r60: 330, factoryR60: 1300 },
    ],
  },
  measurements: [
    {
      id: "rw",
      label: "O'ramlar qarshiligi (doimiy tok)",
      targetId: "T-2",
      kind: "windingResistance",
      durationSec: 1800,
      fixed: 0,
      variants: [{ category: "balanced", values: { "YuK, fazalar farqi": "0,8%", "O'K, fazalar farqi": "1,1%", "PK, fazalar farqi": "0,9%", Xulosa: "fazalar bir xil (≤2%)" } }],
    },
    {
      id: "oil",
      label: "Moy tahlili",
      targetId: "T-2",
      kind: "oilSample",
      durationSec: 3600,
      fixed: 0,
      variants: [{ category: "wet", values: { "Probiv kuchlanishi": "27 kV", Namlik: "38 g/t", "Kislota soni": "0,06 mg KOH/g", Rangi: "och sariq" } }],
    },
  ],
  decisions: [
    {
      id: "decide",
      prompt: "Natijalar: izolyatsiya past (R60/R15 ≈ 1,07), o'ramlar qarshiligi me'yorda, moy namlangan. Qaror?",
      after: "oil",
      options: [
        { id: "dry", text: "Moyni quritish va transformator izolyatsiyasini quritish (vakuumli), keyin qayta o'lchash", correct: true },
        { id: "rewind", text: "O'ramni zavodda ta'mirlash", why: "O'ramlar qarshiligi me'yorda — o'ram shikasti belgisi yo'q; sabab — namlik." },
        { id: "replace", text: "Transformatorni almashtirish", why: "Quritish bilan tiklanadigan holatda almashtirish iqtisodiy asossiz." },
        { id: "energize", text: "Ishga tushirish — qarshilik baribir yuzlab MOm", severity: "critical", failCode: "energizeBadInsulation", why: "Me'yordan past izolyatsiyali transformatorga kuchlanish berish — teshilish xavfi." },
      ],
    },
  ],
  steps: [
    { id: "protocol", label: "Izolyatsiya qarshiligini o'lchash va protokolga yozish", match: { type: "protocol" }, explain: "R60/R15 va zavod qiymatiga nisbat — namlanish ko'rsatkichi." },
    { id: "rw", label: "O'ramlar qarshiligini o'lchash", match: { type: "measure", measurementId: "rw" }, after: ["protocol"], explain: "Fazalar farqi o'ram yoki kontakt shikastini ko'rsatadi." },
    { id: "oil", label: "Moy tahlili", match: { type: "measure", measurementId: "oil" }, after: ["protocol"], explain: "Namlik va probiv kuchlanishi." },
    { id: "decide", label: "Qaror", match: { type: "choice", decisionId: "decide" }, after: ["rw", "oil"], explain: "Natijalar majmuasi bo'yicha." },
    reportStep("report", "m1", ["decide"], "Bosh muhandisga xulosa"),
  ],
  analysis:
    "Izolyatsiya qarshiligi va absorbsiya koeffitsienti past, o'ramlar qarshiligi fazalar bo'yicha bir xil, moy namlangan — demak sabab namlanish: moy va izolyatsiya quritiladi, so'ng qayta o'lchanadi. O'ram qarshiligi farqi katta bo'lsa — o'ram yoki RPN kontakti shikasti (ta'mir), ko'p ko'rsatkichlar keskin yomon bo'lsa — almashtirish ko'rib chiqiladi.",
};
