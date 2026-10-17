// BARCHA raqamli me'yorlar va model parametrlari shu yerda. Har biri:
//   value   — qiymat
//   unit    — birlik
//   verify  — true: o'qituvchi / amaldagi PTE, PUE, mahalliy yo'riqnoma bilan tekshirilishi SHART
//   note    — qayerdan olingani yoki nima uchun taxminiy ekani
//   kind    — "norm" (me'yoriy hujjatdagi qiymat) yoki "model" (simulyator soddalashtirishi)
// Tekshiruv ro'yxati: docs/TEKSHIRUV-RO'YXATI.md (har o'zgarishda yangilang).

export interface Norm<T = number> {
  value: T;
  unit: string;
  verify: boolean;
  note: string;
  kind: "norm" | "model";
}

const n = <T,>(value: T, unit: string, note: string, kind: Norm["kind"] = "norm", verify = true): Norm<T> => ({
  value,
  unit,
  verify,
  note,
  kind,
});

export type CoolingType = "M" | "D" | "DC" | "Ts";

/** Issiqlik modeli parametrlari (IEC 60076-7 eksponensial modeliga asoslangan, tipik qiymatlar). */
export interface ThermalParams {
  /** Nominal yuklamada qisqa tutashuv isrofi / salt yurish isrofi nisbati */
  R: Norm;
  /** Moy eksponenti */
  x: Norm;
  /** O'ram eksponenti */
  y: Norm;
  /** Nominal yuklamada yuqori qatlam moyining atrof muhitdan ortishi */
  topOilRiseK: Norm;
  /** Eng qizigan nuqta gradienti (o'ram − moy) nominal yuklamada */
  hotSpotGradientK: Norm;
  /** Moy vaqt doimiysi */
  tauOilMin: Norm;
  /** Yuqori qatlam moyining ruxsat etilgan eng yuqori harorati */
  topOilMaxC: Norm;
  /** Ogohlantiruvchi signal harorati (simulyator sozlamasi) */
  topOilAlarmC: Norm;
}

const IEC = "IEC 60076-7 (moyli transformatorlar yuklanish qo'llanmasi) tipik qiymatlariga yaqin; aniq transformator pasporti bo'yicha tekshirilsin";
const PTE_OIL = "Transformatorlarni ekspluatatsiya qilish yo'riqnomalarida (masalan, RD 34.46.501) keltirilgan yuqori qatlam moy harorati chegarasi";

export const THERMAL: Record<CoolingType, ThermalParams> = {
  M: {
    R: n(6, "—", IEC, "model"),
    x: n(0.8, "—", IEC, "model"),
    y: n(1.3, "—", IEC, "model"),
    topOilRiseK: n(52, "K", IEC, "model"),
    hotSpotGradientK: n(26, "K", IEC, "model"),
    tauOilMin: n(210, "daq", IEC, "model"),
    topOilMaxC: n(95, "°C", PTE_OIL),
    topOilAlarmC: n(85, "°C", "Signal sozlamasi — o'quv uchun tanlangan, mahalliy yo'riqnoma bo'yicha aniqlansin", "model"),
  },
  D: {
    R: n(6, "—", IEC, "model"),
    x: n(0.8, "—", IEC, "model"),
    y: n(1.3, "—", IEC, "model"),
    topOilRiseK: n(52, "K", IEC, "model"),
    hotSpotGradientK: n(26, "K", IEC, "model"),
    tauOilMin: n(150, "daq", IEC, "model"),
    topOilMaxC: n(95, "°C", PTE_OIL),
    topOilAlarmC: n(85, "°C", "Signal sozlamasi — o'quv uchun tanlangan, mahalliy yo'riqnoma bo'yicha aniqlansin", "model"),
  },
  DC: {
    R: n(6, "—", IEC, "model"),
    x: n(1.0, "—", IEC, "model"),
    y: n(1.3, "—", IEC, "model"),
    topOilRiseK: n(56, "K", IEC, "model"),
    hotSpotGradientK: n(22, "K", IEC, "model"),
    tauOilMin: n(90, "daq", IEC, "model"),
    topOilMaxC: n(75, "°C", `${PTE_OIL} (DC uchun)`),
    topOilAlarmC: n(70, "°C", "Signal sozlamasi — o'quv uchun tanlangan", "model"),
  },
  Ts: {
    R: n(6, "—", IEC, "model"),
    x: n(1.0, "—", IEC, "model"),
    y: n(1.3, "—", IEC, "model"),
    topOilRiseK: n(56, "K", IEC, "model"),
    hotSpotGradientK: n(22, "K", IEC, "model"),
    tauOilMin: n(90, "daq", IEC, "model"),
    topOilMaxC: n(70, "°C", `${PTE_OIL} (Ts — sovutgichga kirishdagi moy)`),
    topOilAlarmC: n(65, "°C", "Signal sozlamasi — o'quv uchun tanlangan", "model"),
  },
};

export const NORMS = {
  // ---- Sovutish (D tipi) ----
  fanAutoOnOilC: n(55, "°C", "D sovutishli transformatorda ventilyatorlar avtomatik yoqiladigan moy harorati (yo'riqnomalarda tipik qiymat)"),
  fanAutoOnLoadFactor: n(1.0, "× Inom", "D sovutishda ventilyatorlar avtomatik yoqiladigan yuklama (nominal tok) — tipik qiymat"),
  fanOffRatingFactor: n(
    0.6,
    "× Snom",
    "Ventilyatorlar o'chiq bo'lganda D transformatorning issiqlik jihatidan ekvivalent quvvati. TAXMINIY — pasport/ishlab chiqaruvchi ma'lumoti bo'yicha aniqlansin",
    "model",
  ),
  // ---- Izolyatsiya eskirishi ----
  agingRefHotSpotC: n(98, "°C", "Termik yaxshilanmagan qog'oz uchun nisbiy eskirish tezligi 1 bo'lgan harorat (IEC 60076-7)"),
  agingDoublingK: n(6, "K", "Har 6 K da eskirish tezligi ikki barobar (Montsinger qoidasi, IEC 60076-7)"),
  ambientDefaultC: n(25, "°C", "Stsenariy berilmaganda atrof havo harorati", "model", false),

  // ---- RPN ----
  rpn110Steps: n(9, "pog'ona (±)", "110 kV RPN: ±9 pog'ona (masalan TDN/TDTN-110 seriyasi)"),
  rpn110StepPct: n(1.78, "%", "110 kV RPN pog'onasi"),
  rpn35Steps: n(6, "pog'ona (±)", "35 kV RPN: ±6 pog'ona (masalan TMN-35 seriyasi; ba'zi turlarida ±8)"),
  rpn35StepPct: n(1.5, "%", "35 kV RPN pog'onasi"),
  rpnStepTimeSec: n(
    6,
    "s",
    "RPN mexanizmining bir pog'onaga o'tish vaqti + pauza (simulyatorda keyingi buyruq shu vaqtdan keyin qabul qilinadi). Turiga qarab farq qiladi",
    "model",
  ),
  rpnBlockLoadFactor: n(1.2, "× Inom", "Yuqori tokda RPN blokirovkasi sozlamasi — tipik, himoya sozlamalari kartasi bo'yicha aniqlansin"),
  /** Yuklama ostida kuchlanish pasayishi: nominal yuklamada transformatordagi ΔU, %. */
  loadDropAtNominalPct: n(4, "%", "Nominal yuklamada transformator va shinagacha kuchlanish pasayishi — soddalashtirilgan model", "model"),
  powerFactor: n(0.9, "cos φ", "Iste'molchilarning o'rtacha quvvat koeffitsienti — model", "model"),

  // ---- Parallel ishlash shartlari (5.7) ----
  parallelRatioDiffPct: n(0.5, "%", "Transformatsiya koeffitsientlari farqi chegarasi (PTE/darsliklarda keltiriladigan tipik qiymat ±0,5%)"),
  parallelUkDiffPct: n(10, "% (nisbiy)", "Qisqa tutashuv kuchlanishlari uk% farqi chegarasi (o'rtachadan ±10%)"),
  parallelMaxPowerRatio: n(3, "marta", "Parallel transformatorlar quvvatlari nisbati chegarasi (1:3)"),

  // ---- Kuchlanish sifati ----
  voltageDeviationPct: n(10, "%", "Iste'molchi qisqichlarida ruxsat etilgan kuchlanish og'ishi (O'z DSt / GOST 32144 tipidagi standartlar) — amaldagi standart bo'yicha tekshirilsin"),

  // ---- Yerga tutashuv (6–35 kV) ----
  earthFaultMaxDurationMin: n(
    120,
    "daq",
    "Izolyatsiyalangan neytralli 6–35 kV tarmoqda bir fazali yerga tutashuv bilan ishlash muddati. Manbalarda va mahalliy yo'riqnomalarda turlicha — ALBATTA tekshirilsin",
  ),
  // ---- APV (110 kV) ----
  apvSuccessProbability: n(0.7, "ehtimollik", "APV muvaffaqiyatli bo'lish ehtimoli — o'yin modeli parametri (statistik ma'lumot emas)", "model"),

  // ---- Naryad-ruxsatnoma (1000 V dan yuqori elektr qurilmalari) ----
  permitIssuerMinGroup: n(5, "guruh", "Naryad beruvchining elektr xavfsizligi guruhi — mehnat muhofazasi qoidalari bo'yicha tekshirilsin"),
  permitAdmitterMinGroup: n(4, "guruh", "Ruxsat beruvchi (operativ xodim) guruhi, 1000 V dan yuqori — tekshirilsin"),
  permitLeaderMinGroup: n(5, "guruh", "Ishlar rahbari guruhi — tekshirilsin"),
  permitProducerMinGroup: n(4, "guruh", "Ishlarni bajaruvchi guruhi, 1000 V dan yuqori — tekshirilsin"),
  permitMemberMinGroup: n(3, "guruh", "Brigada a'zosining eng past guruhi (simulyatorda; qoidalarda II guruhli a'zo ham ruxsat etiladigan holatlar bor) — tekshirilsin"),
  permitBrigadeMinSize: n(2, "kishi", "Brigada tarkibi: bajaruvchi bilan birga kamida — tekshirilsin"),

  // ---- Izolyatsiya o'lchovi (megger) ----
  absorptionMin: n(1.3, "R60/R15", "Absorbsiya koeffitsientining eng kichik qiymati (moyli transformator o'ramlari, ~10–30 °C) — sinov me'yorlari bo'yicha tekshirilsin"),
  insulationFactoryRatioMin: n(0.7, "× zavod R60", "R60 zavod (pasport) qiymatining kamida shu ulushi bo'lishi (bir xil haroratga keltirilgan) — sinov me'yorlari bo'yicha tekshirilsin"),

  // ---- Ortiqcha yuklash va himoya ----
  emergencyOverloadTable: n(
    [
      { k: 1.3, minutes: 120 },
      { k: 1.45, minutes: 80 },
      { k: 1.6, minutes: 45 },
      { k: 1.75, minutes: 20 },
      { k: 2.0, minutes: 10 },
    ],
    "K → daq",
    "Moyli transformatorlarning avariyaviy ortiqcha yuklanishi (PTE dagi jadvalga o'xshash tipik qiymatlar: 30% — 120 daq, 45% — 80, 60% — 45, 75% — 20, 100% — 10). ALBATTA tekshirilsin",
  ),
  overloadAlarmFactor: n(1.0, "× Snom", "Ortiqcha yuklanish signali (nominaldan yuqori)", "model"),
  overheatFailMarginK: n(
    10,
    "K",
    "Yuqori qatlam moyi ruxsat etilgan chegaradan shuncha oshsa — simulyatorda avariya (izolyatsiya shikastlanishi). Model parametri",
    "model",
  ),
  transformerSelectionOverload: n(
    1.4,
    "× Snom",
    "Ikki transformatorli podstansiyada bittasi o'chganda ikkinchisining ruxsat etilgan ortiqcha yuklanishi (marka tanlashda) — tekshirilsin",
  ),

  // ---- Transformator moyi (ishlayotgan, 110 kV) ----
  oilBreakdownMinKv: n(35, "kV", "Ishlayotgan transformator moyining probiv kuchlanishi chegarasi (110 kV sinf) — moy sinovi me'yorlari bo'yicha tekshirilsin"),
  oilMoistureMaxPpm: n(25, "g/t", "Ishlayotgan moydagi namlik chegarasi (110 kV sinf) — tekshirilsin"),
  oilAcidMax: n(0.25, "mg KOH/g", "Kislota soni chegarasi (ishlayotgan moy) — tekshirilsin"),

  // ---- Yangi transformatorni ishga tushirish ----
  energizeShocks: n(3, "marta", "Yangi transformatorni nominal kuchlanishga zarba bilan ulash soni (manbalarda 3–5 marta) — tekshirilsin"),
  noLoadObservationMin: n(30, "daq", "Birinchi ulashdan keyin salt yurishda kuzatish davomiyligi — tekshirilsin"),

  // ---- Iqtisodiy zarar (shartli) ----
  outageCostPerMwMin: n({ 1: 50, 2: 20, 3: 5 }, "shartli birlik / (MVt·daq)", "Iste'molchi toifasi bo'yicha uzilish zarari — o'yin modeli (haqiqiy tarif emas)", "model", false),

  // ---- Favqulodda xizmatlar ----
  fireServiceNumber: n("101", "tel.", "O'zbekistonda yong'in xizmati raqami"),

  // ---- O'yin vaqt modeli (simulyatsiya soati) ----
  actionDurationSec: n(
    { switch: 60, verifyDead: 120, checkPosition: 60, poster: 60, permitIssue: 600, admit: 300, finishWork: 300, journal: 120, report: 60, readback: 30, inspect: 30, tap: 0, fans: 30, blankSubmit: 300, protocol: 900, choice: 30, measure: 600, task: 0, call: 60, phasing: 600, wait: 0 },
    "s",
    "Har amal simulyatsiya soatini qancha oldinga suradi — o'yin modeli",
    "model",
    false,
  ),
  protocolValueTolerancePct: n(2, "%", "Protokolga yozilgan qiymat va asbob ko'rsatkichi farqiga ruxsat — o'yin qoidasi", "model", false),
  journalTimeToleranceMin: n(10, "daq", "Jurnal yozuvidagi vaqt va amal vaqti farqiga ruxsat — o'yin qoidasi", "model", false),
} as const;

/** Barcha me'yorlarni tekshiruv ro'yxati uchun tekis ko'rinishda qaytaradi. */
export function listNorms(): Array<{ key: string; norm: Norm<unknown> }> {
  const out: Array<{ key: string; norm: Norm<unknown> }> = [];
  for (const [k, v] of Object.entries(NORMS)) out.push({ key: `NORMS.${k}`, norm: v as Norm<unknown> });
  for (const [c, params] of Object.entries(THERMAL)) {
    for (const [k, v] of Object.entries(params)) out.push({ key: `THERMAL.${c}.${k}`, norm: v as Norm<unknown> });
  }
  return out;
}
