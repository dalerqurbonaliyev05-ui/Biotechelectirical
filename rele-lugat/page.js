/* =========================================================
   Rele Lug'at — yuklab olish sahifasi
   1. Sozlamalar (config.js)   2. i18n (UZ / RU / EN)
   3. Navigatsiya              4. Reveal
   5. Ekranlar karuseli        6. QR — doska rejimi
   Til tanlovi bosh sahifa bilan umumiy: localStorage['energyvibe-lang'].
   ========================================================= */
(function () {
    'use strict';

    const CFG = window.RELE_LUGAT || {};
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 2. Tarjimalar ---------- */
    const I18N = {
        uz: {
            title: 'Rele Lug‘at — releli himoya o‘quv ilovasi: Android (APK) va iPhone | EnergyVibe',
            meta: 'Rele Lug‘at — releli himoya fanini o‘ynab o‘rganish uchun bepul ilova: Android uchun APK, iPhone va brauzer uchun veb-ilova. 214 atama, 24 sxema, 170 test savoli. Internetsiz ishlaydi, 3 tilda.',
            skip: 'Asosiy mazmunga o‘tish',
            'nav.about': 'Men haqimda', 'nav.tools': 'Vositalar', 'nav.skills': 'Yo‘nalishlar', 'nav.projects': 'Loyihalar', 'nav.contact': 'Aloqa', 'nav.app': 'Rele Lug‘at',

            'hero.eyebrow': 'Android · iPhone · Releli himoya',
            'hero.lead': 'Releli himoyani yodlamang — o‘ynab o‘rganing: sxemani o‘zingiz yig‘ing, har bir xatoga tushuntirish oling.',
            'hero.download': 'Android: APK yuklab olish',
            'hero.version': 'Versiya', 'unit.mb': 'MB', 'hero.only': 'Faqat Android',
            'hero.watch': '30 soniyalik videoni ko‘rish ↓',
            'hero.iconSub': 'Releli himoya · 1–15 ma’ruza',
            'float.terms': 'atama', 'float.circuits': 'sxema', 'float.offline': 'offline',

            'feat.station': 'Imkoniyatlar', 'feat.title': 'Ilovada nimalar bor',
            'feat.lead': 'Barcha ta’rif, formula va savollar “Releli himoya” fanining 1–15 ma’ruzalaridan olingan.',
            'feat.terms.t': 'atama', 'feat.terms.d': 'Har bir atama ma’ruza manbasi bilan: ta’rif, formula va qayerda ishlatilishi.',
            'feat.circ.t': 'sxema — o‘zingiz yig‘asiz', 'feat.circ.d': 'Detallarni sudrab joyiga qo‘ying. Zanjir to‘g‘ri yopilsa, sxema bo‘ylab tok yuguradi.',
            'feat.quiz.t': 'test savoli', 'feat.quiz.d': 'Har ma’ruzaga 10 tadan ortiq savol. Xato javobda ma’ruzadan tushuntirish chiqadi.',
            'feat.flash.t': 'Flashcard', 'feat.flash.d': 'Oraliqli takrorlash (Leitner, 5 quti): unutilayotgan atama o‘z vaqtida qaytib keladi.',
            'feat.path.t': 'ma’ruza — o‘quv yo‘li', 'feat.path.d': 'Tarmoq xaritasi: har ma’ruza — podstansiya. Testdan o‘tsangiz, u energiyalanadi.',
            'feat.calc.t': 'hisoblagich', 'feat.calc.d': 'MTH, tok kesimi va boshqa formulalar — qadamma-qadam yechim bilan.',
            'feat.off.t': 'Internetsiz ishlaydi', 'feat.off.d': 'Bir marta o‘rnating — keyin internet kerak emas. Progressingiz faqat telefonda saqlanadi.',
            'feat.lang.t': 'til', 'feat.lang.d': 'O‘zbekcha, ruscha, inglizcha — interfeys ham, butun kontent ham.',

            'scr.station': 'Ekranlar', 'scr.title': 'Ilovadan haqiqiy kadrlar',
            'scr.lead': 'Telefondan olingan skrinshotlar — ilova aynan shunday ko‘rinadi.',
            'scr.c1': 'Bosh ekran: bugungi atama, daraja va seriya', 'scr.c2': 'Sxema konstruktori',
            'scr.c3': 'Lug‘at: 214 atama, qidiruv va filtr', 'scr.c4': 'Hisoblagichlar', 'scr.c5': 'Mantiq simulyatori',
            'scr.aria': 'Ilova ekranlari', 'scr.prev': 'Oldingi', 'scr.next': 'Keyingi',

            'video.station': 'Video', 'video.title': '30 soniyada sxemani yig‘a olasizmi?',
            'video.lead': 'Qisqa video: imtihon oldidan tungi soat 02:47 — va ilova bilan birinchi tanishuv.',
            'video.f1': 'davomiyligi', 'video.f2': '· 4,2 MB', 'video.f3': 'o‘zingiz bosganda, tovush bilan boshlanadi',
            'video.fallback': 'Videoni yuklab oling',

            'inst.station': 'Android · APK', 'inst.title': 'Android’ga o‘rnatish — 4 qadam',
            'inst.s1.t': 'APK’ni yuklab oling', 'inst.s1.d': 'Yuqoridagi tugmani telefoningizdan bosing. Fayl «Yuklanmalar» papkasiga tushadi.',
            'inst.s2.t': 'Faylni oching', 'inst.s2.d': 'Bildirishnomadagi rele-lugat.apk ni bosing yoki «Fayllar» → «Yuklanmalar»dan oching.',
            'inst.s3.t': 'Ruxsat bering', 'inst.s3.d': 'Telefon «noma’lum manbalardan o‘rnatish»ga ruxsat so‘raydi: «Sozlamalar»ga o‘ting va shu brauzer yoki «Fayllar» uchun ruxsatni yoqing.',
            'inst.s4.t': 'O‘rnating', 'inst.s4.d': '«O‘rnatish»ni bosing. Bir necha soniyadan so‘ng Rele Lug‘at ekraningizda paydo bo‘ladi.',

            'prot.title': 'Play Protect ogohlantirsa — xavotir olmang',
            'prot.p1': 'Ilova hozircha Google Play do‘konida emas va sinov (debug) imzosi bilan yig‘ilgan. Shuning uchun Play Protect uni «noma’lum ilova» deb ko‘rsatishi mumkin — bu do‘kondan tashqari o‘rnatiladigan har qanday ilova uchun odatiy holat.',
            'prot.how': 'Nima qilish kerak:', 'prot.p2': '«Batafsil» → «Baribir o‘rnatish»ni bosing.',
            'prot.p3': 'Ilova faqat ikkita oddiy ruxsatdan foydalanadi: vibratsiya va internet (har bir Android ilovaning standart ruxsati). Kontaktlar, kamera, joylashuv va fayllaringizga kirmaydi; progressingiz faqat telefonda saqlanadi.',
            'prot.p4': 'O‘rnatib bo‘lgach, «noma’lum manbalar» ruxsatini qayta o‘chirib qo‘yishingiz mumkin.',

            'qr.alt': 'Ushbu sahifaga olib boradigan QR-kod', 'qr.title': 'Kompyuterdan ochdingizmi?',
            'qr.lead': 'Telefon kamerasini kerakli QR-kodga qarating: Android uchun — APK sahifasi, iPhone uchun — ilovaning o‘zi ochiladi.',
            'qr.big': 'Doskada ko‘rsatish', 'qr.hint': 'Darsda: proyektorda katta QR — butun guruh birdan skanerlaydi.',
            'qr.fullTitle': 'Telefon kamerasi bilan skanerlang', 'qr.close': 'Yopish',
            'footer.home': '← Bosh sahifaga',
            /* --- iPhone / veb-ilova --- */
            'hero.open': 'iPhone / brauzer: ilovani ochish',
            'hero.webChip1': 'Safari · Chrome', 'hero.webChip2': 'offline ishlaydi', 'hero.howIos': 'iPhone’ga o‘rnatish ↓',
            'ios.station': 'iPhone · iOS', 'ios.title': 'iPhone’ga o‘rnatish — 4 qadam',
            'ios.lead': 'App Store kerak emas: veb-ilova bosh ekranga ikonka bo‘lib o‘rnatiladi, to‘liq ekranda ochiladi va internetsiz ishlaydi.',
            'ios.s1.t': 'Havolani Safari’da oching', 'ios.s1.warn': 'Chrome emas — aynan Safari!',
            'ios.s1.d': 'Boshqa brauzerlarda «Bosh ekranga qo‘shish» bo‘lmasligi mumkin. Pastdagi «Ilovani ochish» tugmasini Safari’da bosing yoki QR-kodni skanerlang.',
            'ios.s2.t': '«Ulashish» tugmasini bosing', 'ios.s2.d': 'Ekran pastidagi kvadrat va yuqoriga strelka belgisi. Yangi iOS’da avval «•••» menyusini oching.',
            'ios.s3.t': '«Bosh ekranga qo‘shish»ni tanlang', 'ios.s3.d': 'Menyuni pastga suring. Telefon tili ruscha bo‘lsa — «На экран „Домой“», inglizcha — «Add to Home Screen».',
            'ios.s4.t': '«Qo‘shish»ni bosing', 'ios.s4.d': 'Oynaning o‘ng yuqori burchagida. Bir soniyada Rele Lug‘at ikonkasi bosh ekranda paydo bo‘ladi.',
            'ios.open': 'Ilovani ochish',
            'ios.res.t': 'Natija: bosh ekranda ilova',
            'ios.res.d': 'Rele Lug‘at ikonkasi bosh ekranda turadi, ilova to‘liq ekranda ochiladi va internetsiz ishlaydi. Progress telefonda saqlanadi.',
            'ios.res.vibro': 'Eslatma: iOS’da vibratsiya yo‘q — Safari bu imkoniyatni bermaydi. Tovushlar ishlaydi.',
            'ios.android.t': 'Android’da ham:', 'ios.android.d': 'shu veb-versiyani Chrome’da oching → «⋮» menyu → «Ilovani o‘rnatish» (yoki «Bosh ekranga qo‘shish»). APK va Play Protect ogohlantirishisiz.',
            'qr.android': 'Android', 'qr.ios': 'iPhone',
            'qr.altAndroid': 'Android: APK sahifasiga olib boradigan QR-kod', 'qr.altIos': 'iPhone: ilovani ochadigan QR-kod',
            'qr.whatAndroid': 'APK yuklab olish sahifasi', 'qr.whatIos': 'Ilova — Safari’da oching'
        },
        ru: {
            title: 'Rele Lug‘at — учебное приложение по релейной защите: Android (APK) и iPhone | EnergyVibe',
            meta: 'Rele Lug‘at — бесплатное приложение для изучения релейной защиты в игровой форме: APK для Android, веб-приложение для iPhone и браузера. 214 терминов, 24 схемы, 170 тестовых вопросов. Работает без интернета, на 3 языках.',
            skip: 'Перейти к содержимому',
            'nav.about': 'Обо мне', 'nav.tools': 'Инструменты', 'nav.skills': 'Направления', 'nav.projects': 'Проекты', 'nav.contact': 'Контакты', 'nav.app': 'Rele Lug‘at',

            'hero.eyebrow': 'Android · iPhone · Релейная защита',
            'hero.lead': 'Не зубрите релейную защиту — учитесь играя: собирайте схемы сами и получайте объяснение к каждой ошибке.',
            'hero.download': 'Android: скачать APK',
            'hero.version': 'Версия', 'unit.mb': 'МБ', 'hero.only': 'Только Android',
            'hero.watch': 'Смотреть 30-секундное видео ↓',
            'hero.iconSub': 'Релейная защита · лекции 1–15',
            'float.terms': 'терминов', 'float.circuits': 'схемы', 'float.offline': 'офлайн',

            'feat.station': 'Возможности', 'feat.title': 'Что есть в приложении',
            'feat.lead': 'Все определения, формулы и вопросы взяты из лекций 1–15 курса «Релейная защита».',
            'feat.terms.t': 'терминов', 'feat.terms.d': 'Каждый термин — со ссылкой на лекцию: определение, формула и где применяется.',
            'feat.circ.t': 'схемы — собираете сами', 'feat.circ.d': 'Перетаскивайте элементы на свои места. Если цепь собрана верно — по схеме бежит ток.',
            'feat.quiz.t': 'тестовых вопросов', 'feat.quiz.d': 'Больше 10 вопросов на каждую лекцию. При ошибке — объяснение из лекции.',
            'feat.flash.t': 'Флеш-карточки', 'feat.flash.d': 'Интервальное повторение (Лейтнер, 5 коробок): забываемый термин вернётся вовремя.',
            'feat.path.t': 'лекций — учебный путь', 'feat.path.d': 'Карта сети: каждая лекция — подстанция. Сдали тест — она под напряжением.',
            'feat.calc.t': 'калькуляторов', 'feat.calc.d': 'МТЗ, токовая отсечка и другие формулы — с пошаговым решением.',
            'feat.off.t': 'Работает без интернета', 'feat.off.d': 'Установите один раз — дальше интернет не нужен. Прогресс хранится только на телефоне.',
            'feat.lang.t': 'языка', 'feat.lang.d': 'Узбекский, русский, английский — и интерфейс, и весь контент.',

            'scr.station': 'Экраны', 'scr.title': 'Настоящие кадры из приложения',
            'scr.lead': 'Скриншоты с телефона — приложение выглядит именно так.',
            'scr.c1': 'Главный экран: термин дня, уровень и серия', 'scr.c2': 'Конструктор схем',
            'scr.c3': 'Словарь: 214 терминов, поиск и фильтр', 'scr.c4': 'Калькуляторы', 'scr.c5': 'Симулятор логики',
            'scr.aria': 'Экраны приложения', 'scr.prev': 'Предыдущий', 'scr.next': 'Следующий',

            'video.station': 'Видео', 'video.title': 'Соберёте схему за 30 секунд?',
            'video.lead': 'Короткое видео: 02:47 ночи перед экзаменом — и первое знакомство с приложением (видео на узбекском).',
            'video.f1': 'длительность', 'video.f2': '· 4,2 МБ', 'video.f3': 'запускается по нажатию, со звуком',
            'video.fallback': 'Скачать видео',

            'inst.station': 'Android · APK', 'inst.title': 'Установка на Android — 4 шага',
            'inst.s1.t': 'Скачайте APK', 'inst.s1.d': 'Нажмите кнопку выше с телефона. Файл сохранится в папку «Загрузки».',
            'inst.s2.t': 'Откройте файл', 'inst.s2.d': 'Нажмите на rele-lugat.apk в уведомлении или откройте его через «Файлы» → «Загрузки».',
            'inst.s3.t': 'Разрешите установку', 'inst.s3.d': 'Телефон попросит разрешить «установку из неизвестных источников»: перейдите в «Настройки» и включите разрешение для этого браузера или «Файлов».',
            'inst.s4.t': 'Установите', 'inst.s4.d': 'Нажмите «Установить». Через несколько секунд Rele Lug‘at появится на экране.',

            'prot.title': 'Предупреждает Play Защита? Не волнуйтесь',
            'prot.p1': 'Приложение пока не опубликовано в Google Play и собрано с тестовой (debug) подписью. Поэтому Play Защита может показать его как «неизвестное приложение» — это обычное дело для любого приложения, установленного не из магазина.',
            'prot.how': 'Что сделать:', 'prot.p2': '«Подробнее» → «Всё равно установить».',
            'prot.p3': 'Приложение использует только два обычных разрешения: вибрацию и интернет (стандартное разрешение любого Android-приложения). Оно не обращается к контактам, камере, геолокации и вашим файлам; прогресс хранится только на телефоне.',
            'prot.p4': 'После установки разрешение для «неизвестных источников» можно снова отключить.',

            'qr.alt': 'QR-код, ведущий на эту страницу', 'qr.title': 'Открыли с компьютера?',
            'qr.lead': 'Наведите камеру телефона на нужный QR-код: для Android — страница APK, для iPhone — само приложение.',
            'qr.big': 'Показать на доске', 'qr.hint': 'На занятии: большой QR на проекторе — вся группа сканирует сразу.',
            'qr.fullTitle': 'Отсканируйте камерой телефона', 'qr.close': 'Закрыть',
            'footer.home': '← На главную',
            /* --- iPhone / веб-приложение --- */
            'hero.open': 'iPhone / браузер: открыть приложение',
            'hero.webChip1': 'Safari · Chrome', 'hero.webChip2': 'работает офлайн', 'hero.howIos': 'Установка на iPhone ↓',
            'ios.station': 'iPhone · iOS', 'ios.title': 'Установка на iPhone — 4 шага',
            'ios.lead': 'App Store не нужен: веб-приложение добавляется на главный экран значком, открывается на весь экран и работает без интернета.',
            'ios.s1.t': 'Откройте ссылку в Safari', 'ios.s1.warn': 'Не Chrome — именно Safari!',
            'ios.s1.d': 'В других браузерах пункта «На экран „Домой“» может не быть. Нажмите «Открыть приложение» ниже в Safari или отсканируйте QR-код.',
            'ios.s2.t': 'Нажмите «Поделиться»', 'ios.s2.d': 'Квадрат со стрелкой вверх внизу экрана. В новых iOS сначала откройте меню «•••».',
            'ios.s3.t': 'Выберите «На экран „Домой“»', 'ios.s3.d': 'Прокрутите меню вниз. Если язык телефона английский — «Add to Home Screen».',
            'ios.s4.t': 'Нажмите «Добавить»', 'ios.s4.d': 'В правом верхнем углу окна. Через секунду значок Rele Lug‘at появится на главном экране.',
            'ios.open': 'Открыть приложение',
            'ios.res.t': 'Итог: приложение на главном экране',
            'ios.res.d': 'Значок Rele Lug‘at — на главном экране, приложение открывается на весь экран и работает без интернета. Прогресс хранится на телефоне.',
            'ios.res.vibro': 'Примечание: на iOS нет вибрации — Safari её не поддерживает. Звуки работают.',
            'ios.android.t': 'На Android тоже:', 'ios.android.d': 'откройте эту веб-версию в Chrome → меню «⋮» → «Установить приложение» (или «Добавить на главный экран»). Без APK и предупреждений Play Защиты.',
            'qr.android': 'Android', 'qr.ios': 'iPhone',
            'qr.altAndroid': 'Android: QR-код на страницу APK', 'qr.altIos': 'iPhone: QR-код, открывающий приложение',
            'qr.whatAndroid': 'Страница загрузки APK', 'qr.whatIos': 'Приложение — откройте в Safari'
        },
        en: {
            title: 'Rele Lug‘at — relay protection study app: Android (APK) and iPhone | EnergyVibe',
            meta: 'Rele Lug‘at is a free app to learn relay protection by playing: an APK for Android and a web app for iPhone and browsers. 214 terms, 24 circuits, 170 quiz questions. Works offline, in 3 languages.',
            skip: 'Skip to main content',
            'nav.about': 'About', 'nav.tools': 'Tools', 'nav.skills': 'Expertise', 'nav.projects': 'Projects', 'nav.contact': 'Contact', 'nav.app': 'Rele Lug‘at',

            'hero.eyebrow': 'Android · iPhone · Relay protection',
            'hero.lead': 'Don’t cram relay protection — learn it by playing: build the circuits yourself and get an explanation for every mistake.',
            'hero.download': 'Android: download APK',
            'hero.version': 'Version', 'unit.mb': 'MB', 'hero.only': 'Android only',
            'hero.watch': 'Watch the 30-second video ↓',
            'hero.iconSub': 'Relay protection · lectures 1–15',
            'float.terms': 'terms', 'float.circuits': 'circuits', 'float.offline': 'offline',

            'feat.station': 'Features', 'feat.title': 'What’s inside',
            'feat.lead': 'Every definition, formula and question comes from lectures 1–15 of the “Relay protection” course.',
            'feat.terms.t': 'terms', 'feat.terms.d': 'Each term cites its lecture: definition, formula and where it is used.',
            'feat.circ.t': 'circuits — you build them', 'feat.circ.d': 'Drag the parts into place. When the circuit closes correctly, current flows through it.',
            'feat.quiz.t': 'quiz questions', 'feat.quiz.d': 'More than 10 questions per lecture. A wrong answer shows the explanation from the lecture.',
            'feat.flash.t': 'Flashcards', 'feat.flash.d': 'Spaced repetition (Leitner, 5 boxes): a term you are forgetting comes back right on time.',
            'feat.path.t': 'lectures — a learning path', 'feat.path.d': 'A grid map: every lecture is a substation. Pass its quiz and it gets energised.',
            'feat.calc.t': 'calculators', 'feat.calc.d': 'Overcurrent protection, current cut-off and other formulas — with step-by-step solutions.',
            'feat.off.t': 'Works offline', 'feat.off.d': 'Install once — no internet needed after that. Your progress stays on your phone.',
            'feat.lang.t': 'languages', 'feat.lang.d': 'Uzbek, Russian, English — the interface and all of the content.',

            'scr.station': 'Screens', 'scr.title': 'Real shots from the app',
            'scr.lead': 'Screenshots taken on a phone — this is exactly how the app looks.',
            'scr.c1': 'Home: term of the day, level and streak', 'scr.c2': 'Circuit builder',
            'scr.c3': 'Glossary: 214 terms, search and filters', 'scr.c4': 'Calculators', 'scr.c5': 'Logic simulator',
            'scr.aria': 'App screens', 'scr.prev': 'Previous', 'scr.next': 'Next',

            'video.station': 'Video', 'video.title': 'Can you build the circuit in 30 seconds?',
            'video.lead': 'A short video: 2:47 a.m. before the exam — and a first look at the app (in Uzbek).',
            'video.f1': 'duration', 'video.f2': '· 4.2 MB', 'video.f3': 'starts when you tap play, with sound',
            'video.fallback': 'Download the video',

            'inst.station': 'Android · APK', 'inst.title': 'Install on Android — 4 steps',
            'inst.s1.t': 'Download the APK', 'inst.s1.d': 'Tap the button above on your phone. The file is saved to “Downloads”.',
            'inst.s2.t': 'Open the file', 'inst.s2.d': 'Tap rele-lugat.apk in the notification, or open it from Files → Downloads.',
            'inst.s3.t': 'Allow the install', 'inst.s3.d': 'Your phone will ask to allow “install unknown apps”: open Settings and turn it on for this browser or for Files.',
            'inst.s4.t': 'Install', 'inst.s4.d': 'Tap “Install”. In a few seconds Rele Lug‘at appears on your home screen.',

            'prot.title': 'Play Protect warning? No need to worry',
            'prot.p1': 'The app isn’t on Google Play yet and is built with a test (debug) signature. That’s why Play Protect may flag it as an “unknown app” — this is normal for any app installed outside the store.',
            'prot.how': 'What to do:', 'prot.p2': 'Tap “More details” → “Install anyway”.',
            'prot.p3': 'The app uses only two ordinary permissions: vibration and internet (a standard permission every Android app has). It doesn’t access your contacts, camera, location or files; your progress stays on your phone.',
            'prot.p4': 'After installing, you can switch the “unknown apps” permission off again.',

            'qr.alt': 'QR code that opens this page', 'qr.title': 'Opened it on a computer?',
            'qr.lead': 'Point your phone camera at the right QR code: Android — the APK page, iPhone — the app itself.',
            'qr.big': 'Show on the board', 'qr.hint': 'In class: a big QR on the projector — the whole group scans it at once.',
            'qr.fullTitle': 'Scan with your phone camera', 'qr.close': 'Close',
            'footer.home': '← Back to home',
            /* --- iPhone / web app --- */
            'hero.open': 'iPhone / browser: open the app',
            'hero.webChip1': 'Safari · Chrome', 'hero.webChip2': 'works offline', 'hero.howIos': 'Install on iPhone ↓',
            'ios.station': 'iPhone · iOS', 'ios.title': 'Install on iPhone — 4 steps',
            'ios.lead': 'No App Store needed: the web app goes onto your home screen as an icon, opens full screen and works offline.',
            'ios.s1.t': 'Open the link in Safari', 'ios.s1.warn': 'Not Chrome — Safari!',
            'ios.s1.d': 'Other browsers may not have “Add to Home Screen”. Tap “Open the app” below in Safari, or scan the QR code.',
            'ios.s2.t': 'Tap Share', 'ios.s2.d': 'The square with an up arrow at the bottom of the screen. On newer iOS, open the “•••” menu first.',
            'ios.s3.t': 'Choose “Add to Home Screen”', 'ios.s3.d': 'Scroll the menu down. If your phone is in Russian, it’s «На экран „Домой“».',
            'ios.s4.t': 'Tap “Add”', 'ios.s4.d': 'In the top-right corner. A second later the Rele Lug‘at icon appears on your home screen.',
            'ios.open': 'Open the app',
            'ios.res.t': 'Result: the app on your home screen',
            'ios.res.d': 'The Rele Lug‘at icon sits on your home screen, the app opens full screen and works offline. Progress stays on your phone.',
            'ios.res.vibro': 'Note: there is no vibration on iOS — Safari doesn’t support it. Sounds work.',
            'ios.android.t': 'On Android too:', 'ios.android.d': 'open this web version in Chrome → “⋮” menu → “Install app” (or “Add to Home screen”). No APK, no Play Protect warnings.',
            'qr.android': 'Android', 'qr.ios': 'iPhone',
            'qr.altAndroid': 'Android: QR code to the APK page', 'qr.altIos': 'iPhone: QR code that opens the app',
            'qr.whatAndroid': 'APK download page', 'qr.whatIos': 'The app — open in Safari'
        }
    };

    // Doska oynasi ochiq bo'lsa, til almashganda uning yozuvlari ham yangilansin (6-qism).
    let refreshQr = () => {};

    const LANG_KEY = 'energyvibe-lang';      // bosh sahifa bilan bir xil kalit
    let lang = 'uz';
    const t = key => (I18N[lang] && I18N[lang][key]) || I18N.uz[key] || key;

    /* ---------- 1. Sozlamalarni sahifaga qo'yish ---------- */
    function applyConfig() {
        if (CFG.APK_URL) {
            const file = CFG.APK_URL.split('/').pop() || 'rele-lugat.apk';
            document.querySelectorAll('[data-apk]').forEach(a => {
                a.setAttribute('href', CFG.APK_URL);
                a.setAttribute('download', file);
            });
        }
        // uz/ru: o'nlik vergul (4,8), en: nuqta (4.8)
        const size = typeof CFG.SIZE_MB === 'number'
            ? CFG.SIZE_MB.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            : '';
        document.querySelectorAll('[data-cfg="version"]').forEach(el => { if (CFG.VERSION) el.textContent = CFG.VERSION; });
        document.querySelectorAll('[data-cfg="size"]').forEach(el => { if (size) el.textContent = size; });
        if (CFG.PAGE_URL) {
            const short = CFG.PAGE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
            document.querySelectorAll('[data-cfg="page-url-short"]').forEach(el => { el.textContent = short; });
        }
        if (CFG.APP_URL) {
            document.querySelectorAll('[data-app]').forEach(a => a.setAttribute('href', CFG.APP_URL));
        }
        if (CFG.APP_PAGE_URL) {
            const shortApp = CFG.APP_PAGE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
            document.querySelectorAll('[data-cfg="app-url-short"]').forEach(el => { el.textContent = shortApp; });
        }
    }

    function setLang(next) {
        if (!I18N[next]) next = 'uz';
        lang = next;
        document.documentElement.lang = lang;
        document.title = t('title');
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', t('meta'));

        document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
        document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.setAttribute('alt', t(el.dataset.i18nAlt)); });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
        document.querySelectorAll('.lang-btn').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
        applyConfig();
        refreshQr();
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* xotira bloklangan bo'lishi mumkin */ }
    }

    document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* e'tiborsiz */ }
    setLang(saved && I18N[saved] ? saved : 'uz');

    /* ---------- 3. Navigatsiya, progress chizig'i ---------- */
    const navbar = document.getElementById('navbar');
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    const progressTop = document.getElementById('progress-top');

    function closeMenu() {
        navMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    }
    hamburger.addEventListener('click', () => {
        const open = navMenu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(open));
    });
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('click', e => { if (!navbar.contains(e.target)) closeMenu(); });

    let ticking = false;
    function onScroll() {
        ticking = false;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        navbar.classList.toggle('scrolled', y > 30);
        progressTop.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* ---------- 4. Reveal ---------- */
    const revealEls = [...document.querySelectorAll('.reveal')];
    if ('IntersectionObserver' in window && !reducedMotion) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(el => {
            const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
            el.style.transitionDelay = (siblings.indexOf(el) % 4) * 90 + 'ms';
            io.observe(el);
        });
    } else {
        revealEls.forEach(el => el.classList.add('in'));
    }

    /* ---------- 5. Ekranlar karuseli (scroll-snap) ---------- */
    const track = document.getElementById('rl-track');
    if (track) {
        const slides = [...track.children];
        const dots = [...document.querySelectorAll('#rl-dots i')];
        const captions = [...document.querySelectorAll('#rl-captions li')];
        const prev = document.querySelector('.rl-arrow[data-dir="-1"]');
        const next = document.querySelector('.rl-arrow[data-dir="1"]');
        const capNow = document.getElementById('rl-cap-now');
        let index = 0;

        const current = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        function render(i) {
            index = Math.max(0, Math.min(slides.length - 1, i));
            dots.forEach((d, k) => d.classList.toggle('on', k === index));
            captions.forEach((c, k) => c.classList.toggle('on', k === index));
            if (capNow) { capNow.dataset.i18n = 'scr.c' + (index + 1); capNow.textContent = t(capNow.dataset.i18n); }
            prev.disabled = index === 0;
            next.disabled = index === slides.length - 1;
        }
        function go(i) {
            const target = Math.max(0, Math.min(slides.length - 1, i));
            track.scrollTo({ left: target * track.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' });
            render(target);
        }
        let raf = 0;
        track.addEventListener('scroll', () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => render(current()));
        }, { passive: true });
        prev.addEventListener('click', () => go(index - 1));
        next.addEventListener('click', () => go(index + 1));
        captions.forEach((c, k) => c.querySelector('button').addEventListener('click', () => go(k)));
        track.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
        });
        window.addEventListener('resize', () => go(index));
        render(0);
    }

    /* ---------- 6. QR — doska / proyektor rejimi (Android va iPhone) ---------- */
    const qrFull = document.getElementById('rl-qr-full');
    const qrClose = document.getElementById('rl-qr-close');
    const qrImg = document.getElementById('rl-qr-full-img');
    const qrTag = document.getElementById('rl-qr-full-tag');
    const qrUrl = document.getElementById('rl-qr-full-url');
    const shortUrl = u => (u || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const QR = {
        android: { img: '/rele-lugat/qr.svg', tag: 'qr.android', alt: 'qr.altAndroid', url: () => shortUrl(CFG.PAGE_URL) },
        ios: { img: '/rele-lugat/qr-app.svg', tag: 'qr.ios', alt: 'qr.altIos', url: () => shortUrl(CFG.APP_PAGE_URL) }
    };
    let qrKind = 'android';
    let qrOpener = null;

    refreshQr = () => {
        const q = QR[qrKind];
        qrImg.setAttribute('src', q.img);
        qrImg.setAttribute('alt', t(q.alt));
        qrTag.textContent = t(q.tag);
        qrUrl.textContent = q.url();
    };
    refreshQr();

    function openQr(kind, opener) {
        qrKind = QR[kind] ? kind : 'android';
        qrOpener = opener || null;
        refreshQr();
        qrFull.hidden = false;
        document.body.classList.add('rl-lock');
        qrClose.focus();
        // Haqiqiy to'liq ekran — proyektorda brauzer paneli ham yo'qoladi
        if (qrFull.requestFullscreen) qrFull.requestFullscreen().catch(() => { /* telefonda ruxsat berilmasligi mumkin */ });
    }
    function closeQr() {
        if (qrFull.hidden) return;
        qrFull.hidden = true;
        document.body.classList.remove('rl-lock');
        // To'liq ekrandan chiqish tugamaguncha tashqaridagi tugmaga fokus berib bo'lmaydi.
        const back = () => { if (qrOpener) qrOpener.focus(); };
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().then(back, back);
        else back();
    }
    document.querySelectorAll('[data-qr-open]').forEach(btn => {
        btn.addEventListener('click', () => openQr(btn.dataset.qrOpen, btn));
    });
    qrClose.addEventListener('click', closeQr);
    qrFull.addEventListener('click', e => { if (e.target === qrFull) closeQr(); });
    // To'liq ekranda Esc ni brauzer o'zi "yeydi" — shuning uchun to'liq ekrandan
    // chiqilganda oynani ham yopamiz. Lekin FAQAT haqiqatan kirilgan bo'lsa:
    // ba'zi telefon/brauzerlar to'liq ekranni rad etadi yoki darhol chiqaradi,
    // shunda oyna o'z-o'zidan yopilib qolmasin.
    let qrFullSince = 0;
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement === qrFull) { qrFullSince = Date.now(); return; }
        // 0,5 soniyadan qisqa to'liq ekran — brauzer uni rad etgan; oyna ochiq qolsin.
        const userExit = qrFullSince && Date.now() - qrFullSince > 500;
        qrFullSince = 0;
        if (userExit) closeQr();
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        closeMenu();
        closeQr();
    });
})();
