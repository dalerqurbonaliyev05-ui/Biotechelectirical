import type { ScenarioDef, StepDef } from "../../engine/scenario";
import { transformerEnergizeSteps } from "../procedures";

const ORDER = "m1";

const steps: StepDef[] = [
  {
    id: "readback",
    label: "Dispetcher buyrug'ini qaytarib o'qish",
    match: { type: "readback", messageId: ORDER },
    explain: "Buyruq qaytarib o'qiladi.",
  },
  {
    id: "finishWork",
    label: "Ish tugaganini qabul qilish: brigadani olib chiqish, naryadni yopish",
    match: { type: "finishWork" },
    after: ["readback"],
    explain: "Brigada ish joyidan olib chiqilmaguncha va naryad yopilmaguncha yerlagich va plakatlar olinmaydi.",
  },
  ...transformerEnergizeSteps("T-1", "finishWork"),
  {
    id: "sv10-off",
    label: "Q-SV10 ni o'chirish — normal sxemaga qaytish",
    match: { type: "switch", deviceId: "Q-SV10", to: "open" },
    after: ["on-Q-10"],
    explain: "T-1 yuklamani olgach seksiya o'chirgichi o'chiriladi (normal holatda SV ochiq, ABR tayyor).",
  },
  {
    id: "sv35-off",
    label: "Q-SV35 ni o'chirish — normal sxemaga qaytish",
    match: { type: "switch", deviceId: "Q-SV35", to: "open" },
    after: ["on-Q-35"],
    explain: "35 kV ham normal sxemaga qaytariladi.",
  },
  {
    id: "journal",
    label: "Operativ jurnalga yozish",
    match: { type: "journal" },
    after: ["sv10-off", "sv35-off"],
    explain: "Ishga tushirish kommutatsiyalari jurnalga yoziladi.",
  },
  {
    id: "report",
    label: "Dispetcherga hisobot berish",
    match: { type: "report", messageId: ORDER },
    after: ["journal"],
    explain: "Bajarilgani haqida dispetcherga xabar beriladi.",
  },
];

// Boshlang'ich holat: T-1 ta'mirda (uch tomondan o'chirilgan va yerlangan), yuklama T-2 da.
const initialDevices = {
  "Q-T1-110": "open",
  "Q-T1-35": "open",
  "Q-T1-10": "open",
  "QS-T1-110T": "open",
  "QS-T1-110B": "open",
  "QS-T1-35T": "open",
  "QS-T1-35B": "open",
  "QS-T1-10T": "open",
  "QS-T1-10B": "open",
  "QSG-T1-110": "closed",
  "QSG-T1-35": "closed",
  "QSG-T1-10": "closed",
  "Q-SV10": "closed",
  "Q-SV35": "closed",
} as const;

export const S03: ScenarioDef = {
  id: "S03",
  level: 1,
  title: "Ta'mirdan so'ng transformatorni ishga tushirish",
  objective: "Teskari tartib: yerlagich va plakatlarni olish, ajratkich va o'chirgichlarni ulash",
  briefing:
    "T-1 dagi ta'mir tugadi, brigada boshlig'i ish tugaganini ma'lum qildi. Brigadani olib chiqing, naryadni yoping, plakat va yerlagichlarni oling, ajratkichlarni yoping, transformatorni avval 110 kV tomondan salt yurishda kuchlanishga qo'ying, keyin yuklamani oling va normal sxemaga qayting.",
  kind: "switching",
  situation: { timeStart: "15:30", weather: "clear", season: "spring", ambientC: 22, loadFactor: 0.8 },
  orderRequired: true,
  initial: {
    devices: { ...initialDevices },
    posters: { "QS-T1-110B": ["doNotSwitch"], "QS-T1-35B": ["doNotSwitch"], "QS-T1-10B": ["doNotSwitch"], "T-1": ["workHere"] },
    admitted: true,
  },
  messages: [
    {
      id: ORDER,
      trigger: "start",
      from: "Dispetcher",
      text: "Yangiobod PS. T-1 dagi ishlar tugagan bo'lsa, naryadni yoping, T-1 ni ishga tushiring va yuklamani normal sxema bo'yicha taqsimlang: Q-SV10, Q-SV35 o'chirilsin. Bajarilgach xabar bering.",
      isOrder: true,
      readback: {
        prompt: "Buyruqni qaytarib o'qing:",
        options: [
          {
            id: "ok",
            text: "Tushundim: naryadni yopib, yerlagichlarni olib, T-1 ni 110 kV tomondan ishga tushiraman, 35 va 10 kV yuklamani olaman, Q-SV10 va Q-SV35 ni o'chiraman.",
            correct: true,
          },
          {
            id: "fast",
            text: "Tushundim: T-1 ning barcha o'chirgichlarini darhol ulayman.",
            correct: false,
            why: "Avval naryad yopiladi, yerlagich va plakatlar olinadi — yerlangan transformatorga kuchlanish berish qisqa tutashuv.",
          },
        ],
      },
      expectsReport: { afterStep: "journal", text: "T-1 ishga tushirildi, sxema normal holatda." },
    },
  ],
  steps,
  goals: [
    { type: "device", deviceId: "Q-T1-110", pos: "closed" },
    { type: "device", deviceId: "Q-SV10", pos: "open" },
    { type: "device", deviceId: "Q-SV35", pos: "open" },
    { type: "loadsSupplied", loadIds: ["L-F35-1", "L-F35-2", "L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"] },
  ],
  journal: { required: true },
  analysis:
    "Ishga tushirish teskari tartibda: naryad yopiladi va brigada olib chiqiladi → plakatlar va yerlagichlar olinadi → ajratkichlar (avval shina tomoni) yopiladi → manba (110 kV) o'chirgichi ulanadi va transformator salt yurishda tekshiriladi → keyin 35 va 10 kV yuklama olinadi → seksiya o'chirgichlari o'chiriladi. Yerlagich ulangan transformatorga kuchlanish berish — kritik avariya. (Kerak bo'lsa, ishga tushirishdan oldin izolyatsiya o'lchanadi — 6-bosqichdagi megger mini-o'yinida.)",
};
