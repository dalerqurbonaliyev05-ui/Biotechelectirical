import type { ScenarioDef, StepDef } from "../../engine/scenario";
import { transformerOutageSteps } from "../procedures";

const ORDER = "m1";

const steps: StepDef[] = [
  {
    id: "readback",
    label: "Dispetcher buyrug'ini qaytarib o'qish va qabul qilish",
    match: { type: "readback", messageId: ORDER },
    explain: "Buyruq qaytarib o'qiladi — dispetcher noto'g'ri tushunilmaganiga ishonch hosil qiladi.",
  },
  {
    id: "permit",
    label: "Naryad-ruxsatnomani to'ldirish (ish, brigada, kuchlanish ostida qoladigan qismlar, choralar)",
    match: { type: "permitIssue" },
    after: ["readback"],
    explain: "Transformatordagi ish naryad-ruxsatnoma bo'yicha bajariladi: unda xavfsizlik choralari va kuchlanish ostida qoladigan qismlar aniq yoziladi.",
  },
  {
    id: "sv10",
    label: "Q-SV10 ni ulash — 10 kV yuklamani T-2 ga o'tkazish",
    match: { type: "switch", deviceId: "Q-SV10", to: "closed" },
    after: ["readback"],
    explain: "Iste'molchilar uzilmasligi uchun yuklama oldindan zaxiraga (T-2) o'tkaziladi. SV ulangach T-1 ning 10 kV o'chirgichi yuklamasiz uziladi.",
    hint: "Seksiya o'chirgichi 10 kV shinalar orasida.",
  },
  {
    id: "sv35",
    label: "Q-SV35 ni ulash — 35 kV yuklamani T-2 ga o'tkazish",
    match: { type: "switch", deviceId: "Q-SV35", to: "closed" },
    after: ["readback"],
    explain: "35 kV iste'molchilar ham uzilmasligi uchun SV-35 ulanadi.",
    hint: "35 kV SV sxemaning eng pastida.",
  },
  ...transformerOutageSteps("T-1", { "10": ["sv10"], "35": ["sv35"] }),
  {
    id: "journal",
    label: "Operativ jurnalga bajarilgan kommutatsiyalarni yozish",
    match: { type: "journal" },
    after: ["earth-110", "earth-35", "earth-10"],
    explain: "Har bir kommutatsiya vaqti, uskuna nomi va bajaruvchi bilan jurnalga yoziladi — bu keyingi smena va tekshiruv uchun asosiy hujjat.",
  },
  {
    id: "admit",
    label: "Brigadani naryad bo'yicha ishga qo'yish (dopusk)",
    match: { type: "admit" },
    after: ["permit", "poster-work", "poster-QS-110B", "poster-QS-35B", "poster-QS-10B"],
    explain: "Dopuskdan oldin tayyorlangan ish joyi brigada bilan birga tekshiriladi: yerlagichlar, plakatlar, to'siqlar.",
  },
  {
    id: "report",
    label: "Dispetcherga bajarilganini hisobot qilish",
    match: { type: "report", messageId: ORDER },
    after: ["journal", "admit"],
    explain: "Buyruq bajarilgani darhol dispetcherga xabar qilinadi.",
  },
];

export const S02: ScenarioDef = {
  id: "S02",
  level: 1,
  title: "Transformatorni rejali ta'mirga chiqarish",
  objective: "To'g'ri kommutatsiya, yerlash, plakat, naryad-ruxsatnoma, jurnal",
  briefing:
    "Bugun T-1 transformatorida rejali ta'mir (moy tizimidagi ish) bor. Iste'molchilarni uzmasdan yuklamani T-2 ga o'tkazing, T-1 ni uch tomondan o'chiring, ko'rinadigan uzilish yarating, kuchlanish yo'qligini tekshirib yerlang, plakatlar osing, naryad bo'yicha brigadani ishga qo'ying va jurnalni to'ldiring.",
  kind: "switching",
  situation: { timeStart: "09:00", weather: "clear", season: "spring", ambientC: 18, loadFactor: 0.8 },
  orderRequired: true,
  messages: [
    {
      id: ORDER,
      trigger: "start",
      from: "Dispetcher",
      text: "Yangiobod PS. T-1 transformatorini rejali ta'mirga chiqaring. 10 va 35 kV yuklamani seksiya o'chirgichlari orqali T-2 ga o'tkazing, T-1 ni uch tomondan o'chiring va yerlang. Bajarilgach xabar bering.",
      isOrder: true,
      readback: {
        prompt: "Buyruqni qaytarib o'qing:",
        options: [
          {
            id: "ok",
            text: "Tushundim: yuklamani Q-SV10 va Q-SV35 orqali T-2 ga o'tkazaman, T-1 ni 10, 35, 110 kV tomonlardan o'chirib, uch tomondan yerlayman. Bajaraman.",
            correct: true,
          },
          {
            id: "t2",
            text: "Tushundim: T-2 ni ta'mirga chiqaraman, yuklamani T-1 ga o'tkazaman.",
            correct: false,
            why: "Buyruq T-1 haqida. Uskuna nomini adashtirish — eng xavfli xatolardan biri.",
          },
          {
            id: "noload",
            text: "Tushundim: T-1 ni o'chiraman, yuklamani o'tkazish shart emas.",
            correct: false,
            why: "Buyruqda yuklamani T-2 ga o'tkazish aniq aytilgan — aks holda iste'molchilar (shu jumladan kasalxona) uziladi.",
          },
        ],
      },
      expectsReport: {
        afterStep: "admit",
        text: "T-1 ta'mirga chiqarildi: yuklama T-2 da, T-1 uch tomondan o'chirilgan va yerlangan, brigada naryad bo'yicha ishga qo'yildi.",
      },
    },
  ],
  steps,
  goals: [
    { type: "loadsSupplied", loadIds: ["L-F35-1", "L-F35-2", "L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] },
    { type: "device", deviceId: "QSG-T1-110", pos: "closed" },
    { type: "device", deviceId: "QSG-T1-35", pos: "closed" },
    { type: "device", deviceId: "QSG-T1-10", pos: "closed" },
  ],
  journal: { required: true },
  permit: {
    workName: "T-1 transformatorini rejali ta'mirlash",
    workZone: {
      earthSwitches: ["QSG-T1-110", "QSG-T1-35", "QSG-T1-10"],
      posters: [
        { targetId: "QS-T1-110B", poster: "doNotSwitch" },
        { targetId: "QS-T1-35B", poster: "doNotSwitch" },
        { targetId: "QS-T1-10B", poster: "doNotSwitch" },
        { targetId: "T-1", poster: "workHere" },
      ],
    },
    liveParts: ["B110-1", "B35-1", "B10-1"],
  },
  analysis:
    "To'g'ri tartib: buyruqni qaytarib o'qish → yuklamani zaxiraga o'tkazish (SV) → o'chirgichlar (avval 10 va 35 kV, keyin 110 kV) → ajratkichlar (har tomonda avval transformator, keyin shina tomoni) → kuchlanish yo'qligini tekshirish → uch tomondan yerlash → plakatlar → naryad va dopusk → jurnal → hisobot. Ajratkichni o'chirgichdan oldin ochish — yuklama ostida yoy va avariya; kuchlanishni tekshirmay yerlash — qisqa tutashuv xavfi.",
};
