import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Bu o'yinda",
        ul: [
          "Uch daraja: hovli, bog' va bozor. Har birida 5–8 ta bola, hayvon yoki buyum yashiringan.",
          "Ularni bosib toping: har biri +50 ball. Daraja tugasa, qolgan har soniya uchun +5 ball.",
          "Bo'sh joyga bosish 2 soniya oladi — shoshilmang!",
          "💡 Yordam tugmasi yashiringanlardan birini ko'rsatadi, lekin 8 soniya oladi.",
          "Vaqt tugasa, o'yin tugaydi. Pastdagi qatorda nimalarni topish kerakligi ko'rsatilgan.",
          "Klaviatura: Tab bilan yashiringanlar orasida yuring, Enter bilan tanlang.",
        ],
      },
      {
        h: "An'anaviy o'yin",
        p: [
          "Bir bola — “qidiruvchi” ko'zini yumib, sanaydi (masalan, o'ngacha yoki yigirmagacha), qolganlar yashirinadi. So'ng u hammani qidiradi. Birinchi topilgan bola keyingi safar qidiruvchi bo'ladi. Ba'zi joylarda yashiringan bola qidiruvchidan oldin “uy”ga (belgilangan joyga) yugurib kelib qo'lini tegizsa, qutuladi.",
        ],
      },
    ],
    ru: [
      {
        h: "В этой игре",
        ul: [
          "Три уровня: двор, сад и базар. На каждом спрятались 5–8 детей, животных или предметов.",
          "Найдите их нажатием: каждый +50 очков. За каждую оставшуюся секунду уровня — +5.",
          "Нажатие мимо отнимает 2 секунды — не торопитесь!",
          "💡 Подсказка показывает одного спрятавшегося, но стоит 8 секунд.",
          "Время вышло — игра окончена. Внизу показано, кого нужно найти.",
          "Клавиатура: Tab — переход между спрятавшимися, Enter — выбор.",
        ],
      },
      {
        h: "Традиционная игра",
        p: [
          "Один ребёнок — «водящий» — закрывает глаза и считает (например, до десяти или двадцати), остальные прячутся. Затем он ищет всех. Найденный первым водит в следующий раз. Кое-где спрятавшийся спасается, если добежит до «дома» раньше водящего.",
        ],
      },
    ],
    en: [
      {
        h: "In this game",
        ul: [
          "Three levels: courtyard, garden and bazaar. Each hides 5–8 children, animals or objects.",
          "Tap to find them: +50 points each. When a level is cleared, +5 for every second left.",
          "Tapping empty space costs 2 seconds — take your time!",
          "💡 Hint reveals one hider but costs 8 seconds.",
          "When time runs out, the game ends. The row below shows what to find.",
          "Keyboard: Tab moves between hiders, Enter selects.",
        ],
      },
      {
        h: "The traditional game",
        p: [
          "One child — the “seeker” — closes their eyes and counts (say, to ten or twenty) while the others hide, then searches for everyone. The first one found becomes the next seeker. In some places a hider is safe if they reach “home” before the seeker.",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Bekinmachoq — eng qadimiy va eng keng tarqalgan bolalar o'yinlaridan biri. O'zbek hovlilaridagi so'ri, tandir, daraxtlar va bog'lardagi ishkomlar yashirinish uchun ajoyib joy bo'lgan.",
          "O'yin boshida kim qidiruvchi bo'lishini aniqlash uchun bolalar sanoq she'rlari (sanamalar) aytishgan. Bekinmachoq diqqat, kuzatuvchanlik va sabrni o'rgatadi.",
          "Bu o'yin dunyoning deyarli barcha xalqlarida bor: ruschada “прятки”, inglizchada “hide-and-seek”.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Бекинмачок — одна из древнейших и самых распространённых детских игр. Топчаны-сури, тандыры, деревья узбекских дворов и виноградные навесы в садах были отличными укрытиями.",
          "Чтобы выбрать водящего, дети произносили считалки. Игра учит вниманию, наблюдательности и терпению.",
          "Эта игра есть почти у всех народов мира: по-русски «прятки», по-английски «hide-and-seek».",
        ],
      },
    ],
    en: [
      {
        p: [
          "Bekinmachoq is one of the oldest and most widespread children's games. The raised platforms (so'ri), clay ovens (tandir) and trees of Uzbek courtyards and the grape trellises of gardens made perfect hiding places.",
          "Counting rhymes were used to choose the seeker. The game teaches attention, observation and patience.",
          "Almost every culture has it: “prjatki” in Russian, “hide-and-seek” in English.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "So'ri — hovlida qo'yiladigan baland yog'och supa; yozda ustida dam olinadi va choy ichiladi.",
      "Tandir — non va somsa yopiladigan loy o'choq.",
      "Ishkom — uzum toklari uchun qurilgan so'ri-ayvon.",
    ],
    ru: [
      "Сури — высокий деревянный топчан во дворе; летом на нём отдыхают и пьют чай.",
      "Тандыр — глиняная печь для лепёшек и самсы.",
      "Ишком — навес-шпалера для виноградной лозы.",
    ],
    en: [
      "A so'ri is a raised wooden platform in the yard for resting and drinking tea in summer.",
      "A tandir is a clay oven for baking bread and somsa.",
      "An ishkom is a trellis canopy for grapevines.",
    ],
  },
};
