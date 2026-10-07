import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Qanday o'ynaladi",
        ul: [
          "Har raundda bazadagi topishmoqlardan tasodifiy 10 tasi beriladi.",
          "Variantlar rejimi: to'rt javobdan birini tanlang — to'g'ri javob 100 ball.",
          "Yozish rejimi: javobni o'zingiz yozing — to'g'ri javob 150 ball. Bosh/kichik harf va tutuq belgisi farqi hisobga olinmaydi.",
          "💡 Yordam: ishora, birinchi harf va harflar soni ko'rsatiladi (−40 ball).",
          "Topilgan har bir topishmoq “Topqir” yutug'iga hisoblanadi.",
        ],
      },
      {
        h: "Til haqida",
        p: ["Topishmoqlar o'zbek xalq og'zaki ijodidan olingan va o'zbek tilida beriladi — tarjimada qofiya va so'z o'yini yo'qoladi."],
      },
    ],
    ru: [
      {
        h: "Как играть",
        ul: [
          "В каждом раунде — 10 случайных загадок из базы.",
          "Режим вариантов: выберите один из четырёх ответов — верный ответ 100 очков.",
          "Режим ввода: напишите ответ сами — 150 очков. Регистр и апостроф не важны.",
          "💡 Подсказка: намёк, первая буква и число букв (−40 очков).",
          "Каждая отгаданная загадка идёт в счёт достижения «Смекалистый».",
        ],
      },
      {
        h: "О языке",
        p: ["Загадки взяты из узбекского фольклора и даны на узбекском — при переводе теряются рифма и игра слов."],
      },
    ],
    en: [
      {
        h: "How to play",
        ul: [
          "Each round gives 10 random riddles from the collection.",
          "Choice mode: pick one of four answers — 100 points for a correct one.",
          "Typing mode: type the answer yourself — 150 points. Case and apostrophes don't matter.",
          "💡 Hint: a clue, the first letter and the number of letters (−40 points).",
          "Every solved riddle counts towards the “Quick Wit” achievement.",
        ],
      },
      {
        h: "About the language",
        p: ["The riddles come from Uzbek folklore and are given in Uzbek — rhyme and wordplay would be lost in translation."],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Topishmoq — xalq og'zaki ijodining qadimiy janri. Unda narsa yoki hodisa to'g'ridan-to'g'ri aytilmay, o'xshatish va ishoralar orqali ta'riflanadi. Topishmoqlar bolalarning fikrlash, kuzatish va nutqini rivojlantiradi.",
          "Qadimda qish kechalari sandal atrofida, to'y va gaplarda topishmoq aytish odat bo'lgan. Topishmoq aytish an'anasi barcha turkiy xalqlarda juda qadimiy.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Загадка — древний жанр устного народного творчества. Предмет или явление в ней не называется прямо, а описывается через сравнения и намёки. Загадки развивают мышление, наблюдательность и речь детей.",
          "Издавна загадки загадывали зимними вечерами у сандала, на свадьбах и посиделках. Традиция загадок очень древняя у всех тюркских народов.",
        ],
      },
    ],
    en: [
      {
        p: [
          "The riddle (topishmoq) is an ancient folklore genre: an object or phenomenon is described through comparisons and hints instead of being named. Riddles develop children's thinking, observation and speech.",
          "Riddles were traditionally told on winter evenings around the sandal (a heated low table), at weddings and gatherings. The tradition is ancient among all Turkic peoples.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "Ko'p topishmoqlar qofiyali bo'ladi — shuning uchun oson yodda qoladi.",
      "Bir xil javobli topishmoqlarning turli hududlarda har xil variantlari bor.",
      "Sandal — ostida cho'g' qo'yiladigan, ko'rpa yopilgan past stol; qishda uning atrofida isinishgan.",
    ],
    ru: [
      "Многие загадки рифмованные — поэтому их легко запомнить.",
      "У загадок с одним ответом есть разные региональные варианты.",
      "Сандал — низкий стол, накрытый одеялом, под которым ставят угли; зимой вокруг него грелись.",
    ],
    en: [
      "Many riddles rhyme, which makes them easy to remember.",
      "Riddles with the same answer exist in different regional versions.",
      "A sandal is a low table covered with a quilt with embers underneath, used for warmth in winter.",
    ],
  },
};
