import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Qanday o'ynaladi",
        ul: [
          "Har raundda 10 ta maqol beriladi: maqolning boshi ko'rsatiladi, siz to'rt variantdan to'g'ri davomini tanlaysiz.",
          "To'g'ri javob — 100 ball, ketma-ket to'g'ri javoblar seriyasi uchun qo'shimcha ball.",
          "Tez javob bersangiz, vaqt bonusi beriladi.",
          "Klaviatura: 1–4 raqamlari bilan javob tanlang, Enter — keyingi savol.",
        ],
      },
      {
        h: "Til haqida",
        p: ["Maqollar o'zbek tilida beriladi — ularning ohangi va qofiyasi asl tilda saqlanadi."],
      },
    ],
    ru: [
      {
        h: "Как играть",
        ul: [
          "В каждом раунде 10 пословиц: показано начало, вы выбираете верное окончание из четырёх.",
          "Верный ответ — 100 очков, плюс бонус за серию правильных ответов.",
          "За быстрые ответы — бонус времени.",
          "Клавиатура: 1–4 — выбор ответа, Enter — следующий вопрос.",
        ],
      },
      {
        h: "О языке",
        p: ["Пословицы даны на узбекском — так сохраняются их ритм и рифма."],
      },
    ],
    en: [
      {
        h: "How to play",
        ul: [
          "Each round has 10 proverbs: you see the beginning and pick the right ending from four options.",
          "A correct answer is 100 points, plus a bonus for answer streaks.",
          "Fast answers earn a time bonus.",
          "Keyboard: 1–4 to answer, Enter for the next question.",
        ],
      },
      {
        h: "About the language",
        p: ["The proverbs are in Uzbek to keep their rhythm and rhyme."],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Maqol — xalqning ko'p asrlik tajribasi va donoligi jamlangan qisqa, ta'sirli hikmatli gap. Maqollar mehnat, ilm, do'stlik, odob va vatanparvarlik haqida bo'ladi.",
          "Maqollar odatda ikki qismdan iborat bo'lib, ular qofiya yoki zidlik bilan bog'lanadi: “Yaxshidan bog' qoladi, yomondan — dog'.” Shuning uchun ularni boshidan davomini topish qiziqarli mashq.",
          "O'zbek maqollari ko'plab to'plamlarga yig'ilgan; Mahmud Koshg'ariyning “Devonu lug'otit turk” asarida ham qadimgi turkiy maqollar keltirilgan.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Пословица — короткое меткое изречение, в котором собран многовековой опыт и мудрость народа: о труде, знаниях, дружбе, воспитании и любви к родине.",
          "Узбекские пословицы обычно состоят из двух частей, связанных рифмой или противопоставлением: «Yaxshidan bog' qoladi, yomondan — dog'» («От доброго остаётся сад, от злого — пятно»). Поэтому угадывать окончание — увлекательное упражнение.",
          "Узбекские пословицы собраны во многих сборниках; древнетюркские пословицы есть уже в «Дивану лугат ат-турк» Махмуда Кашгари.",
        ],
      },
    ],
    en: [
      {
        p: [
          "A proverb (maqol) is a short, vivid saying that holds centuries of folk experience and wisdom — about work, learning, friendship, manners and love of the homeland.",
          "Uzbek proverbs usually have two halves linked by rhyme or contrast: “Yaxshidan bog' qoladi, yomondan — dog'” (“The good leave a garden, the bad leave a stain”). That makes guessing the ending a fun exercise.",
          "Uzbek proverbs have been gathered in many collections; old Turkic proverbs already appear in Mahmud al-Kashgari's “Diwan Lughat al-Turk”.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "“Yetti o'lchab, bir kes” — ko'p xalqlarda bor maqol: ruschada ham shunday.",
      "Ko'p maqollarda raqamlar uchraydi: bir, yetti, qirq, ming — ular ta'sirchanlikni oshiradi.",
      "Maqol bilan matalning farqi: maqol to'liq hukm aytadi, matal esa ko'chma ifoda bo'lib qoladi.",
    ],
    ru: [
      "«Семь раз отмерь, один раз отрежь» есть и в узбекском: «Yetti o'lchab, bir kes».",
      "В пословицах часто встречаются числа — один, семь, сорок, тысяча — для выразительности.",
      "Пословица выражает законченную мысль, а поговорка (матал) — лишь образное выражение.",
    ],
    en: [
      "“Measure seven times, cut once” exists in Uzbek too: “Yetti o'lchab, bir kes”.",
      "Numbers — one, seven, forty, a thousand — appear often in proverbs for emphasis.",
      "A proverb states a complete thought, while a saying (matal) is just a figurative phrase.",
    ],
  },
};
