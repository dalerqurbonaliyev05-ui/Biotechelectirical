import type { ScenarioDef } from "../../engine/scenario";

// Past kuchlanish: 110 kV manba kuchlanishi pasaygan, kechki cho'qqi. Yechim — RPN pog'onasi.
export const S05: ScenarioDef = {
  id: "S05",
  level: 1,
  title: "Kuchlanish past — RPN",
  objective: "RPN pog'onasini to'g'ri tanlab, kuchlanishni me'yorga keltirish",
  briefing:
    "Qishki kechki cho'qqi. 110 kV tarmoqda kuchlanish pasaygan, 10 kV I seksiyada kuchlanish past. T-1 ning RPN pog'onasini bittadan o'zgartirib, 10 kV kuchlanishni dispetcher bergan oraliqqa keltiring. Har pog'onadan keyin mexanizm ishini tugatishini kuting. Eslatma: RPN kuchlanishni rostlaydi, transformator quvvatini oshirmaydi.",
  kind: "rpn",
  situation: { timeStart: "18:10", weather: "snow", season: "winter", ambientC: -3, loadFactor: 1, sourceKv: 106 },
  orderRequired: true,
  initial: { taps: { "T-1": 2, "T-2": 0 } },
  messages: [
    {
      id: "m1",
      trigger: "start",
      from: "Dispetcher",
      text: "Yangiobod PS. 10 kV I seksiyada kuchlanish past. T-1 RPN yordamida 10 kV shinadagi kuchlanishni 10,3–10,6 kV oralig'iga keltiring va xabar bering.",
      isOrder: true,
      readback: {
        prompt: "Buyruqni qaytarib o'qing:",
        options: [
          { id: "ok", text: "Tushundim: T-1 RPN bilan 10 kV I seksiya kuchlanishini 10,3–10,6 kV ga keltiraman.", correct: true },
          {
            id: "power",
            text: "Tushundim: T-1 quvvatini RPN bilan oshiraman.",
            correct: false,
            why: "RPN quvvatni oshirmaydi — u o'ramlar nisbatini o'zgartirib faqat kuchlanishni rostlaydi.",
          },
        ],
      },
      expectsReport: { afterStep: "journal", text: "T-1 RPN pog'onasi o'zgartirildi, 10 kV I seksiyada kuchlanish me'yorda.", requireGoals: true },
    },
  ],
  steps: [
    { id: "readback", label: "Buyruqni qaytarib o'qish", match: { type: "readback", messageId: "m1" }, explain: "Buyruq qaytarib o'qiladi." },
    {
      id: "tap",
      label: "T-1 RPN: «Kuchlanishni oshirish» — bittadan, pauza bilan",
      match: { type: "tap", transformerId: "T-1", dir: 1 },
      after: ["readback"],
      explain: "Pog'ona bir-bir o'zgartiriladi: har o'tishdan keyin mexanizm to'xtashi va kuchlanish barqarorlashishi kutiladi.",
      hint: "Transformator kartasidagi RPN tugmalari. Kuchlanish oraliqqa kirguncha takrorlang.",
    },
    {
      id: "journal",
      label: "Jurnalga yozish (RPN pog'onasi va kuchlanish)",
      match: { type: "journal" },
      after: ["tap"],
      explain: "RPN pog'onasining o'zgarishi ham operativ jurnalga yoziladi.",
    },
    { id: "report", label: "Dispetcherga hisobot", match: { type: "report", messageId: "m1" }, after: ["journal"], explain: "Bajarilgach hisobot." },
  ],
  goals: [{ type: "voltageInRange", transformerId: "T-1", winding: "lv", min: 10.3, max: 10.6 }],
  journal: { required: true },
  analysis:
    "RPN transformatsiya koeffitsientini o'zgartiradi: YK o'ramida o'ramlar kamaysa, past tomonda kuchlanish oshadi. Pog'ona bir-bir, pauza bilan o'zgartiriladi; yuqori tokda RPN blokirovkalanadi. RPN QUVVATNI oshirmaydi — transformator ortiqcha yuklangan bo'lsa (2-darajadagi S06–S07), yechim boshqa: sovutish, zaxira transformator, yuklamani taqsimlash yoki iste'molchilarni toifa bo'yicha uzish.",
};
