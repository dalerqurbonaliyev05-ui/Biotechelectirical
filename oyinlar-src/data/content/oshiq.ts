import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Oshiqning to'rt tomoni",
        p: ["Oshiq — qo'yning to'piq suyagi. U to'rt tomonidan biri bilan tushadi. Bu o'yinda nomlar va ballar:"],
        ul: [
          "Pukka — keng tomon (ko'p tushadi, ≈39%) — 1 ball.",
          "Chikka — keng, botiq tomon (≈39%) — 2 ball.",
          "Tavka — tor, tekis tomon (≈12%) — 4 ball.",
          "Olchi — tor, o'yiqli tomon (≈10%) — 5 ball.",
          "Nomlar hududga qarab farq qiladi (masalan, olchi — alchi). Tor tomonlar kam tushgani uchun qimmatroq.",
        ],
      },
      {
        h: "Rejimlar",
        ul: [
          "Yakka: 10 marta tashlaysiz, ballar yig'iladi — reytingga yoziladi.",
          "2 kishi (bitta qurilmada): navbat bilan 5 tadan tashlanadi, ko'p ball to'plagan yutadi.",
          "Tashlash: maydonni yoki tugmani bosing (Probel/Enter).",
        ],
      },
    ],
    ru: [
      {
        h: "Четыре стороны ошика",
        p: ["Ошик (альчик) — бараний таранный сустав. Он падает на одну из четырёх сторон. Названия и очки в этой игре:"],
        ul: [
          "Пукка — широкая сторона (выпадает часто, ≈39%) — 1 очко.",
          "Чикка — широкая вогнутая сторона (≈39%) — 2 очка.",
          "Тавка — узкая плоская сторона (≈12%) — 4 очка.",
          "Олчи — узкая сторона с выемкой (≈10%) — 5 очков.",
          "Названия различаются по регионам (например, олчи — алчи). Узкие стороны выпадают реже, поэтому ценнее.",
        ],
      },
      {
        h: "Режимы",
        ul: [
          "Один игрок: 10 бросков, очки суммируются и идут в рейтинг.",
          "Вдвоём (на одном устройстве): по очереди по 5 бросков, побеждает набравший больше.",
          "Бросок: нажмите на поле или кнопку (Пробел/Enter).",
        ],
      },
    ],
    en: [
      {
        h: "The four sides",
        p: ["An oshiq is a sheep's ankle bone (astragalus). It lands on one of four sides. Names and points in this game:"],
        ul: [
          "Pukka — broad side (common, ≈39%) — 1 point.",
          "Chikka — broad hollow side (≈39%) — 2 points.",
          "Tavka — narrow flat side (≈12%) — 4 points.",
          "Olchi — narrow grooved side (≈10%) — 5 points.",
          "Names vary by region (e.g. olchi/alchi). Narrow sides are rarer, so they score more.",
        ],
      },
      {
        h: "Modes",
        ul: [
          "Solo: 10 throws, points add up and go to the leaderboard.",
          "2 players on one device: take turns, 5 throws each; the higher total wins.",
          "Throw: tap the arena or the button (Space/Enter).",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Oshiq o'yini Markaziy Osiyoda juda qadimdan ma'lum. Bolalar oshiqlarni yig'ib, ba'zan ularni bo'yab yoki ichiga qo'rg'oshin quyib og'irlashtirib, “saqqa” (asosiy, uriladigan oshiq) yasashgan.",
          "Mashhur o'yin turlaridan birida oshiqlar qatorga teriladi va saqqa bilan urib, qatordan chiqarilgan oshiqlar yutib olinadi. Boshqa turida oshiq tashlanib, qaysi tomoni bilan tushgani hisobga olinadi.",
          "Shunga o'xshash to'piq suyagi o'yinlari Qozog'iston, Qirg'iziston, Mo'g'uliston va boshqa ko'chmanchi xalqlarda ham bor.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Игра в ошики известна в Центральной Азии с глубокой древности. Дети собирали ошики, иногда красили их или заливали внутрь свинец, чтобы сделать тяжёлый «сакка» — главный биток.",
          "В одном из популярных вариантов ошики выставляют в ряд и выбивают их биткой — выбитые забирают. В другом бросают ошик и смотрят, на какую сторону он упал.",
          "Похожие игры с таранными костями есть у казахов, кыргызов, монголов и других кочевых народов.",
        ],
      },
    ],
    en: [
      {
        p: [
          "Knucklebone games have been known in Central Asia since ancient times. Children collected the bones, sometimes painting them or filling one with lead to make a heavy “saqqa” — the main striker.",
          "In one popular version the bones are lined up and knocked out of the row with the saqqa; knocked-out bones are won. In another, a bone is thrown and the side it lands on counts.",
          "Similar ankle-bone games are played by Kazakhs, Kyrgyz, Mongols and other nomadic peoples.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "“Oshig'i olchi” iborasi “omadi chopgan” degan ma'noni bildiradi.",
      "To'piq suyagi o'yinlari qadimgi Yunoniston va Rimda ham bo'lgan — zamonaviy o'yin soqqalarining ajdodi hisoblanadi.",
      "Mo'g'ulistonda to'piq suyagi bilan otish musobaqasi (“shagai”) milliy bayram Naadamda o'tkaziladi.",
    ],
    ru: [
      "Выражение «ошиги олчи» означает «ему везёт».",
      "Игры с таранными костями были и в Древней Греции и Риме — это предки игральных костей.",
      "В Монголии стрельба по таранным костям («шагай») проводится на празднике Наадам.",
    ],
    en: [
      "The idiom “oshig'i olchi” (“his knucklebone landed olchi”) means “he's lucky”.",
      "Ancient Greeks and Romans played with ankle bones too — the ancestors of modern dice.",
      "In Mongolia, knucklebone shooting (“shagai”) is part of the Naadam festival.",
    ],
  },
};
