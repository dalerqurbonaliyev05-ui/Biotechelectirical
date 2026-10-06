// Yutuqlar (nishonlar). Har biri statistikaga qarab tekshiriladi; ochilganda toast chiqadi.
import type { Slug } from "@/data/catalog";
import { CATALOG } from "@/data/catalog";
import type { L } from "@/lib/i18n/types";
import type { Stats } from "./progress";

export interface Achievement {
  id: string;
  emoji: string;
  game?: Slug;
  title: L;
  desc: L;
  test: (s: Stats) => boolean;
}

const best = (s: Stats, g: Slug) => s.best[g] ?? 0;
const flag = (s: Stats, f: string) => Boolean(s.flags[f]);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-step",
    emoji: "👣",
    title: { uz: "Birinchi qadam", ru: "Первый шаг", en: "First Step" },
    desc: { uz: "Birinchi o'yinni yakunladingiz", ru: "Завершите первую игру", en: "Finish your first game" },
    test: (s) => s.total >= 1,
  },
  {
    id: "besh-tosh-5",
    emoji: "🪨",
    game: "besh-tosh",
    title: { uz: "Besh tosh chempioni", ru: "Чемпион беш тош", en: "Five Stones Champion" },
    desc: { uz: "Besh toshda 5-bosqichga yetdingiz", ru: "Дойдите до 5-го этапа в «Беш тош»", en: "Reach stage 5 in Five Stones" },
    test: (s) => flag(s, "besh-tosh:stage5"),
  },
  {
    id: "besh-tosh-all",
    emoji: "👑",
    game: "besh-tosh",
    title: { uz: "Toshlar sultoni", ru: "Султан камешков", en: "Sultan of Stones" },
    desc: { uz: "Besh toshning barcha 6 bosqichini o'tdingiz", ru: "Пройдите все 6 этапов «Беш тош»", en: "Clear all 6 stages of Five Stones" },
    test: (s) => flag(s, "besh-tosh:all"),
  },
  {
    id: "oshiq-olchi",
    emoji: "🍀",
    game: "oshiq",
    title: { uz: "Oshig'i olchi", ru: "Ошик — олчи!", en: "Lucky Olchi" },
    desc: { uz: "Bitta o'yinda 3 marta olchi tushirdingiz", ru: "Выбросите «олчи» 3 раза за игру", en: "Land “olchi” 3 times in one game" },
    test: (s) => flag(s, "oshiq:olchi3"),
  },
  {
    id: "oshiq-30",
    emoji: "🎯",
    game: "oshiq",
    title: { uz: "Omad kulib boqdi", ru: "Удача улыбнулась", en: "Fortune Smiles" },
    desc: { uz: "Oshiqda 10 tashlashda 30+ ball", ru: "30+ очков за 10 бросков ошика", en: "Score 30+ in 10 knucklebone throws" },
    test: (s) => best(s, "oshiq") >= 30,
  },
  {
    id: "chillak-30",
    emoji: "🪵",
    game: "chillak",
    title: { uz: "Chillakchi", ru: "Чиллакчи", en: "Chillak Player" },
    desc: { uz: "Chillakni 30 m dan uzoqqa uchirdingiz", ru: "Запустите чиллак дальше 30 м", en: "Hit the chillak over 30 m" },
    test: (s) => best(s, "chillak") >= 30,
  },
  {
    id: "chillak-50",
    emoji: "🚀",
    game: "chillak",
    title: { uz: "Chillak ustasi", ru: "Мастер чиллака", en: "Chillak Master" },
    desc: { uz: "Chillak 50 m dan oshdi", ru: "Чиллак пролетел больше 50 м", en: "Hit the chillak beyond 50 m" },
    test: (s) => best(s, "chillak") > 50,
  },
  {
    id: "lanka-10",
    emoji: "🪶",
    game: "lanka",
    title: { uz: "Lankachi", ru: "Ланкачи", en: "Lanka Kicker" },
    desc: { uz: "Lankada 10 ball", ru: "10 очков в «Ланке»", en: "Score 10 in Lanka" },
    test: (s) => best(s, "lanka") >= 10,
  },
  {
    id: "lanka-30",
    emoji: "🌟",
    game: "lanka",
    title: { uz: "Lanka ustasi", ru: "Мастер ланки", en: "Lanka Master" },
    desc: { uz: "Lankada 30 ball", ru: "30 очков в «Ланке»", en: "Score 30 in Lanka" },
    test: (s) => best(s, "lanka") >= 30,
  },
  {
    id: "oq-terak",
    emoji: "🌳",
    game: "oq-terak-kok-terak",
    title: { uz: "Chaqqon terak", ru: "Ловкий тополь", en: "Nimble Poplar" },
    desc: { uz: "“Oq terak”da marraga yetib bordingiz", ru: "Дойдите до финиша в «Ок терак»", en: "Reach the finish line in Oq Terak" },
    test: (s) => flag(s, "oq-terak:goal"),
  },
  {
    id: "duo",
    emoji: "🤝",
    title: { uz: "Do'stlar bilan", ru: "С друзьями", en: "With Friends" },
    desc: { uz: "Bitta qurilmada 2 kishilik rejimni o'ynadingiz", ru: "Сыграйте вдвоём на одном устройстве", en: "Play a 2-player mode on one device" },
    test: (s) => flag(s, "duo"),
  },
  {
    id: "arqon-win",
    emoji: "💪",
    game: "arqon-tortish",
    title: { uz: "Kuchli qo'llar", ru: "Сильные руки", en: "Strong Hands" },
    desc: { uz: "Arqon tortishda kompyuterni yengdingiz", ru: "Победите компьютер в перетягивании каната", en: "Beat the computer at tug of war" },
    test: (s) => flag(s, "arqon:win"),
  },
  {
    id: "arqon-hard",
    emoji: "🏋️",
    game: "arqon-tortish",
    title: { uz: "Arqon polvoni", ru: "Богатырь каната", en: "Rope Strongman" },
    desc: { uz: "Qiyin darajadagi kompyuterni yengdingiz", ru: "Победите сложного соперника", en: "Beat the hard AI" },
    test: (s) => flag(s, "arqon:hard"),
  },
  {
    id: "kurash-8",
    emoji: "🥋",
    game: "kurash",
    title: { uz: "Kurash bilimdoni", ru: "Знаток кураша", en: "Kurash Expert" },
    desc: { uz: "Kurash viktorinasida 8+ to'g'ri javob", ru: "8+ верных ответов в викторине по курашу", en: "8+ correct answers in the Kurash quiz" },
    test: (s) => flag(s, "kurash:8"),
  },
  {
    id: "kurash-10",
    emoji: "🏅",
    game: "kurash",
    title: { uz: "Halol!", ru: "Халол!", en: "Halol!" },
    desc: { uz: "Kurash viktorinasida 10/10", ru: "10 из 10 в викторине по курашу", en: "10 out of 10 in the Kurash quiz" },
    test: (s) => flag(s, "kurash:10"),
  },
  {
    id: "kopkari-quiz",
    emoji: "🐎",
    game: "kopkari",
    title: { uz: "Chavandoz", ru: "Чавандоз", en: "Horseman" },
    desc: { uz: "Ko'pkari viktorinasida barcha javoblar to'g'ri", ru: "Все ответы верны в викторине по купкари", en: "Perfect score in the Kopkari quiz" },
    test: (s) => flag(s, "kopkari:perfect"),
  },
  {
    id: "kopkari-regions",
    emoji: "🗺️",
    game: "kopkari",
    title: { uz: "Yurt bo'ylab", ru: "По всей стране", en: "Across the Land" },
    desc: { uz: "Xaritadagi barcha 14 hududni ko'rdingiz", ru: "Откройте все 14 регионов на карте", en: "Open all 14 regions on the map" },
    test: (s) => (s.seen.regions?.length ?? 0) >= 14,
  },
  {
    id: "bekinmachoq-all",
    emoji: "🔎",
    game: "bekinmachoq",
    title: { uz: "Ko'zi o'tkir", ru: "Зоркий глаз", en: "Sharp Eye" },
    desc: { uz: "Bekinmachoqning 3 darajasini ham o'tdingiz", ru: "Пройдите все 3 уровня пряток", en: "Clear all 3 Hide & Seek levels" },
    test: (s) => flag(s, "bekinmachoq:all"),
  },
  {
    id: "bekinmachoq-nohint",
    emoji: "🦉",
    game: "bekinmachoq",
    title: { uz: "Yordamsiz", ru: "Без подсказок", en: "No Hints Needed" },
    desc: { uz: "Bir darajani yordamsiz o'tdingiz", ru: "Пройдите уровень без подсказок", en: "Clear a level without hints" },
    test: (s) => flag(s, "bekinmachoq:nohint"),
  },
  {
    id: "topqir",
    emoji: "🧩",
    game: "topishmoqlar",
    title: { uz: "Topqir", ru: "Смекалистый", en: "Quick Wit" },
    desc: { uz: "10 ta topishmoqni topdingiz", ru: "Отгадайте 10 загадок", en: "Solve 10 riddles" },
    test: (s) => (s.counters.riddles ?? 0) >= 10,
  },
  {
    id: "topqir-40",
    emoji: "🧠",
    game: "topishmoqlar",
    title: { uz: "Topishmoqlar ustasi", ru: "Мастер загадок", en: "Riddle Master" },
    desc: { uz: "Jami 40 ta topishmoqni topdingiz", ru: "Отгадайте всего 40 загадок", en: "Solve 40 riddles in total" },
    test: (s) => (s.counters.riddles ?? 0) >= 40,
  },
  {
    id: "maqol-perfect",
    emoji: "📜",
    game: "maqollar",
    title: { uz: "Maqolchi", ru: "Знаток пословиц", en: "Proverb Keeper" },
    desc: { uz: "Maqollar viktorinasida 10/10", ru: "10 из 10 в викторине пословиц", en: "10 out of 10 in the proverbs quiz" },
    test: (s) => flag(s, "maqollar:perfect"),
  },
  {
    id: "donishmand",
    emoji: "🦉",
    game: "maqollar",
    title: { uz: "Donishmand", ru: "Мудрец", en: "Sage" },
    desc: { uz: "Jami 30 ta maqol davomini topdingiz", ru: "Всего 30 верно продолженных пословиц", en: "Complete 30 proverbs in total" },
    test: (s) => (s.counters.proverbs ?? 0) >= 30,
  },
  {
    id: "dastarxon-hard",
    emoji: "🍽️",
    game: "dastarxon",
    title: { uz: "Mehmondo'st", ru: "Гостеприимный", en: "Gracious Host" },
    desc: { uz: "Dastarxonning qiyin darajasini tugatdingiz", ru: "Пройдите сложный уровень «Дастархана»", en: "Clear the hard Dastarkhan level" },
    test: (s) => flag(s, "dastarxon:hard"),
  },
  {
    id: "explorer",
    emoji: "🧭",
    title: { uz: "Sayohatchi", ru: "Путешественник", en: "Explorer" },
    desc: { uz: "Barcha 12 o'yinni kamida bir marta yakunladingiz", ru: "Завершите все 12 игр хотя бы раз", en: "Finish all 12 games at least once" },
    test: (s) => CATALOG.every((c) => (s.plays[c.slug] ?? 0) > 0),
  },
  {
    id: "marathon",
    emoji: "🔥",
    title: { uz: "Tinimsiz", ru: "Неутомимый", en: "Tireless" },
    desc: { uz: "Jami 25 ta o'yin yakunladingiz", ru: "Завершите 25 игр", en: "Finish 25 games in total" },
    test: (s) => s.total >= 25,
  },
];
