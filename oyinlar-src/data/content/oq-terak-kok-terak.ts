import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Bu o'yinda",
        ul: [
          "Markazdagi taxtachaga qarang: “Oq terak!” — yurish mumkin, “Ko'k terak!” — to'xtash kerak.",
          "Yurish uchun katta tugmani bosib turing (klaviaturada Probel). Qo'yib yuborsangiz — to'xtaysiz.",
          "“Ko'k terak” paytida bosib tursangiz — ushlanasiz va yutqazasiz. Reaksiya uchun bir lahza vaqt beriladi.",
          "Yakka rejim: 45 soniya ichida marraga yeting. Tezroq yetsangiz — ko'proq ball.",
          "2 kishilik rejim: ekran ikki yarmi — har kim o'z tugmasini bosib turadi (A/Probel va L/Enter). Birinchi yetgan yoki raqibi ushlangan o'yinchi yutadi.",
        ],
      },
      {
        h: "An'anaviy o'yin qanday o'ynaladi",
        p: [
          "Haqiqiy “Oq terakmi, ko'k terak” — ikki jamoali o'yin. Jamoalar bir-biriga qarama-qarshi qator bo'lib qo'l ushlashib turadi. Bir jamoa: “Oq terakmi, ko'k terak, bizdan sizga kim kerak?” deb so'raydi, ikkinchisi raqib jamoadan bir kishini chaqiradi. Chaqirilgan o'yinchi yugurib kelib, qo'l ushlashgan zanjirni uzishga harakat qiladi: uzsa — bir o'yinchini o'z jamoasiga olib ketadi, uzolmasa — shu jamoada qoladi.",
          "Bu yerdagi raqamli versiya o'yin nomi va qichqiriqlaridan ilhomlangan “yur-to'xta” mexanikasidir.",
        ],
      },
    ],
    ru: [
      {
        h: "В этой игре",
        ul: [
          "Смотрите на табло: «Oq terak!» (Белый тополь) — можно идти, «Ko'k terak!» (Синий тополь) — стоп.",
          "Чтобы идти, удерживайте большую кнопку (на клавиатуре — Пробел). Отпустили — стоите.",
          "Если держите кнопку во время «Ko'k terak» — вас поймали. На реакцию даётся мгновение.",
          "Один игрок: дойдите до финиша за 45 секунд. Чем быстрее — тем больше очков.",
          "Вдвоём: экран делится пополам — у каждого своя кнопка (A/Пробел и L/Enter). Побеждает дошедший первым или тот, чей соперник попался.",
        ],
      },
      {
        h: "Как играют в традиционную игру",
        p: [
          "Настоящая «Ок теракми, кок терак» — командная игра. Две команды стоят шеренгами друг напротив друга, взявшись за руки. Одна кричит: «Белый тополь, синий тополь, кто вам нужен от нас?», другая называет игрока соперников. Названный разбегается и пытается разорвать цепь: если разорвал — уводит одного игрока в свою команду, если нет — остаётся в этой команде.",
          "Цифровая версия здесь — механика «иди-стой», вдохновлённая названием и выкриками игры.",
        ],
      },
    ],
    en: [
      {
        h: "In this game",
        ul: [
          "Watch the board: “Oq terak!” (White poplar) — you may move, “Ko'k terak!” (Blue poplar) — freeze.",
          "Hold the big button to walk (Space on a keyboard). Let go to stop.",
          "Holding during “Ko'k terak” gets you caught. You get a split second to react.",
          "Solo: reach the finish within 45 seconds. Faster means more points.",
          "2 players: the screen splits in two — each holds their own button (A/Space and L/Enter). First to finish, or whoever's rival gets caught, wins.",
        ],
      },
      {
        h: "How the traditional game is played",
        p: [
          "The real “Oq terakmi, ko'k terak” is a team game. Two teams stand in lines facing each other, holding hands. One team calls: “White poplar, blue poplar, who do you want from us?” and the other names a player from the opposing side. That player runs at the line and tries to break through the linked hands: if they break it, they take one player back to their team; if not, they stay.",
          "The digital version here is a “go/stop” mechanic inspired by the game's name and chant.",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "“Oq terakmi, ko'k terak” — o'zbek bolalarining eng mashhur ommaviy o'yinlaridan biri. Uni maktab hovlilari, mahalla va bog'larda katta guruhlar bo'lib o'ynashgan. O'yin jamoaviylik, kuch va tezlikni sinaydi.",
          "Terak — O'zbekistonda ariq bo'ylari va yo'l chetlariga keng ekiladigan daraxt; o'yin nomida ana shu daraxt tilga olinadi. Oq terakning barglari orqa tomondan oqish bo'ladi.",
          "Shunga o'xshash o'yin ingliz tilida “Red Rover” deb ataladi.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "«Ок теракми, кок терак» — одна из самых популярных массовых игр узбекских детей. В неё играли большими группами в школьных дворах, махаллях и садах. Игра проверяет командный дух, силу и скорость.",
          "Тополь — дерево, которое в Узбекистане широко сажают вдоль арыков и дорог; именно оно упоминается в названии игры. У белого тополя листья с изнанки беловатые.",
          "Похожая игра по-английски называется «Red Rover».",
        ],
      },
    ],
    en: [
      {
        p: [
          "“Oq terakmi, ko'k terak” is one of the best-loved group games of Uzbek children, played in large groups in school yards, neighbourhoods and orchards. It tests teamwork, strength and speed.",
          "Poplars are planted widely along canals and roads in Uzbekistan, and the game's name refers to them. White poplar leaves are whitish underneath.",
          "A similar game in English is called “Red Rover”.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "O'yinda jamoalar soni teng bo'lishi shart emas — ishtirokchilar o'yin davomida jamoadan jamoaga o'tib turadi.",
      "Qichqiriq so'zlari hududga qarab biroz o'zgaradi, lekin “Oq terakmi, ko'k terak” boshlanishi deyarli hamma joyda bir xil.",
      "Bu yerdagi “yur-to'xta” mexanikasi diqqat va reaksiyani mashq qildiradi.",
    ],
    ru: [
      "Команды не обязаны быть равными — игроки по ходу игры переходят из одной в другую.",
      "Слова кричалки немного различаются по регионам, но начало «Oq terakmi, ko'k terak» почти везде одинаково.",
      "Механика «иди-стой» тренирует внимание и реакцию.",
    ],
    en: [
      "Teams don't have to be equal — players move between teams as the game goes on.",
      "The chant varies a little by region, but the opening “Oq terakmi, ko'k terak” is almost universal.",
      "The go/stop mechanic here trains attention and reaction time.",
    ],
  },
};
