import type { ScenarioDef, StepDef } from "../../engine/scenario";

// Ekskursiya: har bir uskuna turini sxemada topib, kartasini o'qish.
const TARGETS: Array<{ id: string; label: string; explain: string }> = [
  { id: "W1", label: "110 kV kirish liniyasi W1 ni toping", explain: "Podstansiya energiyani 110 kV liniyalardan oladi. Ikki liniya — ishonchlilik uchun." },
  { id: "B110-1", label: "110 kV I seksiya shinasini ko'ring", explain: "Shina — bir nechta yacheykani bir-biriga ulovchi umumiy o'tkazgich." },
  { id: "Q-W1", label: "Q-W1 o'chirgichini o'rganing", explain: "O'chirgich yuklama va qisqa tutashuv tokini uzadi va ulaydi." },
  { id: "QS-W1L", label: "QS-W1L ajratkichini o'rganing", explain: "Ajratkich ko'rinadigan uzilish hosil qiladi, yuklama ostida ochilmaydi va yopilmaydi." },
  { id: "QSG-W1L", label: "QSG-W1L yerlagichini o'rganing", explain: "Yerlagich uzilgan uchastkani yerga ulaydi — ishchi xavfsizligi uchun." },
  { id: "T-1", label: "T-1 kuch transformatorini o'rganing", explain: "Uch o'ramli transformator 110 kV ni 35 va 10 kV ga aylantiradi; RPN bilan kuchlanishni rostlaydi." },
  { id: "TT-T1-110", label: "TT-T1-110 tok transformatorini toping", explain: "Tok transformatori himoya va o'lchov asboblariga kichik tok beradi." },
  { id: "TN-110-1", label: "TN-110-1 kuchlanish transformatorini toping", explain: "Kuchlanish transformatori voltmetr, hisoblagich va himoyalarga past kuchlanish beradi." },
  { id: "OPN-T1-110", label: "OPN-T1-110 razryadnikini toping", explain: "OPN chaqmoq va kommutatsiya o'ta kuchlanishlarini cheklaydi." },
  { id: "Q-SV10", label: "10 kV seksiya o'chirgichi Q-SV10 ni o'rganing", explain: "SV ikki seksiyani bog'laydi; ABR bir manba yo'qolganda uni avtomatik ulaydi." },
  { id: "L-F10-1", label: "1-toifa iste'molchini (kasalxona) toping", explain: "1-toifa iste'molchilar ta'minoti uzilishi odamlar hayotiga xavf tug'diradi — oxirgi navbatda uziladi." },
];

const steps: StepDef[] = TARGETS.map((t) => ({
  id: `see-${t.id}`,
  label: t.label,
  match: { type: "inspect", targetId: t.id },
  explain: t.explain,
}));
steps.push({
  id: "report",
  label: "Dispetcherga ekskursiya tugaganini xabar qilish",
  match: { type: "report", messageId: "m1" },
  after: TARGETS.map((t) => `see-${t.id}`),
  explain: "Smenaga kirishda navbatchi podstansiya holati bilan tanishib, dispetcherga xabar beradi.",
});

export const S01: ScenarioDef = {
  id: "S01",
  level: 1,
  title: "Podstansiya bilan tanishish",
  objective: "Har bir uskunaning vazifasi va sxemadagi belgisini o'rganish",
  briefing:
    "Siz «Yangiobod» 110/35/10 kV podstansiyasiga birinchi kun keldingiz. Bir chiziqli sxemada har bir uskunani toping va uning kartasini o'qing. Uskunani bosing — o'ngdagi panelda uning vazifasi, holati va kuchlanishi ko'rsatiladi. «Reja» bo'limida podstansiya hududini ko'rishingiz mumkin.",
  kind: "tour",
  situation: { timeStart: "08:00", weather: "clear", season: "spring", ambientC: 20, loadFactor: 0.7 },
  orderRequired: true,
  messages: [
    {
      id: "m1",
      trigger: "start",
      from: "Dispetcher",
      text: "Xayrli tong. Smenani qabul qilishdan oldin podstansiya sxemasi bilan tanishib chiqing. Tugatgach xabar bering.",
      expectsReport: { afterStep: `see-${TARGETS[TARGETS.length - 1].id}`, text: "Podstansiya sxemasi bilan tanishib chiqdim, uskunalar normal holatda." },
    },
  ],
  steps,
  goals: [{ type: "inspected", ids: TARGETS.map((t) => t.id) }],
  analysis:
    "Siz podstansiyaning asosiy elementlarini ko'rdingiz: liniyalar va shinalar, o'chirgich (yuklama va qisqa tutashuv tokini uzadi), ajratkich (faqat ko'rinadigan uzilish, yuklama ostida ochilmaydi), yerlagich (ishchilar xavfsizligi uchun), kuch transformatori, o'lchov transformatorlari (TT, TN), OPN, seksiya o'chirgichi va iste'molchilar toifalari. Keyingi stsenariylarda shu uskunalar bilan to'g'ri tartibda ishlashni o'rganasiz.",
};
