import type { ScenarioDef } from "../../engine/scenario";
import { NORMS } from "../norms";
import { notice, reportStep } from "./helpers";

const OVL = String(NORMS.transformerSelectionOverload.value).replace(".", ",");

// Berilgan yuklama bo'yicha transformator markasini tanlash va markani o'qish.
export const S09: ScenarioDef = {
  id: "S09",
  level: 2,
  title: "Transformator markasini tanlash",
  objective: "Berilgan yuklama bo'yicha to'g'ri marka",
  briefing:
    `Loyihalash bo'limi uchta obyekt bo'yicha transformator tanlashda yordam so'radi. Ikki transformatorli podstansiyada biri o'chganda ikkinchisi avariyaviy ortiqcha yuklanish (simulyatorda ${OVL} marta, tekshirilsin) bilan butun yuklamani olishi kerak. Ortiqcha zaxira ham iqtisodiy emas.`,
  kind: "switching",
  situation: { timeStart: "11:00", weather: "clear", season: "winter", ambientC: 5, loadFactor: 0.6 },
  orderRequired: false,
  messages: [
    notice("m1", "Uchta obyekt uchun transformator tanlab, markalarni izohlab bering.", {
      from: "Loyihalash bo'limi",
      report: { afterStep: "q4", text: "Tanlangan transformatorlar va markalar izohi yuborildi." },
    }),
  ],
  decisions: [
    {
      id: "q1",
      prompt: "110/10 kV podstansiya, hisobiy yuklama 20 MVA, 1-toifa iste'molchilar bor. Qaysi variant?",
      options: [
        { id: "a", text: "2 × ТДН-10000/110", why: "Biri o'chganda: 10 × 1,4 = 14 MVA < 20 MVA — yetmaydi." },
        { id: "b", text: "2 × ТДН-16000/110", correct: true },
        { id: "c", text: "2 × ТРДН-25000/110", why: "Normal rejimda yuklanish ~0,4 — ortiqcha zaxira, iqtisodiy emas." },
        { id: "d", text: "1 × ТДН-25000/110", why: "1-toifa uchun ikkita mustaqil manba (ikki transformator) kerak." },
      ],
    },
    {
      id: "q2",
      prompt: "35/10 kV podstansiya, 5 MVA, 2-toifa iste'molchilar, ikki transformator. Qaysi?",
      options: [
        { id: "a", text: "2 × ТМН-2500/35", why: "2,5 × 1,4 = 3,5 MVA < 5 MVA." },
        { id: "b", text: "2 × ТМН-4000/35", correct: true },
        { id: "c", text: "2 × ТМН-6300/35", why: "Ortiqcha zaxira." },
      ],
    },
    {
      id: "q3",
      prompt: "10/0,4 kV TP, 3-toifa iste'molchilar, 850 kVA, bitta transformator. Qaysi?",
      options: [
        { id: "a", text: "ТМГ-630/10", why: "630 kVA < 850 kVA — doimiy ortiqcha yuklanish." },
        { id: "b", text: "ТМГ-1000/10", correct: true },
        { id: "c", text: "ТМ-1600/10", why: "Yuklanish ~0,5 — ortiqcha, salt yurish isrofi katta." },
      ],
    },
    {
      id: "q4",
      prompt: "ТРДН-25000/110 markasini o'qing:",
      options: [
        { id: "a", text: "T — uch fazali, R — past kuchlanish o'rami ikkiga bo'lingan, D — moy + havo puflash, N — RPN; 25000 kVA, YK 110 kV", correct: true },
        { id: "b", text: "T — transformator, R — reaktor, D — ikki o'ramli, N — nominal; 25000 kVA, 110 kV", why: "R — ikki parchali (bo'lingan) o'ram, D — sovutish turi, N — yuklama ostida rostlash." },
        { id: "c", text: "T — tok transformatori, R — RPN, D — differensial himoya, N — neytral", why: "Bu kuch transformatori markasi; harflar tur, o'ram, sovutish va rostlashni bildiradi." },
      ],
    },
  ],
  steps: [
    { id: "q1", label: "1-obyekt: 110/10 kV, 20 MVA", match: { type: "choice", decisionId: "q1" }, explain: "N-1 sharti: bitta transformator avariyaviy ortiqcha yuklanish bilan butun yuklamani oladi." },
    { id: "q2", label: "2-obyekt: 35/10 kV, 5 MVA", match: { type: "choice", decisionId: "q2" }, explain: "Xuddi shu N-1 hisobi." },
    { id: "q3", label: "3-obyekt: 10/0,4 kV TP, 850 kVA", match: { type: "choice", decisionId: "q3" }, explain: "Bitta transformatorda — yaqin standart quvvat." },
    { id: "q4", label: "Markani o'qish: ТРДН-25000/110", match: { type: "choice", decisionId: "q4" }, explain: "Marka harflari: fazalar soni, o'ram, sovutish, rostlash." },
    reportStep("report", "m1", ["q1", "q2", "q3", "q4"], "Javobni yuborish"),
  ],
  analysis:
    "Transformator quvvati yuklama va ishonchlilik toifasiga qarab tanlanadi: ikki transformatorli podstansiyada biri o'chganda ikkinchisi avariyaviy ortiqcha yuklanish bilan butun yuklamani olishi kerak; ortiqcha zaxira salt yurish isroflari va narx tufayli iqtisodiy emas. Marka: Т — uch fazali, Р — ikki parchali o'ram, М/Д/ДЦ/Ц — sovutish, Н — RPN, Г — germetik; raqamlar — quvvat (kVA) va YK kuchlanishi (kV). Batafsil — markalar ensiklopediyasida (6-bosqich).",
};
