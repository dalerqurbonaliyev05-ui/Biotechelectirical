// Yutuqlar ro'yxati va ularning shartlari (o'yin qoidalari — me'yor emas).

export interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

/** Shartlardagi sonlar — o'yin qoidalari */
export const ACHIEVEMENT_RULES = {
  /** "Tez dispetcher": stsenariyni shu vaqtdan (real soniya) tez va kamida 2 yulduz bilan bajarish */
  fastSec: 300,
  fastMinStars: 2,
  /** "Uch yulduz kolleksiyasi": shuncha stsenariyda 3 yulduz */
  threeStarCount: 10,
  /** "Jurnal ustasi": jurnal talab qilingan shuncha stsenariy jurnal xatosiz */
  journalCleanCount: 5,
  /** Imtihon rejimida kamida shuncha yulduz */
  examMinStars: 2,
  /** Smena rejimi (S21) uchun kamida shuncha yulduz */
  shiftMinStars: 2,
  /** Viktorina: kamida shuncha to'g'ri javob (10 tadan) */
  quizMin: 9,
  /** Laborant: moy va gaz mini-o'yinlarida kamida shuncha ball */
  labMin: 80,
} as const;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "firstShift", icon: "🎓", title: "Birinchi smena", desc: "Istalgan stsenariyni muvaffaqiyatli yakunlang." },
  { id: "flawless", icon: "✨", title: "Xatosiz smena", desc: "Stsenariyni birorta jarimasiz (100 ball) yakunlang." },
  { id: "fastDispatcher", icon: "⚡", title: "Tez dispetcher", desc: `Stsenariyni ${ACHIEVEMENT_RULES.fastSec / 60} daqiqadan tez va kamida ${ACHIEVEMENT_RULES.fastMinStars} yulduz bilan bajaring.` },
  { id: "journalMaster", icon: "📒", title: "Jurnal ustasi", desc: `Operativ jurnal talab qilingan ${ACHIEVEMENT_RULES.journalCleanCount} ta stsenariyni jurnal xatolarisiz bajaring.` },
  { id: "examPassed", icon: "📝", title: "Imtihon topshirildi", desc: `Imtihon rejimida stsenariyni kamida ${ACHIEVEMENT_RULES.examMinStars} yulduz bilan yakunlang.` },
  { id: "allLevels", icon: "🪜", title: "Barcha darajalar", desc: "Har bir darajadan (1–4) kamida bitta stsenariyni bajaring." },
  { id: "threeStars", icon: "🌟", title: "Uch yulduz kolleksiyasi", desc: `${ACHIEVEMENT_RULES.threeStarCount} ta stsenariyda 3 yulduz to'plang.` },
  { id: "shiftMaster", icon: "🕗", title: "Smena ustasi", desc: `Smena rejimini (S21) kamida ${ACHIEVEMENT_RULES.shiftMinStars} yulduz bilan yakunlang.` },
  { id: "emergency", icon: "🚒", title: "Favqulodda vaziyatda sovuqqon", desc: "«Transformatorda yong'in» (S16) stsenariysini muvaffaqiyatli yakunlang." },
  { id: "chief", icon: "🏅", title: "Podstansiya boshlig'i", desc: "Barcha stsenariylarni bajaring." },
  { id: "inspector", icon: "👁", title: "Diqqatli ko'rikchi", desc: "Obxod mini-o'yinida barcha nosozliklarni ortiqcha belgisiz toping." },
  { id: "meggerPro", icon: "📟", title: "Megger ustasi", desc: "Megger mini-o'yinini xatosiz bajaring." },
  { id: "labTech", icon: "🧪", title: "Laborant", desc: `Moy sinovi va gaz relesi mini-o'yinlarida kamida ${ACHIEVEMENT_RULES.labMin} ball oling.` },
  { id: "markExpert", icon: "🔤", title: "Marka bilimdoni", desc: `Markalar viktorinasida kamida ${ACHIEVEMENT_RULES.quizMin} ta to'g'ri javob bering.` },
];
