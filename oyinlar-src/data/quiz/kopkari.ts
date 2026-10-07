import type { QuizItem } from "@/components/games/common/Quiz";
import type { L } from "@/lib/i18n/types";

export interface Region {
  id: string;
  name: L;
  /** Tor ekrandagi qisqa yorliq */
  abbr: string;
  /** Sxematik xaritadagi o'rni: ustun, qator, kenglik, balandlik */
  c: number;
  r: number;
  w?: number;
  h?: number;
  note: L;
}

const VALLEY: L = {
  uz: "Vodiyda ko'pkari asosan qishloq tumanlarida — to'ylar va Navro'z bayramida o'tkaziladi.",
  ru: "В долине купкари проводят в основном в сельских районах — на свадьбах и в Навруз.",
  en: "In the Fergana Valley kopkari is held mostly in rural districts — at weddings and during Navruz.",
};

export const REGIONS: Region[] = [
  {
    id: "qoraqalpogiston",
    abbr: "QQR",
    name: { uz: "Qoraqalpog'iston", ru: "Каракалпакстан", en: "Karakalpakstan" },
    c: 1, r: 1, w: 2, h: 2,
    note: {
      uz: "Qoraqalpoq xalqida ham ot o'yinlari qadimdan bor; uloq chopish to'y va bayram tomoshalariga kiradi.",
      ru: "У каракалпаков конные игры известны издавна; козлодрание входит в праздничные зрелища.",
      en: "Horse games have long been part of Karakalpak festivities, goat-grabbing included.",
    },
  },
  {
    id: "xorazm",
    abbr: "XOR",
    name: { uz: "Xorazm", ru: "Хорезм", en: "Khorezm" },
    c: 2, r: 3,
    note: {
      uz: "Ko'pkari asosan qishloq tumanlarida, to'y va bayramlarda tashkil etiladi.",
      ru: "Купкари устраивают в основном в сельских районах, на свадьбах и праздниках.",
      en: "Kopkari is organised mainly in rural districts at weddings and holidays.",
    },
  },
  {
    id: "navoiy",
    abbr: "NAV",
    name: { uz: "Navoiy", ru: "Навои", en: "Navoi" },
    c: 3, r: 1, h: 2,
    note: {
      uz: "Chorvachilik rivojlangan tumanlarda ko'pkari ham uchraydi.",
      ru: "В скотоводческих районах встречается и купкари.",
      en: "Kopkari is found in the region's livestock-farming districts.",
    },
  },
  {
    id: "buxoro",
    abbr: "BUX",
    name: { uz: "Buxoro", ru: "Бухара", en: "Bukhara" },
    c: 3, r: 3,
    note: {
      uz: "Viloyat tumanlarida ko'pkari an'anasi saqlangan, ayniqsa to'ylarda.",
      ru: "В районах области традиция купкари сохраняется, особенно на свадьбах.",
      en: "The tradition lives on in the region's districts, especially at weddings.",
    },
  },
  {
    id: "jizzax",
    abbr: "JIZ",
    name: { uz: "Jizzax", ru: "Джизак", en: "Jizzakh" },
    c: 4, r: 2,
    note: {
      uz: "Qorabayir otlarini yetishtiradigan markazlardan biri; bahorgi ko'pkarilar mashhur.",
      ru: "Один из центров разведения карабаиров; весенние купкари здесь популярны.",
      en: "One of the Karabair horse-breeding centres; spring kopkari is popular here.",
    },
  },
  {
    id: "samarqand",
    abbr: "SAM",
    name: { uz: "Samarqand", ru: "Самарканд", en: "Samarkand" },
    c: 4, r: 3,
    note: {
      uz: "Qorabayir zoti yetishtiriladigan asosiy hududlardan; tumanlarda katta ko'pkarilar bo'ladi.",
      ru: "Один из главных районов разведения карабаиров; в районах проходят большие купкари.",
      en: "A main Karabair breeding area; big kopkari events take place in its districts.",
    },
  },
  {
    id: "qashqadaryo",
    abbr: "QASH",
    name: { uz: "Qashqadaryo", ru: "Кашкадарья", en: "Kashkadarya" },
    c: 4, r: 4,
    note: {
      uz: "Ko'pkari an'anasi eng kuchli hududlardan biri; Qorabayir otlari ham ko'p boqiladi.",
      ru: "Один из регионов с самой сильной традицией купкари; здесь разводят и карабаиров.",
      en: "One of the strongest kopkari regions, also known for Karabair horses.",
    },
  },
  {
    id: "surxondaryo",
    abbr: "SUR",
    name: { uz: "Surxondaryo", ru: "Сурхандарья", en: "Surkhandarya" },
    c: 5, r: 4,
    note: {
      uz: "Ko'pkari keng tarqalgan; chavandozlik an'anasi kuchli hudud.",
      ru: "Купкари широко распространено; сильные традиции наездничества.",
      en: "Kopkari is widespread and horsemanship traditions are strong.",
    },
  },
  {
    id: "sirdaryo",
    abbr: "SIR",
    name: { uz: "Sirdaryo", ru: "Сырдарья", en: "Syrdarya" },
    c: 5, r: 2,
    note: {
      uz: "Qishloq tumanlarida bayram ko'pkarilari o'tkaziladi.",
      ru: "В сельских районах проводят праздничные купкари.",
      en: "Festive kopkari events are held in rural districts.",
    },
  },
  {
    id: "toshkent-v",
    abbr: "T.V",
    name: { uz: "Toshkent viloyati", ru: "Ташкентская обл.", en: "Tashkent Region" },
    c: 5, r: 1,
    note: {
      uz: "Viloyat tumanlarida, ayniqsa tog'oldi hududlarida bahorgi ko'pkarilar bo'ladi.",
      ru: "В районах области, особенно предгорных, проходят весенние купкари.",
      en: "Spring kopkari is held in the region's districts, especially in the foothills.",
    },
  },
  {
    id: "toshkent-sh",
    abbr: "TSH",
    name: { uz: "Toshkent shahri", ru: "г. Ташкент", en: "Tashkent City" },
    c: 6, r: 1,
    note: {
      uz: "Shahar ichida ko'pkari o'tkazilmaydi — ixlosmandlar viloyat tumanlaridagi bellashuvlarga boradi.",
      ru: "В самом городе купкари не проводят — болельщики едут на состязания в районы.",
      en: "Not held inside the city — fans travel to events in surrounding districts.",
    },
  },
  {
    id: "namangan",
    abbr: "NAM",
    name: { uz: "Namangan", ru: "Наманган", en: "Namangan" },
    c: 7, r: 1,
    note: VALLEY,
  },
  {
    id: "fargona",
    abbr: "FAR",
    name: { uz: "Farg'ona", ru: "Фергана", en: "Fergana" },
    c: 7, r: 2,
    note: VALLEY,
  },
  {
    id: "andijon",
    abbr: "AND",
    name: { uz: "Andijon", ru: "Андижан", en: "Andijan" },
    c: 8, r: 1, h: 2,
    note: VALLEY,
  },
];

export const KOPKARI_QUIZ: QuizItem[] = [
  {
    q: {
      uz: "Ko'pkarida chavandozlar nimani talashadi?",
      ru: "За что борются всадники в купкари?",
      en: "What do the riders compete for in kopkari?",
    },
    options: {
      uz: ["Uloqni (echki tanasi)", "To'pni", "Bayroqni", "Arqonni"],
      ru: ["За улак (тушу козла)", "За мяч", "За флаг", "За верёвку"],
      en: ["The ulak (a goat carcass)", "A ball", "A flag", "A rope"],
    },
    answer: 0,
  },
  {
    q: {
      uz: "Ko'pkari uchun ko'pincha qaysi o'zbek ot zoti ishlatiladi?",
      ru: "Какую узбекскую породу лошадей чаще всего используют в купкари?",
      en: "Which Uzbek horse breed is most often used in kopkari?",
    },
    options: {
      uz: ["Qorabayir", "Arab oti", "Frizian", "Pony"],
      ru: ["Карабаир", "Арабская", "Фризская", "Пони"],
      en: ["Karabair", "Arabian", "Friesian", "Pony"],
    },
    answer: 0,
    explain: {
      uz: "Qorabayir — chidamli, chaqqon va kuchli zot; olomon ichida xotirjam qolishi qadrlanadi.",
      ru: "Карабаир — выносливая, ловкая и сильная порода, спокойная в толпе.",
      en: "The Karabair is hardy, agile and strong, and stays calm in a crowd.",
    },
  },
  {
    q: {
      uz: "Ko'pkari odatda yilning qaysi faslida o'tkaziladi?",
      ru: "В какое время года обычно проводят купкари?",
      en: "When is kopkari usually held?",
    },
    options: {
      uz: ["Salqin mavsumda: kuzdan bahorgacha", "Faqat yozning issiq kunlarida", "Faqat yangi yil kechasi", "Har kuni"],
      ru: ["В прохладный сезон: с осени до весны", "Только в летнюю жару", "Только в новогоднюю ночь", "Каждый день"],
      en: ["In the cool season, from autumn to spring", "Only in the summer heat", "Only on New Year's Eve", "Every day"],
    },
    answer: 0,
    explain: {
      uz: "Issiqda otlar tez charchaydi, shuning uchun ko'pkari salqin oylarda, to'y va Navro'zda bo'ladi.",
      ru: "В жару лошади быстро устают, поэтому купкари проводят в прохладные месяцы, на свадьбах и Навруз.",
      en: "Horses tire quickly in the heat, so kopkari takes place in cooler months, at weddings and Navruz.",
    },
  },
  {
    q: {
      uz: "Qirg'izistondagi shunday o'yin — “Ko'k-bo'ri” UNESCO nomoddiy meros ro'yxatiga qachon kiritilgan?",
      ru: "Когда кыргызская игра «Кок-бору» внесена в список нематериального наследия ЮНЕСКО?",
      en: "When was Kyrgyzstan's “Kok boru” inscribed on UNESCO's intangible heritage list?",
    },
    options: ["2017", "1998", "2005", "2022"],
    answer: 0,
  },
  {
    q: {
      uz: "Afg'onistonda ko'pkariga o'xshash o'yin qanday ataladi?",
      ru: "Как называется похожая игра в Афганистане?",
      en: "What is the similar game called in Afghanistan?",
    },
    options: ["Buzkashi", "Polo", "Kabaddi", "Lapta"],
    answer: 0,
  },
  {
    q: {
      uz: "Uloqni belgilangan joyga yetkazgan chavandozga nima beriladi?",
      ru: "Что получает всадник, доставивший улак до цели?",
      en: "What does the rider who delivers the ulak to the goal receive?",
    },
    options: {
      uz: ["Sovrin", "Jarima", "Sariq kartochka", "Hech narsa"],
      ru: ["Приз", "Штраф", "Жёлтую карточку", "Ничего"],
      en: ["A prize", "A penalty", "A yellow card", "Nothing"],
    },
    answer: 0,
    explain: {
      uz: "Sovrinni to'y egasi yoki tashkilotchilar tayyorlaydi: gilam, to'n, chorva va boshqalar.",
      ru: "Призы готовят хозяева праздника или организаторы: ковры, халаты, скот и др.",
      en: "Prizes come from the hosts or organisers: carpets, robes, livestock and more.",
    },
  },
  {
    q: {
      uz: "An'anaviy ko'pkarining ikki shakli qaysi?",
      ru: "Какие две формы купкари существуют?",
      en: "What are the two forms of kopkari?",
    },
    options: {
      uz: ["Umumiy (har kim o'zi uchun) va jamoaviy", "Suvda va muzda", "Kunduzgi va tungi", "Piyoda va velosipedda"],
      ru: ["Общая (каждый за себя) и командная", "На воде и на льду", "Дневная и ночная", "Пешая и на велосипедах"],
      en: ["Free-for-all and team", "On water and on ice", "Day and night", "On foot and on bicycles"],
    },
    answer: 0,
  },
];
