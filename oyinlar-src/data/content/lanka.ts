import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Haqiqiy o'yin",
        p: [
          "Lanka — kichkina qo'rg'oshin bo'lagiga mo'yna yoki jun tutami bog'lab yasaladi. O'yinchi uni oyog'ining ichki tomoni bilan qayta-qayta tepib, yerga tushirmaslikka harakat qiladi. Kim ko'p marta tepsa, o'sha yutadi.",
        ],
      },
      {
        h: "Bu o'yinda",
        ul: [
          "Ekranni bosing (yoki Probel/↑) — lanka yuqoriga sakraydi.",
          "Ustunlar orasidagi bo'shliqdan o'ting — har biri +1 ball.",
          "Lanka yerga tushsa yoki ustunga tegsa — o'yin tugaydi.",
          "Tezlik asta-sekin ortadi, bo'shliqlar torayadi.",
        ],
      },
    ],
    ru: [
      {
        h: "Настоящая игра",
        p: [
          "Ланка — кусочек свинца с привязанным пучком меха или шерсти. Игрок подбивает её внутренней стороной стопы, стараясь не уронить. Побеждает тот, кто сделает больше ударов подряд.",
        ],
      },
      {
        h: "В этой игре",
        ul: [
          "Нажимайте на экран (или Пробел/↑) — ланка подскакивает.",
          "Пролетайте в просвет между столбами — каждый +1 очко.",
          "Ланка упала или задела столб — игра окончена.",
          "Скорость постепенно растёт, просветы сужаются.",
        ],
      },
    ],
    en: [
      {
        h: "The real game",
        p: [
          "A lanka is a small piece of lead with a tuft of fur or wool tied to it. Players kick it up again and again with the inside of the foot, trying not to let it drop. The most kicks in a row wins.",
        ],
      },
      {
        h: "In this game",
        ul: [
          "Tap the screen (or Space/↑) — the lanka bounces up.",
          "Fly through the gaps between posts — +1 point each.",
          "If the lanka hits the ground or a post, the game ends.",
          "Speed slowly increases and gaps get narrower.",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Lanka o'zbek o'g'il bolalari orasida, ayniqsa mahalla ko'chalarida juda mashhur bo'lgan. U oyoq chaqqonligi, muvozanat va chidamlilikni rivojlantiradi. Lanka uyda tayyorlanardi: qo'rg'oshin eritilib, yassi qilib quyilar, ustiga junli teri bo'lagi mahkamlanardi.",
          "Shunga o'xshash tepish o'yinlari boshqa xalqlarda ham bor: Xitoyda “jianzi”, Koreyada “jegichagi”, zamonaviy sportda esa “hacky sack”.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Ланка была очень популярна у узбекских мальчишек, особенно на махаллинских улицах. Она развивает ловкость ног, равновесие и выносливость. Ланку делали дома: плавили свинец, отливали плоскую шайбу и крепили сверху кусочек меха.",
          "Похожие игры есть у других народов: в Китае — «цзяньцзы», в Корее — «чегичаги», в современном спорте — «hacky sack».",
        ],
      },
    ],
    en: [
      {
        p: [
          "Lanka was hugely popular among Uzbek boys, especially in neighbourhood streets. It builds footwork, balance and stamina. A lanka was homemade: lead was melted into a flat disc and a piece of furry hide was fixed on top.",
          "Similar kicking games exist elsewhere: “jianzi” in China, “jegichagi” in Korea, and “hacky sack” today.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "Mohir o'yinchilar lankani juda uzoq vaqt yerga tushirmay tepa olgan.",
      "Mo'yna tutami lankani havoda sekinlashtiradi va doim qo'rg'oshin tomoni pastga qarab tushadi.",
      "Bugun xavfsizlik uchun qo'rg'oshin o'rniga boshqa og'irliklar ishlatish tavsiya etiladi.",
    ],
    ru: [
      "Опытные игроки могли очень долго не давать ланке упасть.",
      "Пучок меха тормозит ланку в воздухе, и она всегда падает свинцом вниз.",
      "Сегодня из соображений безопасности вместо свинца лучше использовать другие грузики.",
    ],
    en: [
      "Skilled players could keep a lanka in the air for a very long time.",
      "The fur tuft slows it down and keeps the lead side facing down.",
      "For safety, other weights are recommended today instead of lead.",
    ],
  },
};
