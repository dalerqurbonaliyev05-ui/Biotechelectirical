import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Qanday o'ynaladi",
        ul: [
          "Dasturxonga yopiq kartalar terilgan. Ikkitasini oching — bir xil taom bo'lsa, ochiq qoladi.",
          "Har ikki karta ochilishi — bitta harakat. Kamroq harakat va tezroq vaqt — ko'proq ball.",
          "Daraja: oson (12 karta), o'rta (16), qiyin (20).",
          "Vaqt birinchi karta ochilganda boshlanadi.",
          "Klaviatura: Tab bilan kartalar orasida yuring, Enter/Probel bilan oching.",
        ],
      },
    ],
    ru: [
      {
        h: "Как играть",
        ul: [
          "На дастархане разложены закрытые карточки. Откройте две — если угощения совпали, они остаются открытыми.",
          "Каждая пара открытых карт — один ход. Меньше ходов и быстрее — больше очков.",
          "Уровни: лёгкий (12 карт), средний (16), сложный (20).",
          "Время запускается с первой открытой карты.",
          "Клавиатура: Tab — переход между картами, Enter/Пробел — открыть.",
        ],
      },
    ],
    en: [
      {
        h: "How to play",
        ul: [
          "Face-down cards are laid on the dastarkhan. Turn two over — matching dishes stay open.",
          "Each pair you turn is one move. Fewer moves and less time earn more points.",
          "Levels: easy (12 cards), medium (16), hard (20).",
          "The timer starts with the first card.",
          "Keyboard: Tab between cards, Enter/Space to flip.",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Dasturxon (dastarxon) — o'zbek xonadonining yuragi. Mehmon kelganda dasturxon darhol yoziladi: avval non va choy, so'ng mevalar, shirinliklar, keyin issiq taom — ko'pincha palov.",
          "Non dasturxonda alohida hurmatga ega: u qo'l bilan sindiriladi, teskari qo'yilmaydi va yerga tashlanmaydi. Choyni mezbon quyadi; piyolani to'ldirmay, oz-ozdan quyish — mehmonga ko'proq e'tibor ko'rsatish belgisi.",
          "2016-yilda “Palov madaniyati va an'anasi” UNESCO Insoniyatning nomoddiy madaniy merosi ro'yxatiga kiritilgan.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Дастархан — сердце узбекского дома. Когда приходит гость, дастархан накрывают сразу: сначала лепёшки и чай, затем фрукты и сладости, потом горячее — чаще всего плов.",
          "К лепёшке особое уважение: её ломают руками, не кладут вверх дном и не бросают. Чай разливает хозяин; наливать пиалу понемногу, не до краёв, — знак особого внимания к гостю.",
          "В 2016 году «Культура и традиции плова» внесены ЮНЕСКО в список нематериального культурного наследия человечества.",
        ],
      },
    ],
    en: [
      {
        p: [
          "The dastarkhan (table spread) is the heart of an Uzbek home. When a guest arrives it is laid at once: first bread and tea, then fruit and sweets, then a hot dish — very often plov.",
          "Bread is treated with special respect: it's broken by hand, never placed upside down and never thrown away. The host pours the tea; filling the cup only a little at a time is a sign of extra attention to the guest.",
          "In 2016 UNESCO inscribed “Palov culture and tradition” on the list of the Intangible Cultural Heritage of Humanity.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "O'zbekistonda palovning o'nlab hududiy turlari bor: Toshkent, Samarqand, Farg'ona, Buxoro va boshqalar.",
      "Tandir non va tandir somsa loy o'choq — tandirda pishiriladi.",
      "Xotira o'yinlari (juft topish) diqqat va qisqa muddatli xotirani mashq qildiradi.",
    ],
    ru: [
      "В Узбекистане десятки региональных видов плова: ташкентский, самаркандский, ферганский, бухарский и др.",
      "Тандырные лепёшки и самсу пекут в глиняной печи — тандыре.",
      "Игры «найди пару» тренируют внимание и кратковременную память.",
    ],
    en: [
      "Uzbekistan has dozens of regional plov styles: Tashkent, Samarkand, Fergana, Bukhara and more.",
      "Tandir bread and tandir somsa are baked in a clay oven — the tandir.",
      "Matching-pair games train attention and short-term memory.",
    ],
  },
};
