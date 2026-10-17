import type { ScenarioDef } from "../../engine/scenario";

// Kun davomida uchta buyruq: har birini bajarib, jurnalga to'g'ri yozish kerak.
export const S04: ScenarioDef = {
  id: "S04",
  level: 1,
  title: "Dispetcherlik jurnalini yuritish",
  objective: "Kun davomida bir nechta buyruqni bajarish va jurnalga to'g'ri yozish",
  briefing:
    "Kun davomida dispetcherdan bir nechta buyruq keladi. Har birini qaytarib o'qing, bajaring va operativ jurnalga yozing: vaqt, buyruq kimdan, mazmuni, nima bajarildi (uskuna nomlari aniq, bajarilish tartibida) va bajaruvchi. Keyin dispetcherga hisobot bering.",
  kind: "journal",
  situation: { timeStart: "09:00", weather: "clear", season: "summer", ambientC: 30, loadFactor: 0.75 },
  orderRequired: true,
  allowedOutages: ["L-F10-4", "L-F35-2"],
  messages: [
    {
      id: "m1",
      trigger: "start",
      from: "Dispetcher",
      text: "Yangiobod PS. F10-4 fiderini ta'mirga o'chiring: Q-F10-4 ni o'chiring, QS-F10-4B aravachasini ta'mir holatiga chiqaring. Iste'molchilar ogohlantirilgan.",
      isOrder: true,
      readback: {
        prompt: "Buyruqni qaytarib o'qing:",
        options: [
          { id: "ok", text: "Tushundim: Q-F10-4 ni o'chiraman, so'ng QS-F10-4B ni ajrataman.", correct: true },
          { id: "rev", text: "Tushundim: QS-F10-4B ni ajrataman, so'ng Q-F10-4 ni o'chiraman.", correct: false, why: "Tartib teskari: ajratkich (aravacha) yuklama ostida ajratilmaydi — avval o'chirgich." },
        ],
      },
      expectsReport: { afterStep: "j1", text: "F10-4 o'chirildi va ajratildi, jurnalga yozildi." },
    },
    {
      id: "m2",
      trigger: { afterStep: "rep1" },
      at: "11:30",
      from: "Dispetcher",
      text: "Yangiobod PS. F10-4 dagi ishlar tugadi, naryad yopilgan. F10-4 ni ishga tushiring.",
      isOrder: true,
      readback: {
        prompt: "Buyruqni qaytarib o'qing:",
        options: [
          { id: "ok", text: "Tushundim: QS-F10-4B ni ulayman, so'ng Q-F10-4 ni ulayman.", correct: true },
          { id: "rev", text: "Tushundim: Q-F10-4 ni ulayman, so'ng QS-F10-4B ni ulayman.", correct: false, why: "Ulashda ham ajratkich (aravacha) avval, o'chirgich keyin — aks holda ajratkich yuklamani ulaydi." },
        ],
      },
      expectsReport: { afterStep: "j2", text: "F10-4 ishga tushirildi, jurnalga yozildi." },
    },
    {
      id: "m3",
      trigger: { afterStep: "rep2" },
      at: "15:00",
      from: "Dispetcher",
      text: "Yangiobod PS. Iste'molchi talabi bilan 35 kV F35-2 liniyasini o'chiring va ikki tomondan ajrating.",
      isOrder: true,
      readback: {
        prompt: "Buyruqni qaytarib o'qing:",
        options: [
          { id: "ok", text: "Tushundim: Q-F35-2 ni o'chiraman, QS-F35-2L va QS-F35-2B ajratkichlarini ochaman.", correct: true },
          { id: "wrong", text: "Tushundim: Q-F35-1 ni o'chiraman.", correct: false, why: "F35-1 boshqa liniya — uskuna nomini aniq takrorlang." },
        ],
      },
      expectsReport: { afterStep: "j3", text: "F35-2 o'chirildi va ajratildi, jurnalga yozildi." },
    },
  ],
  steps: [
    { id: "rb1", label: "09:00 buyrug'ini qaytarib o'qish", match: { type: "readback", messageId: "m1" }, explain: "Har bir buyruq qaytarib o'qiladi." },
    { id: "a1", label: "Q-F10-4 ni o'chirish", match: { type: "switch", deviceId: "Q-F10-4", to: "open" }, after: ["rb1"], explain: "Yuklamani o'chirgich uzadi." },
    { id: "a2", label: "QS-F10-4B (aravacha) ni ajratish", match: { type: "switch", deviceId: "QS-F10-4B", to: "open" }, after: ["a1"], explain: "Ko'rinadigan uzilish faqat o'chirgich o'chgandan keyin." },
    { id: "j1", label: "Jurnalga yozish (1-buyruq)", match: { type: "journal" }, after: ["a2"], explain: "Vaqt, uskuna nomlari bajarilish tartibida, bajaruvchi." },
    { id: "rep1", label: "Dispetcherga hisobot (1-buyruq)", match: { type: "report", messageId: "m1" }, after: ["j1"], explain: "Bajarilgach darhol hisobot." },
    { id: "rb2", label: "11:30 buyrug'ini qaytarib o'qish", match: { type: "readback", messageId: "m2" }, after: ["rep1"], explain: "Har bir buyruq qaytarib o'qiladi." },
    { id: "b1", label: "QS-F10-4B ni ulash", match: { type: "switch", deviceId: "QS-F10-4B", to: "closed" }, after: ["rb2"], explain: "Ulashda avval ajratkich (o'chirgich ochiq — tok yo'q)." },
    { id: "b2", label: "Q-F10-4 ni ulash", match: { type: "switch", deviceId: "Q-F10-4", to: "closed" }, after: ["b1"], explain: "Yuklamani o'chirgich ulaydi." },
    { id: "j2", label: "Jurnalga yozish (2-buyruq)", match: { type: "journal" }, after: ["b2"], explain: "Har buyruq alohida yozuv." },
    { id: "rep2", label: "Dispetcherga hisobot (2-buyruq)", match: { type: "report", messageId: "m2" }, after: ["j2"], explain: "Hisobot." },
    { id: "rb3", label: "15:00 buyrug'ini qaytarib o'qish", match: { type: "readback", messageId: "m3" }, after: ["rep2"], explain: "Har bir buyruq qaytarib o'qiladi." },
    { id: "c1", label: "Q-F35-2 ni o'chirish", match: { type: "switch", deviceId: "Q-F35-2", to: "open" }, after: ["rb3"], explain: "Avval o'chirgich." },
    { id: "c2", label: "QS-F35-2L (liniya tomoni) ni ochish", match: { type: "switch", deviceId: "QS-F35-2L", to: "open" }, after: ["c1"], explain: "Avval liniya tomonidagi ajratkich, keyin shina tomoni." },
    { id: "c3", label: "QS-F35-2B (shina tomoni) ni ochish", match: { type: "switch", deviceId: "QS-F35-2B", to: "open" }, after: ["c2"], explain: "Shina tomonidagi ajratkich oxirida." },
    { id: "j3", label: "Jurnalga yozish (3-buyruq)", match: { type: "journal" }, after: ["c3"], explain: "Har buyruq alohida yozuv." },
    { id: "rep3", label: "Dispetcherga hisobot (3-buyruq)", match: { type: "report", messageId: "m3" }, after: ["j3"], explain: "Hisobot." },
  ],
  journal: { required: true },
  analysis:
    "Operativ jurnal — smenaning asosiy hujjati. Har bir yozuvda: aniq vaqt, buyruq kim tomonidan berilgani, mazmuni, bajarilgan amallar (uskuna nomlari sxemadagidek, bajarilish tartibida) va bajaruvchi. Noto'g'ri yozilgan uskuna nomi keyingi smenani chalg'itadi va xavfli xatoga olib kelishi mumkin.",
};
