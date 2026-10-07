import type { GameContent } from "./types";

export const content: GameContent = {
  rules: {
    uz: [
      {
        h: "Haqiqiy o'yin",
        p: [
          "Besh tosh beshta silliq tosh bilan o'ynaladi. O'yinchi toshlarni yerga sochadi, bittasini havoga otadi va u qaytib tushguncha yerdagi toshlarni oladi, so'ng otilgan toshni havoda tutadi.",
        ],
        ul: [
          "Birlik — yerdagi toshlar bittadan olinadi (4 marta otish).",
          "Ikkilik — ikkitadan (2 marta otish).",
          "Uchlik — avval uchta, keyin bitta.",
          "To'rtlik — to'rttasi birdaniga.",
          "Tosh tushib ketsa yoki boshqa toshga tegib ketilsa, navbat keyingi o'yinchiga o'tadi.",
        ],
      },
      {
        h: "Bu o'yinda qanday o'ynaladi",
        ul: [
          "“Ot” — toshni havoga otasiz.",
          "Tosh ko'tarilayotganda (yashil zona) “Ol” ni bosing — yerdagi toshlar qo'lga olinadi.",
          "Tosh qaytib tushayotganda (oltin zona) “Tut” ni bosing.",
          "5- va 6-bosqichda tutishdan oldin “Qarsak” ham chalish kerak.",
          "Xato — bitta jon ketadi va otish qaytariladi. 3 ta jon bor.",
          "Ball: bosqich qancha yuqori va tutish qancha aniq bo'lsa, shuncha ko'p.",
          "Boshqaruv: ekranni yoki tugmani bosing; klaviaturada Probel yoki Enter.",
        ],
      },
    ],
    ru: [
      {
        h: "Настоящая игра",
        p: [
          "В беш тош играют пятью гладкими камешками. Игрок рассыпает камни, подбрасывает один и, пока он в воздухе, подбирает камни с земли, а затем ловит подброшенный.",
        ],
        ul: [
          "Единички — камни подбирают по одному (4 броска).",
          "Двойки — по два (2 броска).",
          "Тройки — сначала три, потом один.",
          "Четвёрки — все четыре сразу.",
          "Если камень упал или задеты другие камни, ход переходит к следующему игроку.",
        ],
      },
      {
        h: "Как играть здесь",
        ul: [
          "«Бросок» — подбрасываете камень.",
          "Пока камень летит вверх (зелёная зона), жмите «Взять» — камни с земли в руке.",
          "Когда камень падает (золотая зона), жмите «Поймать».",
          "На 5-м и 6-м этапах перед ловлей нужно ещё «хлопнуть».",
          "Ошибка — минус одна жизнь, бросок повторяется. Жизней 3.",
          "Очки: чем выше этап и точнее ловля, тем больше.",
          "Управление: касание экрана или кнопки; на клавиатуре Пробел или Enter.",
        ],
      },
    ],
    en: [
      {
        h: "The real game",
        p: [
          "Besh tosh (“five stones”) is played with five smooth pebbles. The player scatters them, tosses one into the air, picks up stones from the ground before it comes down, then catches the tossed stone.",
        ],
        ul: [
          "Ones — pick up the ground stones one at a time (4 tosses).",
          "Twos — two at a time (2 tosses).",
          "Threes — three, then one.",
          "Fours — all four at once.",
          "Dropping the stone or touching the wrong stone passes the turn.",
        ],
      },
      {
        h: "How to play here",
        ul: [
          "“Toss” throws the stone up.",
          "While it rises (green zone) press “Grab” to pick up the ground stones.",
          "As it falls (gold zone) press “Catch”.",
          "On stages 5 and 6 you must also “Clap” before catching.",
          "A mistake costs one life and the toss is repeated. You have 3 lives.",
          "Score: higher stages and more precise catches earn more.",
          "Controls: tap the screen or the button; Space or Enter on a keyboard.",
        ],
      },
    ],
  },
  history: {
    uz: [
      {
        p: [
          "Besh tosh — O'zbekistonda, ayniqsa qizlar orasida keng tarqalgan an'anaviy o'yin. U qo'l chaqqonligi, diqqat va vaqtni his qilishni rivojlantiradi. Toshlar ariq bo'yidan yoki daryo sohilidan tanlab olinadi — silliq va bir xil kattalikda bo'lishi kerak.",
          "Bunday “toshlar o'yini” dunyoning ko'p xalqlarida bor: qadimgi yunonlar uni “pentalita” (besh tosh) deb atagan, inglizlar “jacks” yoki “knucklebones” deb ataydi, koreyslarda “gonggi” deyiladi.",
        ],
      },
    ],
    ru: [
      {
        p: [
          "Беш тош — традиционная игра, широко распространённая в Узбекистане, особенно среди девочек. Она развивает ловкость рук, внимание и чувство времени. Камешки выбирают у арыка или на берегу реки — гладкие и одинаковые по размеру.",
          "Подобные «игры в камешки» есть у многих народов: древние греки называли её «пенталита» (пять камней), англичане — «jacks» или «knucklebones», в Корее — «гонги».",
        ],
      },
    ],
    en: [
      {
        p: [
          "Besh tosh is a traditional game popular across Uzbekistan, especially among girls. It trains hand dexterity, focus and timing. Players pick smooth stones of similar size from a canal bank or riverside.",
          "Similar stone games exist all over the world: the ancient Greeks called it “pentalitha” (five stones), in English it is “jacks” or “knucklebones”, and in Korea “gonggi”.",
        ],
      },
    ],
  },
  facts: {
    uz: [
      "O'yin uchun maxsus jihoz kerak emas — beshta tosh kifoya.",
      "Bosqichlar nomi sanoqdan olingan: birlik, ikkilik, uchlik, to'rtlik.",
      "Qadimgi Yunoniston va Rim san'atida toshcha va to'piq suyaklari bilan o'ynayotgan qizlar tasvirlangan.",
    ],
    ru: [
      "Для игры не нужно специального инвентаря — хватит пяти камней.",
      "Названия этапов происходят от счёта: единички, двойки, тройки, четвёрки.",
      "В искусстве Древней Греции и Рима есть изображения девушек, играющих камешками и костями.",
    ],
    en: [
      "No special equipment is needed — five stones are enough.",
      "The stage names come from counting: ones, twos, threes, fours.",
      "Ancient Greek and Roman art shows girls playing with pebbles and knucklebones.",
    ],
  },
};
