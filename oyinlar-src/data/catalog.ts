// O'yinlar katalogi: bosh sahifa, reyting va yutuqlar uchun yengil ma'lumot.
// Qoidalar va tarix matnlari data/content/<slug>.ts da (faqat o'z sahifasiga yuklanadi).
import type { L } from "@/lib/i18n/types";

export type Slug =
  | "besh-tosh"
  | "oshiq"
  | "chillak"
  | "lanka"
  | "oq-terak-kok-terak"
  | "arqon-tortish"
  | "kurash"
  | "kopkari"
  | "bekinmachoq"
  | "topishmoqlar"
  | "maqollar"
  | "dastarxon";

export type Unit = "points" | "m";

export interface CatalogItem {
  slug: Slug;
  emoji: string;
  /** Kartaning aksent rangi */
  color: string;
  kind: "main" | "extra";
  unit: Unit;
  title: L;
  tagline: L;
}

export const CATALOG: CatalogItem[] = [
  {
    slug: "besh-tosh",
    emoji: "🪨",
    color: "#1aa6a6",
    kind: "main",
    unit: "points",
    title: { uz: "Besh tosh", ru: "Беш тош (Пять камешков)", en: "Besh Tosh (Five Stones)" },
    tagline: {
      uz: "Toshni ot, yerdagisini ol, qaytganini tut!",
      ru: "Подбрось камень, собери с земли, поймай!",
      en: "Toss a stone, grab from the ground, catch it!",
    },
  },
  {
    slug: "oshiq",
    emoji: "🦴",
    color: "#c8323c",
    kind: "main",
    unit: "points",
    title: { uz: "Oshiq", ru: "Ошик (альчики)", en: "Oshiq (Knucklebones)" },
    tagline: {
      uz: "Oshiqni tashla: olchi tushsa — omad senda!",
      ru: "Брось ошик: выпал «олчи» — удача с тобой!",
      en: "Throw the knucklebone — land an “olchi” for luck!",
    },
  },
  {
    slug: "chillak",
    emoji: "🪵",
    color: "#b5651d",
    kind: "main",
    unit: "m",
    title: { uz: "Chillak", ru: "Чиллак", en: "Chillak (Tip-cat)" },
    tagline: {
      uz: "Burchak va kuchni tanla — chillakni uzoqqa uchir.",
      ru: "Выбери угол и силу — запусти чиллак подальше.",
      en: "Pick the angle and power — send the chillak flying.",
    },
  },
  {
    slug: "lanka",
    emoji: "🏃",
    color: "#2f7de1",
    kind: "main",
    unit: "points",
    title: { uz: "Lanka", ru: "Ланка", en: "Lanka" },
    tagline: {
      uz: "Bos — lanka sakraydi. Yerga tushirma, to'siqlardan o't!",
      ru: "Нажимай — ланка подпрыгивает. Не роняй, пролетай препятствия!",
      en: "Tap to kick the lanka up. Don't let it drop!",
    },
  },
  {
    slug: "oq-terak-kok-terak",
    emoji: "🌳",
    color: "#2e9d5b",
    kind: "main",
    unit: "points",
    title: { uz: "Oq terakmi, ko'k terak", ru: "Ок теракми, кок терак", en: "Oq Terak, Ko'k Terak" },
    tagline: {
      uz: "“Oq terak!” — yur. “Ko'k terak!” — to'xta!",
      ru: "«Oq terak!» — иди. «Ko'k terak!» — стой!",
      en: "“Oq terak!” — go. “Ko'k terak!” — freeze!",
    },
  },
  {
    slug: "arqon-tortish",
    emoji: "🪢",
    color: "#d9822b",
    kind: "main",
    unit: "points",
    title: { uz: "Arqon tortish", ru: "Перетягивание каната", en: "Tug of War" },
    tagline: {
      uz: "Tez-tez bos va bayroqchani o'z tomoningga tort!",
      ru: "Жми быстрее и перетяни флажок на свою сторону!",
      en: "Tap fast and pull the flag to your side!",
    },
  },
  {
    slug: "kurash",
    emoji: "🥋",
    color: "#1f4fa3",
    kind: "main",
    unit: "points",
    title: { uz: "Kurash", ru: "Кураш", en: "Kurash" },
    tagline: {
      uz: "Milliy kurash: qoidalar, usullar va viktorina.",
      ru: "Национальная борьба: правила, приёмы и викторина.",
      en: "Uzbek wrestling: rules, techniques and a quiz.",
    },
  },
  {
    slug: "kopkari",
    emoji: "🐎",
    color: "#8a4b2a",
    kind: "main",
    unit: "points",
    title: { uz: "Ko'pkari", ru: "Купкари", en: "Kopkari" },
    tagline: {
      uz: "Chavandozlar o'yini: tarix, viloyatlar va viktorina.",
      ru: "Игра всадников: история, регионы и викторина.",
      en: "The horsemen's game: history, regions and a quiz.",
    },
  },
  {
    slug: "bekinmachoq",
    emoji: "🫣",
    color: "#7a4cc2",
    kind: "main",
    unit: "points",
    title: { uz: "Bekinmachoq", ru: "Бекинмачок (прятки)", en: "Bekinmachoq (Hide & Seek)" },
    tagline: {
      uz: "Hovli, bog' va bozorda yashiringanlarni top.",
      ru: "Найди спрятавшихся во дворе, саду и на базаре.",
      en: "Find who's hiding in the yard, garden and bazaar.",
    },
  },
  {
    slug: "topishmoqlar",
    emoji: "🧩",
    color: "#c2410c",
    kind: "extra",
    unit: "points",
    title: { uz: "Topishmoqlar", ru: "Загадки", en: "Riddles" },
    tagline: {
      uz: "40+ xalq topishmog'i: top-chi, nima ekan?",
      ru: "40+ народных загадок на узбекском.",
      en: "40+ Uzbek folk riddles.",
    },
  },
  {
    slug: "maqollar",
    emoji: "📜",
    color: "#0f766e",
    kind: "extra",
    unit: "points",
    title: { uz: "Maqollar", ru: "Пословицы", en: "Proverbs" },
    tagline: {
      uz: "Maqolning davomini top.",
      ru: "Найди окончание пословицы.",
      en: "Complete the Uzbek proverb.",
    },
  },
  {
    slug: "dastarxon",
    emoji: "🫖",
    color: "#a21caf",
    kind: "extra",
    unit: "points",
    title: { uz: "Dastarxon", ru: "Дастархан", en: "Dastarkhan" },
    tagline: {
      uz: "Dasturxondagi juft taomlarni top — xotira o'yini.",
      ru: "Найди пары угощений — игра на память.",
      en: "Match the dishes on the table — a memory game.",
    },
  },
];

export const BY_SLUG = Object.fromEntries(CATALOG.map((c) => [c.slug, c])) as Record<Slug, CatalogItem>;
export const MAIN_GAMES = CATALOG.filter((c) => c.kind === "main");
export const EXTRA_GAMES = CATALOG.filter((c) => c.kind === "extra");

export function formatScore(score: number, unit: Unit, unitLabel: string): string {
  const n = unit === "m" ? score.toFixed(1) : Math.round(score).toString();
  return `${n} ${unitLabel}`;
}
