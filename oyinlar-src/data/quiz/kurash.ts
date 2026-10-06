import type { QuizItem } from "@/components/games/common/Quiz";

// Manba: Xalqaro kurash assotsiatsiyasi (IKA) qoidalari, Osiyo o'yinlari 2018 natijalari.
export const KURASH_QUIZ: QuizItem[] = [
  {
    q: {
      uz: "Kurashda yerda (parterda) kurashni davom ettirish mumkinmi?",
      ru: "Можно ли в кураше продолжать борьбу в партере (на земле)?",
      en: "Can a kurash bout continue on the ground (groundwork)?",
    },
    options: {
      uz: ["Yo'q, kurash faqat tik turgan holda olib boriladi", "Ha, 20 soniyagacha", "Ha, cheklovsiz", "Faqat oxirgi daqiqada"],
      ru: ["Нет, кураш ведётся только в стойке", "Да, до 20 секунд", "Да, без ограничений", "Только в последнюю минуту"],
      en: ["No, kurash is fought standing only", "Yes, for up to 20 seconds", "Yes, without limits", "Only in the final minute"],
    },
    answer: 0,
    explain: {
      uz: "Kurashning asosiy xususiyati — yerda ushlab turish, bo'g'ish va og'riq usullari yo'q.",
      ru: "Главная особенность кураша — нет борьбы в партере, удушающих и болевых приёмов.",
      en: "Kurash's defining feature: no ground holds, chokes or joint locks.",
    },
  },
  {
    q: { uz: "Kurashda eng yuqori baho qaysi?", ru: "Какая оценка в кураше высшая?", en: "Which is the highest score in kurash?" },
    options: ["Halol", "Yonbosh", "Chala", "Tanbeh"],
    answer: 0,
    explain: {
      uz: "Halol — raqibni chiroyli va aniq usul bilan kurakka tashlash, toza g'alaba.",
      ru: "Халол — чистая победа: соперник брошен на спину красивым и точным приёмом.",
      en: "Halol is outright victory: the opponent is thrown flat on the back with a clean technique.",
    },
  },
  {
    q: {
      uz: "Raqib kuchli va keskin usul bilan yonboshiga tashlansa, qanday baho beriladi?",
      ru: "Какая оценка, если соперник брошен на бок сильным резким приёмом?",
      en: "What score is given when the opponent is thrown onto their side with a strong, sharp technique?",
    },
    options: ["Yonbosh", "Halol", "Chala", "Dakki"],
    answer: 0,
  },
  {
    q: { uz: "Ikki marta “yonbosh” nimaga teng?", ru: "Чему равны два «ёнбоша»?", en: "Two “yonbosh” scores equal…?" },
    options: {
      uz: ["Halol", "Chala", "Tanbeh", "Hech narsaga"],
      ru: ["Халол", "Чала", "Танбех", "Ничему"],
      en: ["Halol", "Chala", "Tanbeh", "Nothing"],
    },
    answer: 0,
    explain: {
      uz: "Ikki yonbosh halolga tenglashadi va bellashuv tugaydi.",
      ru: "Два ёнбоша приравниваются к халолу, и схватка заканчивается.",
      en: "Two yonbosh equal a halol and the bout ends.",
    },
  },
  {
    q: { uz: "Kurashdagi birinchi jarima qanday ataladi?", ru: "Как называется первое наказание в кураше?", en: "What is the first penalty in kurash called?" },
    options: ["Tanbeh", "Dakki", "G'irrom", "Chala"],
    answer: 0,
    explain: {
      uz: "Jarimalar ketma-ketligi: tanbeh → dakki → g'irrom.",
      ru: "Порядок наказаний: танбех → дакки → гирром.",
      en: "Penalty order: tanbeh → dakki → g'irrom.",
    },
  },
  {
    q: { uz: "“G'irrom” jarimasi nimani anglatadi?", ru: "Что означает наказание «гирром»?", en: "What does the “g'irrom” penalty mean?" },
    options: {
      uz: ["Diskvalifikatsiya (mag'lubiyat)", "Og'zaki ogohlantirish", "Bir ball qo'shish", "Bellashuvni qayta boshlash"],
      ru: ["Дисквалификация (поражение)", "Устное предупреждение", "Добавление балла", "Перезапуск схватки"],
      en: ["Disqualification (loss)", "A verbal warning", "An extra point", "Restarting the bout"],
    },
    answer: 0,
  },
  {
    q: {
      uz: "Xalqaro kurash assotsiatsiyasi (IKA) qayerda tashkil etilgan?",
      ru: "Где была основана Международная ассоциация кураша (IKA)?",
      en: "Where was the International Kurash Association (IKA) founded?",
    },
    options: {
      uz: ["Toshkentda", "Samarqandda", "Jakartada", "Tokioda"],
      ru: ["В Ташкенте", "В Самарканде", "В Джакарте", "В Токио"],
      en: ["Tashkent", "Samarkand", "Jakarta", "Tokyo"],
    },
    answer: 0,
    explain: {
      uz: "IKA 1998-yilda Toshkentda tashkil topgan.",
      ru: "IKA основана в 1998 году в Ташкенте.",
      en: "The IKA was founded in Tashkent in 1998.",
    },
  },
  {
    q: {
      uz: "Kurash Osiyo o'yinlari dasturiga birinchi marta qaysi yili kiritilgan?",
      ru: "В каком году кураш впервые вошёл в программу Азиатских игр?",
      en: "In which year did kurash debut at the Asian Games?",
    },
    options: ["2018", "2002", "2010", "1998"],
    answer: 0,
    explain: {
      uz: "2018-yilgi Osiyo o'yinlari (Jakarta–Palembang, Indoneziya).",
      ru: "Азиатские игры 2018 года (Джакарта–Палембанг, Индонезия).",
      en: "The 2018 Asian Games in Jakarta–Palembang, Indonesia.",
    },
  },
  {
    q: {
      uz: "Kurashda raqibning oyog'idan yoki shimidan qo'l bilan ushlash mumkinmi?",
      ru: "Можно ли в кураше хватать соперника рукой за ноги или брюки?",
      en: "May a kurash wrestler grab the opponent's legs or trousers?",
    },
    options: {
      uz: ["Yo'q, bu qoidabuzarlik", "Ha, istalgan paytda", "Faqat chap qo'l bilan", "Faqat hakam ruxsati bilan"],
      ru: ["Нет, это нарушение", "Да, в любой момент", "Только левой рукой", "Только с разрешения судьи"],
      en: ["No, it is a violation", "Yes, at any time", "Only with the left hand", "Only with the referee's permission"],
    },
    answer: 0,
    explain: {
      uz: "Ushlash faqat beldan yuqorida — yaktak va belbog'dan. Oyoqlar faqat chalish uchun ishlatiladi.",
      ru: "Захваты — только выше пояса: за куртку и пояс. Ноги используются лишь для подсечек.",
      en: "Grips are above the belt only — jacket and belt. Legs are used only for sweeps and trips.",
    },
  },
  {
    q: {
      uz: "Xalqaro kurash musobaqalarida hakamlar baholarni qaysi tilda e'lon qiladi?",
      ru: "На каком языке судьи объявляют оценки на международных турнирах по курашу?",
      en: "In which language do referees announce scores at international kurash events?",
    },
    options: {
      uz: ["O'zbek tilida", "Ingliz tilida", "Yapon tilida", "Har mamlakat o'z tilida"],
      ru: ["На узбекском", "На английском", "На японском", "Каждая страна на своём"],
      en: ["Uzbek", "English", "Japanese", "Each country in its own language"],
    },
    answer: 0,
    explain: {
      uz: "Halol, yonbosh, chala, tanbeh — bu atamalar butun dunyoda o'zbekcha aytiladi.",
      ru: "Халол, ёнбош, чала, танбех — эти термины во всём мире звучат по-узбекски.",
      en: "Halol, yonbosh, chala, tanbeh — these terms are used in Uzbek worldwide.",
    },
  },
  {
    q: {
      uz: "“Chala” bahosi qachon beriladi?",
      ru: "Когда присуждается оценка «чала»?",
      en: "When is a “chala” awarded?",
    },
    options: {
      uz: [
        "Tashlash sekin yoki texnik xatolar bilan bajarilsa",
        "Raqib kurakka toza tushsa",
        "Kurashchi gilamdan qochsa",
        "Bellashuv vaqti tugasa",
      ],
      ru: [
        "Если бросок выполнен медленно или с техническими ошибками",
        "Если соперник чисто упал на спину",
        "Если борец убегает с ковра",
        "Когда истекло время схватки",
      ],
      en: [
        "When a throw is slow or has technical flaws",
        "When the opponent lands cleanly on the back",
        "When a wrestler runs off the mat",
        "When the bout time runs out",
      ],
    },
    answer: 0,
  },
  {
    q: {
      uz: "Osiyo o'yinlari 2018 da erkaklar o'rtasida qaysi vazn toifasi bo'lgan?",
      ru: "Какая весовая категория была у мужчин на Азиатских играх 2018?",
      en: "Which men's weight class was contested at the 2018 Asian Games?",
    },
    options: ["−81 kg", "−48 kg", "−55 kg", "−120 kg"],
    answer: 0,
    explain: {
      uz: "Erkaklar: −66, −81, −90, +90 kg; ayollar: −52, −63, −78 kg.",
      ru: "Мужчины: −66, −81, −90, +90 кг; женщины: −52, −63, −78 кг.",
      en: "Men: −66, −81, −90, +90 kg; women: −52, −63, −78 kg.",
    },
  },
];
