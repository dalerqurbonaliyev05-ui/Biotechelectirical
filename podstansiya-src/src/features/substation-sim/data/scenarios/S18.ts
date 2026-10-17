import type { ScenarioDef, StepDef } from "../../engine/scenario";
import { NORMS } from "../norms";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

// Yangi 35 kV transformatorni o'rnatish va ishga tushirish (to'liq loyiha), "Yangi hayot" 35/10 kV PS.
const shocks = NORMS.energizeShocks.value;
const shockSteps: StepDef[] = [];
let prev = "discDone";
for (let i = 1; i <= shocks; i++) {
  shockSteps.push(switchStep(`on${i}`, "Q-T3-35", "closed", `${i}-zarba: Q-T3-35 ni ulash (salt yurish)`, [prev], "Yangi transformator nominal kuchlanishga bir necha marta zarba bilan ulanadi — magnitlanish toki sakrashiga himoya sezgir emasligi va izolyatsiya mustahkamligi tekshiriladi."));
  prev = `on${i}`;
  if (i < shocks) {
    shockSteps.push(switchStep(`off${i}`, "Q-T3-35", "open", `Q-T3-35 ni o'chirish (${i}-zarbadan keyin)`, [prev], "Zarbalar orasida o'chiriladi."));
    prev = `off${i}`;
  }
}

const task = (id: string, label: string, after: string[], explain: string): StepDef => ({ id, label, match: { type: "task", taskId: id }, after, explain });
const measure = (id: string, label: string, after: string[], explain: string): StepDef => ({ id, label, match: { type: "measure", measurementId: id }, after, explain });

export const S18: ScenarioDef = {
  id: "S18",
  level: 4,
  title: "Yangi 35 kV transformator o'rnatish",
  objective: "Qabul, yig'ish, sinovlar, fazirovka, ishga tushirish",
  briefing:
    "«Yangi hayot» 35/10 kV podstansiyasi uchun yangi ТМН-6300/35 transformatori keldi. Qabul qiling, yig'ishni tashkil qiling, vakuum ostida moy quying, sinovlarni o'tkazing, himoyani sozlang, fazirovka qiling, so'ng nominal kuchlanishga bir necha marta zarba bilan ulab, salt yurishda kuzatib, yuklamaga qo'ying. Ishlar «Topshiriq» bo'limidagi tugmalar bilan bajariladi.",
  kind: "switching",
  topology: "ps35",
  situation: { timeStart: "08:00", weather: "clear", season: "spring", ambientC: 18, loadFactor: 0.8, sourceKv: 36 },
  orderRequired: true,
  allowedOutages: ["L-F10-5", "L-F10-6"],
  initial: {
    devices: {
      "QS-T3-35B": "open",
      "Q-T3-35": "open",
      "QS-T3-35T": "open",
      "QS-T3-10T": "open",
      "Q-T3-10": "open",
      "QS-T3-10B": "open",
      "QSG-T3-35": "closed",
      "QSG-T3-10": "closed",
    },
  },
  messages: [
    order(
      "m1",
      "«Yangi hayot» PS. T-3 ni qabul qilish va ishga tushirish dasturini bajaring. Ulashdan oldin sinov natijalari va himoya sozlamalarini xabar qiling; ishga tushirgach yuklamaga qo'yish haqida xabar bering.",
      "Tushundim: T-3 ni dastur bo'yicha qabul qilib, sinovlardan o'tkazaman, himoyani sozlab, fazirovkadan keyin zarba bilan ulayman va yuklamaga qo'yaman.",
      [["Tushundim: T-3 ni darhol yuklama bilan ulayman.", "Yangi transformator sinovlar, himoya sozlamasi va zarba bilan ulashdan keyingina yuklamaga qo'yiladi."]],
      { report: { afterStep: "load", text: "T-3 sinovlardan o'tdi, zarba bilan ulandi, salt yurishda kuzatildi va yuklamaga qo'yildi." } },
    ),
  ],
  tasks: [
    { id: "docs", label: "Hujjatlar, pasport va zavod sinov bayonnomalarini tekshirish", durationSec: 1800, result: "Hujjatlar to'liq, seriya raqami mos." },
    { id: "foundation", label: "Poydevorni qabul qilish (sath, relslar, moy qabul qilgich)", durationSec: 3600, result: "Poydevor qabul qilindi." },
    { id: "assembly", label: "Yig'ish: kiritmalar, radiatorlar, kengaytirgich, gaz relesi, termosignalizatorlar", durationSec: 6 * 3600, result: "Yig'ildi, zichlik sinovi o'tdi." },
    { id: "vacuum", label: "Vakuumlash va moyni vakuum ostida quyish", durationSec: 8 * 3600, result: "Moy quyildi, havo chiqarildi." },
    { id: "phasing", label: "Fazirovka (yangi 35 kV liniya va shina)", durationSec: 1800, result: "Fazalar mos." },
  ],
  measurements: [
    { id: "impact", label: "Tashishdagi zarba registratori ko'rsatkichi", targetId: "T-3", kind: "docs", durationSec: 600, fixed: 0, variants: [{ category: "ok", values: { "Maksimal tezlanish": "≤ 2g", Xulosa: "me'yorda" } }] },
    { id: "oil", label: "Quyilgan moy tahlili", targetId: "T-3", kind: "oilSample", durationSec: 3600, fixed: 0, variants: [{ category: "ok", values: { "Probiv kuchlanishi": "62 kV", Namlik: "8 g/t" } }] },
    { id: "rw", label: "O'ramlar qarshiligi", targetId: "T-3", kind: "windingResistance", durationSec: 1800, fixed: 0, variants: [{ category: "ok", values: { "Fazalar farqi": "0,7%", "Zavod qiymatidan farq": "1,2%" } }] },
    { id: "ratio", label: "Transformatsiya koeffitsienti (barcha pog'onalarda)", targetId: "T-3", kind: "ratio", durationSec: 1800, fixed: 0, variants: [{ category: "ok", values: { "Pasportdan farq": "≤ 0,3%" } }] },
    { id: "group", label: "Ulanish guruhi", targetId: "T-3", kind: "vectorGroup", durationSec: 900, fixed: 0, variants: [{ category: "ok", values: { Guruh: "Y/Δ-11 — pasportga mos" } }] },
    { id: "noload", label: "Salt yurish toki va isrofi (past kuchlanishda)", targetId: "T-3", kind: "noLoad", durationSec: 1800, fixed: 0, variants: [{ category: "ok", values: { "Zavod qiymatidan farq": "4%" } }] },
  ],
  protocol: {
    kind: "insulation",
    tempC: 18,
    readings: [
      { winding: "hv", label: "YuK (35 kV) — korpus", r15: 1900, r60: 2900, factoryR60: 3200 },
      { winding: "lv", label: "PK (10 kV) — korpus", r15: 1100, r60: 1650, factoryR60: 1800 },
    ],
  },
  decisions: [
    {
      id: "tests",
      prompt: "Sinovlar natijasi bo'yicha xulosa:",
      after: "noload",
      options: [
        { id: "ok", text: "Barcha sinovlar me'yorda — transformator ishga tushirishga yaroqli", correct: true },
        { id: "no", text: "Transformatorni zavodga qaytarish", why: "Natijalar me'yorda — asos yo'q." },
      ],
    },
    {
      id: "relay",
      prompt: "Himoya sozlamalari:",
      after: "tests",
      options: [
        { id: "ok", text: "Differensial (yoki tok kesish) va MTZ — loyiha sozlamalari bilan; gaz relesi — o'chirishga, harorat — signalga; hammasi kiritilgan va tekshirilgan", correct: true },
        { id: "off", text: "Birinchi ulashda differensial himoyani o'chirib qo'yish (magnitlanish toki sakrashi tufayli)", severity: "critical", failCode: "protectionDisabled", why: "Zarba bilan ulashda barcha himoyalar ishda bo'lishi shart — aynan shu paytda nosozlik bo'lishi mumkin." },
      ],
    },
  ],
  steps: [
    readbackStep("rb", "m1", "Dasturni qaytarib o'qish"),
    task("docs", "Hujjatlar va pasportni tekshirish", ["rb"], "Pasport, zavod bayonnomalari, komplektlik."),
    measure("impact", "Zarba registratorini tekshirish", ["docs"], "Tashishda zarba bo'lgan bo'lsa — ichki ko'rik kerak."),
    task("foundation", "Poydevorni qabul qilish", ["impact"], "Sath, relslar, moy qabul qilgich."),
    task("assembly", "Yig'ish", ["foundation"], "Kiritmalar, radiatorlar, kengaytirgich, gaz relesi."),
    task("vacuum", "Vakuumlash va moy quyish", ["assembly"], "Moy vakuum ostida quyiladi — izolyatsiyada havo qolmasligi uchun."),
    measure("oil", "Moy tahlili", ["vacuum"], "Probiv va namlik me'yorda bo'lishi kerak."),
    { id: "protocol", label: "Izolyatsiya qarshiligi (protokol)", match: { type: "protocol" }, after: ["oil"], explain: "R60/R15 va zavod qiymati bilan solishtirish." },
    measure("rw", "O'ramlar qarshiligi", ["oil"], "Fazalar va zavod qiymati bilan solishtirish."),
    measure("ratio", "Transformatsiya koeffitsienti", ["oil"], "Barcha pog'onalarda."),
    measure("group", "Ulanish guruhi", ["oil"], "Pasportga mosligi."),
    measure("noload", "Salt yurish sinovi", ["protocol", "rw", "ratio", "group"], "Past kuchlanishda salt yurish toki va isrofi."),
    { id: "tests", label: "Sinovlar xulosasi", match: { type: "choice", decisionId: "tests" }, after: ["noload"], explain: "Hammasi me'yorda bo'lsagina ishga tushiriladi." },
    { id: "relay", label: "Himoya sozlamalari", match: { type: "choice", decisionId: "relay" }, after: ["tests"], explain: "Himoyalar ulashdan oldin sozlanadi va tekshiriladi." },
    task("phasing", "Fazirovka", ["relay"], "Fazalar ketma-ketligi va mosligi."),
    switchStep("ue35", "QSG-T3-35", "open", "QSG-T3-35 yerlagichini olish", ["phasing"], "Ishlar tugagach yerlagichlar olinadi."),
    switchStep("ue10", "QSG-T3-10", "open", "QSG-T3-10 yerlagichini olish", ["phasing"], "Ishlar tugagach yerlagichlar olinadi."),
    switchStep("d35b", "QS-T3-35B", "closed", "QS-T3-35B ni yopish", ["ue35", "ue10"], "Avval shina tomoni."),
    switchStep("d35t", "QS-T3-35T", "closed", "QS-T3-35T ni yopish", ["d35b"], "Keyin transformator tomoni."),
    switchStep("d10t", "QS-T3-10T", "closed", "QS-T3-10T ni yopish", ["ue35", "ue10"], "10 kV tomon ajratkichlari (o'chirgich ochiq)."),
    { ...switchStep("discDone", "QS-T3-10B", "closed", "QS-T3-10B ni yopish", ["d10t", "d35t"], "Ajratkichlar yopildi — o'chirgichlar ochiq.") },
    ...shockSteps,
    { id: "observe", label: `Salt yurishda kamida ${NORMS.noLoadObservationMin.value} daqiqa kuzatish (⏩)`, match: { type: "wait", minSec: NORMS.noLoadObservationMin.value * 60 }, after: [prev], explain: "Shovqin, harorat, gaz relesi, moy sathi kuzatiladi." },
    switchStep("load", "Q-T3-10", "closed", "Q-T3-10 ni ulash — yuklamaga qo'yish", ["observe"], "Salt yurishda muammo bo'lmasa yuklama ulanadi."),
    reportStep("report", "m1", ["load"]),
    journalStep("journal", ["report"]),
  ],
  goals: [
    { type: "device", deviceId: "Q-T3-35", pos: "closed" },
    { type: "loadsSupplied", loadIds: ["L-F10-5", "L-F10-6"] },
  ],
  journal: { required: true },
  analysis:
    "Yangi transformatorni ishga tushirish: hujjatlar va tashishdagi zarba tekshiruvi → poydevor → yig'ish → vakuum ostida moy quyish → sinovlar (moy, izolyatsiya, o'ramlar qarshiligi, transformatsiya koeffitsienti, ulanish guruhi, salt yurish) → himoya sozlamalari → fazirovka → nominal kuchlanishga bir necha marta zarba bilan ulash → salt yurishda kuzatish → yuklamaga qo'yish. Aniq soni va muddatlar TEKSHIRUV ro'yxatida.",
};
