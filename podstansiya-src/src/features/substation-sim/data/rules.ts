// Simulyator "qonunlari"ning sozlanadigan qismi: qoidabuzarlik jiddiyligi, jarimalar, rejimlar
// va kommutatsiya tartibi. Mahalliy yo'riqnoma boshqacha bo'lsa — shu faylni o'zgartiring,
// engine kodi o'zgarmaydi.

import type { GameMode, Severity } from "../engine/types";

/** Har bir qoida kodi uchun jiddiylik. "critical" — avariya yoki odamga xavf: stsenariy to'xtaydi. */
export const SEVERITY: Record<string, Severity> = {
  // Ajratkich yuklama ostida ochildi/ulandi — elektr yoyi
  disconnectorUnderLoad: "critical",
  // Ajratkich salt transformatorni (magnitlanish toki) kommutatsiya qildi. PTE ma'lum quvvatgacha
  // ruxsat beradi; 25 MVA 110 kV transformator uchun — ruxsat yo'q deb olingan (tekshirilsin).
  disconnectorMagnetizing: "critical",
  // Ajratkich parallel zanjirni (aylanma tok) uzdi/ulab qo'ydi — shuntlash shartlari tekshirilmagan
  disconnectorLoop: "violation",
  // Kuchlanish ostidagi uchastkaga yerlagich — qisqa tutashuv
  earthOnLive: "critical",
  // Kuchlanish yo'qligi tekshirilmay yerlagich ulandi (5.3-bo'lim talabi bo'yicha — kritik)
  earthWithoutVerify: "critical",
  // Yerlangan uchastkaga kuchlanish berildi — qisqa tutashuv
  energizeEarthed: "critical",
  // Yerlagich ulangan holda kuchlanishsiz uchastkalarni ulash (mexanik blokirovka buzilishi)
  closeOntoEarthedDead: "violation",
  // Brigada ishlayotgan joyga kuchlanish berishi mumkin bo'lgan kommutatsiya
  switchDuringWork: "critical",
  removeEarthDuringWork: "critical",
  // "Ulamang — odamlar ishlamoqda" plakati osilgan uskunani ulash
  switchPostered: "violation",
  // Dispetcher buyrug'isiz kommutatsiya
  switchWithoutOrder: "violation",
  // Naryad-ruxsatnomasiz yoki tayyorlanmagan joyga ruxsat (dopusk)
  admitWithoutPermit: "violation",
  admitNotPrepared: "violation",
  permitIncomplete: "violation",
  permitLivePartsWrong: "violation",
  // Ish hali bajarilmay turib "bajarildi" deb hisobot berish
  reportEarly: "violation",
  // Brigada olib chiqilmay naryad yopildi va h.k.
  finishWithoutAdmit: "info",
  // RPN
  rpnBusy: "info",
  rpnLimit: "info",
  rpnBlockedHighCurrent: "info",
  // Tartib va ortiqcha amallar
  wrongOrder: "violation",
  extraneous: "violation",
  readbackWrong: "violation",
};

/** Jarima ballari (o'yin qoidasi, me'yor emas). */
export const PENALTY = {
  critical: 100,
  /** O'qitish/sinov rejimida to'silgan kritik urinish */
  blockedCritical: 25,
  violation: 15,
  wrongOrder: 10,
  extraneous: 5,
  readbackWrong: 5,
  missingStep: 10,
  missingOptional: 0,
  journalMissing: 10,
  journalTime: 3,
  journalNames: 3,
  journalOrder: 3,
  journalExecutor: 2,
  lostConsumer: { 1: 20, 2: 8, 3: 3 } as Record<number, number>,
  hint: 1,
  info: 0,
} as const;

export const STAR_THRESHOLDS = { three: 90, two: 70, one: 50 } as const;

/** Rejim xususiyatlari: qaysi jiddiylikdagi xato harakat to'siladi va maslahat darajasi. */
export const MODE_RULES: Record<GameMode, { block: Severity[]; hints: "full" | "limited" | "none"; explainImmediately: boolean }> = {
  training: { block: ["critical", "violation"], hints: "full", explainImmediately: true },
  practice: { block: ["critical"], hints: "limited", explainImmediately: true },
  exam: { block: [], hints: "none", explainImmediately: false },
};

/**
 * Kommutatsiya tartibi (5.2-bo'lim). Mahalliy yo'riqnomaga qarab o'zgartirilishi mumkin —
 * data/procedures.ts shu sozlama asosida stsenariy qadamlarini quradi.
 */
export const SWITCHING_ORDER = {
  outage: {
    /** O'chirgichlar: avval past (yuklama) tomoni, keyin yuqori kuchlanish */
    breakers: ["10", "35", "110"] as const,
    /** Ajratkichlar har tomonda: avval transformator tomoni, keyin shina tomoni */
    disconnectors: ["equipment", "bus"] as const,
    /** O'chirgichning ochiqligini joyida tekshirish — tavsiya etilgan qadam (ixtiyoriy) */
    checkBreakerPosition: true,
  },
  energize: {
    /** Ajratkichlar: avval shina tomoni, keyin transformator tomoni */
    disconnectors: ["bus", "equipment"] as const,
    /** O'chirgichlar: avval manba (yuqori kuchlanish) tomoni — salt yurish, keyin yuklama tomoni */
    breakers: ["110", "35", "10"] as const,
  },
} as const;
