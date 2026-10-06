import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Bu o'yinda",
        ul: [
          "Uch raunddan iborat (kim birinchi 2 raund yutsa — g'olib).",
          "“3-2-1 — Tort!” dan keyin tugmani iloji boricha tez-tez bosing (Probel yoki A).",
          "Bayroqcha o'z tomoningizdagi chiziqqa yetsa — raund sizniki.",
          "Kompyuter qiyinligi: oson, o'rta, qiyin — qiyinda u sekundiga 8 martadan ko'p tortadi.",
          "2 kishilik rejim: ekran ikki yarmi. Chap o'yinchi — A/Probel, o'ng o'yinchi — L/Enter. Ikkalasi bir vaqtda bosishi mumkin (multitouch).",
        ],
      },
      {
        h: "Haqiqiy musobaqa",
        p: [
          "Ikki jamoa arqonning ikki uchidan ushlaydi. O'rtada belgi bo'ladi; uni o'z tomoniga belgilangan chiziqdan o'tkazgan jamoa yutadi. Arqonni qo'lga o'rash, yerga yotib olish taqiqlanadi.",
        ],
      },
    ],
    ru: [
      {
        h: "В этой игре",
        ul: [
          "Три раунда (кто первым выиграет 2 — победитель).",
          "После «3-2-1 — Тяни!» жмите кнопку как можно чаще (Пробел или A).",
          "Флажок дошёл до линии на вашей стороне — раунд ваш.",
          "Сложность компьютера: лёгкая, средняя, сложная — на сложной он тянет более 8 раз в секунду.",
          "Вдвоём: экран делится пополам. Левый игрок — A/Пробел, правый — L/Enter. Можно жать одновременно (мультитач).",
        ],
      },
      {
        h: "Настоящие соревнования",
        p: [
          "Две команды держат канат с двух концов. Посередине метка: побеждает команда, перетянувшая её за линию на своей стороне. Наматывать канат на руку и ложиться на землю запрещено.",
        ],
      },
    ],
    en: [
      {
        h: "In this game",
        ul: [
          "Best of three rounds (first to win 2).",
          "After “3-2-1 — Pull!” tap as fast as you can (Space or A).",
          "When the flag reaches the line on your side, the round is yours.",
          "AI difficulty: easy, medium, hard — on hard it pulls more than 8 times per second.",
          "2 players: the screen splits in two. Left player — A/Space, right player — L/Enter. Both can tap at once (multi-touch).",
        ],
      },
      {
        h: "The real contest",
        p: [
          "Two teams hold opposite ends of a rope with a mark in the middle; the team that pulls the mark past the line on its side wins. Wrapping the rope around a hand or lying on the ground is not allowed.",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Arqon tortish O'zbekistonda Navro'z sayllari, mahalla bayramlari va maktab musobaqalarining sevimli qismi. U nafaqat kuchni, balki jamoaning bir maromda harakat qilishini ham sinaydi.",
          "Arqon tortish 1900–1920-yillarda Olimpiya o'yinlari dasturida bo'lgan. Bugun bu sport bo'yicha xalqaro federatsiya (TWIF) jahon chempionatlarini o'tkazadi.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Перетягивание каната — любимая часть навруз-сайлей, праздников махалли и школьных соревнований в Узбекистане. Оно проверяет не только силу, но и слаженность команды.",
          "Перетягивание каната входило в программу Олимпийских игр с 1900 по 1920 год. Сегодня международная федерация (TWIF) проводит чемпионаты мира.",
        ],
      },
    ],
    en: [
      {
        p: [
          "Tug of war is a favourite part of Navruz fairs, neighbourhood celebrations and school sports days in Uzbekistan. It tests not only strength but how well a team moves together.",
          "Tug of war was an Olympic event from 1900 to 1920. Today the international federation (TWIF) holds world championships.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "Arqon tortishda g'alaba ko'pincha kuchdan ko'ra bir maromda tortishga bog'liq.",
      "Oddiy odam sekundiga taxminan 6–8 marta tugma bosa oladi.",
      "Olimpiya o'yinlarida bu sport 1900–1920-yillarda o'tkazilgan.",
    ],
    ru: [
      "Победа часто зависит не от силы, а от синхронности рывков.",
      "Обычный человек нажимает кнопку примерно 6–8 раз в секунду.",
      "На Олимпиадах этот вид проводился в 1900–1920 годах.",
    ],
    en: [
      "Winning often depends more on pulling in rhythm than on raw strength.",
      "Most people can tap a button about 6–8 times per second.",
      "It was an Olympic sport from 1900 to 1920.",
    ],
  },
};
