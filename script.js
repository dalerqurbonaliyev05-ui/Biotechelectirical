/* =========================================================
   EnergyVibe — script.js
   1. i18n (UZ / RU / EN)   2. navigation, progress, voltage rail
   3. reveal on scroll      4. skill gauges
   5. hero (waves, glow, parallax)   6. contact form
   ========================================================= */

/* ---------- 1. Translations ---------- */
const I18N = {
    uz: {
        title: 'EnergyVibe — Daler Qurbonaliyev | Elektr ta’minoti muhandisi',
        meta: 'Elektr ta’minoti muhandisi Daler Qurbonaliyevning shaxsiy sayti: energetika loyihalari, hisob-kitob vositalari va simulyatorlar.',
        skip: 'Asosiy mazmunga o‘tish',
        'nav.about': 'Men haqimda', 'nav.tools': 'Vositalar', 'nav.skills': 'Yo‘nalishlar', 'nav.projects': 'Loyihalar', 'nav.contact': 'Aloqa', 'nav.apps': 'Ilovalar',
        'hero.eyebrow': 'Elektr ta’minoti muhandisi',
        'hero.hello': 'Salom, men', 'hero.name': 'Daler',
        'hero.lead': 'Texnika va texnologiyada biz bilan yangi loyihalar yarating.',
        'hero.cta1': 'Loyihalarimiz', 'hero.cta2': 'Bog‘lanish', 'hero.cta3': 'Vositalarni ochish',
        'about.title': 'Men haqimda',
        'about.text': 'Elektr ta’minoti yo‘nalishidagi mutaxassis. Muhandislik hisob-kitoblari va loyihalash dasturlari (AutoCAD, Compass-3D, MATLAB, Mathcad) bilan ishlash tajribasiga ega. Energetika ob’ektlarini loyihalash bo‘yicha tugallangan amaliy loyihaga ega bo‘lib, texnik hujjatlar bilan ishlash va tizimlarni optimallashtirish bo‘yicha ko‘nikmalarimni rivojlantirib boryapman.',
        'about.s1': 'Loyihalar', 'about.s2': 'Yil tajriba', 'about.s3': 'Buyurtmachilar',
        'about.cap': 'Bir chiziqli sxema: 10 kV → transformator → 0,4 kV iste’molchilar',
        'tools.title': 'Muhandislik vositalari',
        'tools.lead': 'Sayt ichidagi amaliy dasturlar, simulyatorlar va hisob-kitob vositalari.',
        'tools.open': 'Ochish →',
        'tools.locked': 'Kod bilan',
        'tools.t1.tag': 'Simulyator', 'tools.t1.title': 'Energetika sistemasi', 'tools.t1.desc': 'IES, AES va quyosh EES stansiyalari hamda iste’molchilar demo modeli.',
        'tools.t2.tag': 'Prototip', 'tools.t2.title': 'RES tizimi loyihasi', 'tools.t2.desc': 'RES amaliyot portali prototipi: talaba kabineti va boshqaruv (admin) paneli.',
        'tools.t3.tag': 'Animatsiya', 'tools.t3.title': 'Aholi iste’moli', 'tools.t3.desc': '10 kV liniyadan transformator orqali 0,4 kV aholi tarmog‘igacha taqsimot animatsiyasi.',
        'tools.t4.tag': 'Kurs loyihasi', 'tools.t4.title': 'EET kurs loyihasi', 'tools.t4.desc': 'Elektr tarmoqlari kurs loyihasi va uni tekshiruvchi dastur.',
        'tools.t5.tag': 'Kalkulyator', 'tools.t5.title': 'Iqtisodiy kalkulyator', 'tools.t5.desc': 'Elektr energiyasi sarfi va xarajatini hisoblash kalkulyatori.',
        'tools.t6.tag': 'Grafik', 'tools.t6.title': 'Yuklama grafigi', 'tools.t6.desc': 'Sutkalik elektr yuklamalari grafigi va eng katta/eng kichik yuklama vaqtlari.',
        'tools.t7.tag': '3D trenajyor', 'tools.t7.title': 'Elektr shit montaji', 'tools.t7.desc': 'Uy shitini 3D da o‘zingiz yig‘ing: avtomat, УЗО, hisoblagich. Qisqa tutashuv va sizish tokida himoya qanday ishlashini kuzating.',
        'tools.t8.tag': '3D trenajyor', 'tools.t8.title': 'Avtomat o‘chirgich yig‘ish', 'tools.t8.desc': 'Avtomatni detalma-detal 3D da yig‘ing: klemma, kontakt, yoy kamerasi, g‘altak, bimetall. Keyin ortiqcha yuk va qisqa tutashuvda o‘chishini sinang.',
        'tools.t9.tag': '3D trenajyor', 'tools.t9.title': 'Chastota o‘zgartirgich ulash', 'tools.t9.desc': 'Chastota o‘zgartirgich, motor, tormoz rezistori, potensiometr va START/STOP tugmalarini o‘zingiz ulang. Keyin motorni yurgizing, chastotani o‘zgartiring va himoya xatolarini sinang.',
        'tools.t10.tag': '3D trenajyor', 'tools.t10.title': 'Reversiv yuritma: sensorli boshqaruv', 'tools.t10.desc': 'Avtomat, ikki kontaktor, 24 V blok, oraliq relelar va PNP sensorlarni kabel kanallari orqali o‘zingiz ulang. Keyin aravachaning sensorlar orasida avtomatik borib-kelishini va blokirovka qanday ishlashini kuzating.',
        'tools.t11.tag': '3D trenajyor', 'tools.t11.title': 'Uy elektr shiti: hisoblagich va difavtomatlar', 'tools.t11.desc': 'Hisoblagich, kirish avtomati, kuchlanish relesi, difavtomatlar, rozetkalar, kalit va lampani o‘zingiz ulang. Keyin choynak, duxovka va nosoz asboblar bilan himoyalar qanday o‘chishini sinang.',
        'tools.t12.tag': 'O‘quv simulyatori', 'tools.t12.title': 'Podstansiya simulyatori', 'tools.t12.desc': 'Dispetcher buyrug‘ini qabul qiling, bir chiziqli sxemada kommutatsiyani to‘g‘ri tartibda bajaring, yerlang, plakat osing va jurnal yuriting. Blokirovkalar va xatolar oqibati real hayotdagidek.',
        'tools.t13.tag': 'Tarixiy sayt', 'tools.t13.title': 'Fizika tarixi', 'tools.t13.desc': 'Arximeddan Eynshteyngacha: xronologiya, buyuk olimlar va brauzerda takrorlanadigan 6 ta tarixiy tajriba.',
        'tools.t14.tag': 'Ta‘limiy o‘yin', 'tools.t14.title': 'Elektr muhandisi: bir ish kuni', 'tools.t14.desc': 'Zavodda bir kunlik ish: dvigatel nosozliklarini asboblar bilan aniqlang, xavfsiz ta‘mirlang, ta‘mir yoki almashtirishni iqtisodiy asoslang va energiya tejash taklifini bering. 25 ta topshiriq, tasodifiy sabablar.',
        'tools.t15.tag': 'Kurs ishi', 'tools.t15.title': 'Releli himoya va avtomatikasi', 'tools.t15.desc': 'Sxema va variantni tanlang, liniya uzunliklarini kiriting: QT toklari, liniya va transformator himoyalari, AQU/ZAU va ustavkalar kartasi hisoblanadi. Tayyor kurs ishini Word faylda yuklab oling.',
        'tools.t16.tag': 'Kurs loyihasi', 'tools.t16.title': 'Sanoat korxonasining elektr ta’minoti', 'tools.t16.desc': 'Korxona va variantni tanlang, plandan o‘lchagan sex maydonlari, koordinatalar va kabel uzunliklarini kiriting: barcha hisoblar bajariladi. Word, Excel va A1 chizmalar (PDF) yuklab olinadi.',
        'tools.t17.tag': 'Ilova demosi', 'tools.t17.title': 'Elektromobil zaryadlash', 'tools.t17.desc': 'Zaryad stansiyasi ilovasi: batareya foizi, masofa va narx real vaqtda o‘zgaradi, kabelni uzing, so‘m yoki dollarda to‘lang va chek chiqaring. 3 tilda.',
        'tools.t18.tag': 'O‘yin', 'tools.t18.title': 'Shahar quruvchi', 'tools.t18.desc': '40 bosqichli o‘yin: stansiya, liniya va transformator bilan shaharni yoriting. 2-bo‘limda biogaz, shamol generatorlari, ikki tomonlama ta’minot va kasalxona uchun zaxira manba qo‘shiladi.',
        'tools.t19.tag': '3D trenajyor', 'tools.t19.title': 'Transformatorni yig‘ing', 'tools.t19.desc': 'TM-630/10 transformatorini 13 qadamda o‘zingiz yig‘asiz: o‘zak, o‘ramlar, Δ/Y₀ ulash, bak, moy, konservator va 10 kV sinov. Har qadamda savol va tushuntirish. 3 tilda.',
        'tools.t20.tag': 'Kurs loyihasi', 'tools.t20.title': 'Kuch transformatori hisobi', 'tools.t20.desc': '«Elektr mashinalari» kurs loyihasi: variantni tanlang — asosiy o‘lchamlar, PK va YuK chulg‘amlari, QT parametrlari, salt ishlash, issiqlik hisobi va bak bajariladi. Tushuntirish xatini o‘zbek yoki rus tilida Word faylda yuklab oling.',
        'tools.t21.tag': 'Dars vositasi', 'tools.t21.title': 'Python Dars: amaliy mashg‘ulot nazorati', 'tools.t21.desc': '8 ta amaliy mashg‘ulot: variantlar avtomatik tarqatiladi, kod brauzerda Python’da ishlaydi. Ustoz 20+ talabaning kodini jonli kuzatadi, tuzatadi va qiyinroq masala yuboradi.',
        'apps.title': 'Ilovalar',
        'apps.lead': 'Telefon uchun ilovalarim va o‘yinlarim: yuklab oling yoki brauzerda oching.',
        'apps.a1.tag': 'Android · iPhone', 'apps.a1.title': 'Rele Lug‘at', 'apps.a1.desc': 'Releli himoyani o‘ynab o‘rganing: 214 atama, 24 sxema, 170 test savoli. Internetsiz ishlaydi.',
        'apps.a2.tag': 'Android ilova', 'apps.a2.title': 'Uy taomlari', 'apps.a2.desc': 'Uyda tayyorlangan taomlar bozori: xaridor, sotuvchi va kuryer ilovalari.',
        'apps.a3.tag': 'Android · iPhone', 'apps.a3.title': 'Mushuk va Itlar', 'apps.a3.desc': 'Ko‘chada uchragan mushuk va itlarni suratga oling, joylashuv avtomatik belgilanadi.',
        'apps.a4.tag': 'Android ilova', 'apps.a4.title': 'Fizika', 'apps.a4.desc': '6–11-sinf va abituriyentlar uchun: darslik testlari, sertifikatga tayyorlov, laboratoriya o‘yinlari.',
        'apps.a5.tag': 'Android ilova', 'apps.a5.title': 'ElektrUy', 'apps.a5.desc': 'Xona rasmidan kabel trassasi, sxema, 3D ko‘rinish va materiallar ro‘yxati. Ovozli darslar.',
        'apps.a6.tag': 'Veb-o‘yinlar', 'apps.a6.title': 'O‘yinlar', 'apps.a6.desc': 'Milliy o‘zbek o‘yinlari to‘plami: arqon tortish, besh tosh, oshiq, chillak, kurash va boshqalar. Reyting bilan.',
        'skills.title': 'Yo‘nalishlar',
        'skills.c1': 'Elektr tarmoq tizimlari', 'skills.c2': 'Elektr xavfsizligi va ishonchliligi', 'skills.c3': 'Rele himoyasi',
        'skills.s1': 'Elektr montaj', 'skills.s2': 'Himoya vositalari', 'skills.s3': 'Avtomatlarni o‘rnatish', 'skills.s4': 'Avtomatlarni sozlash',
        'projects.title': 'Kelajakdagi loyihalar',
        'projects.p1.title': 'Simsiz elektr energiya uzatish',
        'projects.p1.desc': 'Bu texnologiya asosan elektromagnit induksiya qonuniyatlariga asoslanadi. Energetika tili bilan aytganda, bu “havo orqali ishlaydigan transformator”ga o‘xshaydi.',
        'projects.p2.title': 'Vodorod generatori',
        'projects.p2.desc': 'Quyosh panellari kunduzi ortiqcha tok ishlab chiqarganda, uni akkumulyatorga emas, vodorod generatoriga yo‘naltirish mumkin. Hosil bo‘lgan vodorod tanklarda saqlanadi.',
        'projects.p3.title': 'Aqlli hisoblagich',
        'projects.p3.desc': 'Bu nafaqat iste’mol qilingan elektr energiyasini hisoblovchi, balki ma’lumotlarni masofadan turib real vaqt rejimida energiya ta’minoti korxonasiga uzatuvchi zamonaviy mikroprotsessorli qurilmadir.',
        'projects.tag1': 'Iqtidorli talabalar', 'projects.tag2': 'Zamonaviy laboratoriya', 'projects.tag3': 'Aniq hisob-kitoblar',
        'projects.more': 'Batafsil →',
        'contact.title': 'Bog‘lanish',
        'contact.lead': 'Sizda yangi loyihalar bormi? Biz bilan bog‘laning.',
        'form.name': 'Ismingiz', 'form.message': 'Loyihangiz haqida', 'form.send': 'Xabarni yuborish',
        'form.sending': 'Yuborilmoqda…',
        'form.ok': 'Rahmat! Xabaringiz yuborildi.',
        'form.err': 'Xabar yuborilmadi. Iltimos, qayta urinib ko‘ring yoki email orqali yozing.',
        'footer.tag': 'Real loyihalar, aniq hisob-kitoblar.'
    },
    ru: {
        title: 'EnergyVibe — Далер Курбоналиев | Инженер электроснабжения',
        meta: 'Личный сайт инженера-электроэнергетика Далера Курбоналиева: энергетические проекты, инструменты расчёта и симуляторы.',
        skip: 'Перейти к содержимому',
        'nav.about': 'Обо мне', 'nav.tools': 'Инструменты', 'nav.skills': 'Направления', 'nav.projects': 'Проекты', 'nav.contact': 'Контакты', 'nav.apps': 'Приложения',
        'hero.eyebrow': 'Инженер электроснабжения',
        'hero.hello': 'Привет, я', 'hero.name': 'Далер',
        'hero.lead': 'Создавайте новые проекты в технике и технологиях вместе с нами.',
        'hero.cta1': 'Наши проекты', 'hero.cta2': 'Связаться', 'hero.cta3': 'Открыть инструменты',
        'about.title': 'Обо мне',
        'about.text': 'Специалист в области электроснабжения. Имею опыт работы с инженерными расчётами и программами проектирования (AutoCAD, Compass-3D, MATLAB, Mathcad). Выполнил завершённый практический проект по проектированию энергетических объектов и продолжаю развивать навыки работы с технической документацией и оптимизации систем.',
        'about.s1': 'Проекты', 'about.s2': 'Лет опыта', 'about.s3': 'Заказчики',
        'about.cap': 'Однолинейная схема: 10 кВ → трансформатор → потребители 0,4 кВ',
        'tools.title': 'Инженерные инструменты',
        'tools.lead': 'Практические программы, симуляторы и расчётные инструменты прямо на сайте.',
        'tools.open': 'Открыть →',
        'tools.locked': 'По коду',
        'tools.t1.tag': 'Симулятор', 'tools.t1.title': 'Энергосистема', 'tools.t1.desc': 'Демо-модель станций (ТЭС, АЭС, солнечная ЭС) и потребителей.',
        'tools.t2.tag': 'Прототип', 'tools.t2.title': 'Проект системы РЭС', 'tools.t2.desc': 'Прототип портала практики РЭС: кабинет студента и панель управления (админ).',
        'tools.t3.tag': 'Анимация', 'tools.t3.title': 'Потребление населения', 'tools.t3.desc': 'Анимация распределения: линия 10 кВ → трансформатор → сеть населения 0,4 кВ.',
        'tools.t4.tag': 'Курсовой проект', 'tools.t4.title': 'Курсовой проект ЭТ', 'tools.t4.desc': 'Курсовой проект по электрическим сетям и программа его проверки.',
        'tools.t5.tag': 'Калькулятор', 'tools.t5.title': 'Экономический калькулятор', 'tools.t5.desc': 'Калькулятор расхода электроэнергии и затрат на неё.',
        'tools.t6.tag': 'График', 'tools.t6.title': 'График нагрузки', 'tools.t6.desc': 'Суточный график электрических нагрузок, время максимума и минимума нагрузки.',
        'tools.t7.tag': '3D-тренажёр', 'tools.t7.title': 'Монтаж электрощита', 'tools.t7.desc': 'Соберите домашний щиток в 3D: автомат, УЗО, счётчик. Посмотрите, как защита срабатывает при коротком замыкании и токе утечки.',
        'tools.t8.tag': '3D-тренажёр', 'tools.t8.title': 'Сборка автоматического выключателя', 'tools.t8.desc': 'Соберите автомат по деталям в 3D: клеммы, контакт, дугогасительная камера, катушка, биметалл. Затем проверьте отключение при перегрузке и коротком замыкании.',
        'tools.t9.tag': '3D-тренажёр', 'tools.t9.title': 'Подключение частотного преобразователя', 'tools.t9.desc': 'Подключите преобразователь частоты, двигатель, тормозной резистор, потенциометр и кнопки СТАРТ/СТОП. Затем запустите двигатель, меняйте частоту и проверьте защиты.',
        'tools.t10.tag': '3D-тренажёр', 'tools.t10.title': 'Реверсивный привод с датчиками', 'tools.t10.desc': 'Подключите автомат, два контактора, блок питания 24 В, промежуточные реле и PNP-датчики через кабель-каналы. Затем посмотрите, как каретка автоматически ходит между датчиками и как работает блокировка.',
        'tools.t11.tag': '3D-тренажёр', 'tools.t11.title': 'Домашний электрощит: счётчик и дифавтоматы', 'tools.t11.desc': 'Подключите счётчик, вводной автомат, реле напряжения, дифавтоматы, розетки, выключатель и лампу. Затем проверьте, как срабатывает защита с чайником, духовкой и неисправными приборами.',
        'tools.t12.tag': 'Учебный симулятор', 'tools.t12.title': 'Симулятор подстанции', 'tools.t12.desc': 'Примите команду диспетчера, выполните переключения на однолинейной схеме в правильном порядке, наложите заземление, вывесите плакаты и ведите журнал. Блокировки и последствия ошибок — как в реальной жизни.',
        'tools.t13.tag': 'Исторический сайт', 'tools.t13.title': 'История физики', 'tools.t13.desc': 'От Архимеда до Эйнштейна: хронология, великие учёные и 6 исторических опытов, которые можно повторить в браузере.',
        'tools.t14.tag': 'Учебная игра', 'tools.t14.title': 'Инженер-электрик: один рабочий день', 'tools.t14.desc': 'Рабочий день на заводе: находите причины неисправностей двигателей приборами, безопасно ремонтируйте, экономически обосновывайте ремонт или замену и предлагайте меры энергосбережения. 25 заданий, случайные причины (интерфейс игры — на узбекском).',
        'tools.t15.tag': 'Курсовая работа', 'tools.t15.title': 'Релейная защита и автоматика', 'tools.t15.desc': 'Выберите схему и вариант, введите длины линий: рассчитываются токи КЗ, защиты линий и трансформаторов, АПВ/АВР и карта уставок. Готовую курсовую можно скачать в Word (интерфейс — на узбекском).',
        'tools.t16.tag': 'Курсовой проект', 'tools.t16.title': 'Электроснабжение промышленного предприятия', 'tools.t16.desc': 'Выберите предприятие и вариант, введите измеренные по генплану площади цехов, координаты и длины кабелей — весь расчёт выполняется. Word, Excel и чертежи А1 в PDF (интерфейс — на узбекском).',
        'tools.t17.tag': 'Демо приложения', 'tools.t17.title': 'Зарядка электромобиля', 'tools.t17.desc': 'Приложение зарядной станции: процент батареи, запас хода и цена меняются в реальном времени; отключите кабель, оплатите в сумах или долларах и распечатайте чек. На 3 языках.',
        'tools.t18.tag': 'Игра', 'tools.t18.title': 'Строитель города', 'tools.t18.desc': 'Игра на 40 уровней: станции, линии и трансформаторы освещают город. Во 2-й части — биогаз, ветрогенераторы, двустороннее питание и резервный источник для больниц (интерфейс — на узбекском).',
        'tools.t19.tag': '3D-тренажёр', 'tools.t19.title': 'Соберите трансформатор', 'tools.t19.desc': 'Соберите трансформатор ТМ-630/10 за 13 шагов: магнитопровод, обмотки, соединение Δ/Y₀, бак, масло, расширитель и испытание 10 кВ. На каждом шаге — вопрос и объяснение. На 3 языках.',
        'tools.t20.tag': 'Курсовой проект', 'tools.t20.title': 'Расчёт силового трансформатора', 'tools.t20.desc': 'Курсовой проект по «Электрическим машинам»: выберите вариант — рассчитываются основные размеры, обмотки НН и ВН, параметры КЗ, холостой ход, тепловой расчёт и бак. Пояснительную записку можно скачать в Word на русском или узбекском.',
        'tools.t21.tag': 'Учебный инструмент', 'tools.t21.title': 'Python Dars: контроль практических занятий', 'tools.t21.desc': '8 практических занятий: варианты раздаются автоматически, код работает в Python прямо в браузере. Преподаватель видит код 20+ студентов в реальном времени, исправляет его и даёт задачи посложнее.',
        'apps.title': 'Приложения',
        'apps.lead': 'Мои приложения и игры для телефона: скачайте или откройте в браузере.',
        'apps.a1.tag': 'Android · iPhone', 'apps.a1.title': 'Rele Lug‘at', 'apps.a1.desc': 'Изучайте релейную защиту играя: 214 терминов, 24 схемы, 170 тестовых вопросов. Работает без интернета.',
        'apps.a2.tag': 'Android-приложение', 'apps.a2.title': 'Домашняя еда', 'apps.a2.desc': 'Рынок домашней еды: приложения для покупателя, продавца и курьера.',
        'apps.a3.tag': 'Android · iPhone', 'apps.a3.title': 'Кошки и собаки', 'apps.a3.desc': 'Фотографируйте встреченных на улице кошек и собак — геопозиция отмечается автоматически.',
        'apps.a4.tag': 'Android-приложение', 'apps.a4.title': 'Физика', 'apps.a4.desc': 'Для 6–11 классов и абитуриентов: тесты по учебнику, подготовка к сертификату, лабораторные игры.',
        'apps.a5.tag': 'Android-приложение', 'apps.a5.title': 'ElektrUy', 'apps.a5.desc': 'По фото комнаты — трасса кабеля, схема, 3D-вид и список материалов. Голосовые уроки.',
        'apps.a6.tag': 'Веб-игры', 'apps.a6.title': 'Игры', 'apps.a6.desc': 'Сборник национальных узбекских игр: перетягивание каната, беш тош, ошик, чиллак, курэш и другие. С рейтингом.',
        'skills.title': 'Направления',
        'skills.c1': 'Электросетевые системы', 'skills.c2': 'Электробезопасность и надёжность', 'skills.c3': 'Релейная защита',
        'skills.s1': 'Электромонтаж', 'skills.s2': 'Средства защиты', 'skills.s3': 'Установка автоматов', 'skills.s4': 'Настройка автоматов',
        'projects.title': 'Проекты будущего',
        'projects.p1.title': 'Беспроводная передача электроэнергии',
        'projects.p1.desc': 'Технология основана на законах электромагнитной индукции. На языке энергетики это похоже на «трансформатор, работающий через воздух».',
        'projects.p2.title': 'Водородный генератор',
        'projects.p2.desc': 'Когда солнечные панели днём вырабатывают избыточный ток, его можно направить не в аккумулятор, а в водородный генератор. Полученный водород хранится в баллонах.',
        'projects.p3.title': 'Умный счётчик',
        'projects.p3.desc': 'Современное микропроцессорное устройство, которое не только учитывает потреблённую электроэнергию, но и дистанционно передаёт данные энергоснабжающей организации в реальном времени.',
        'projects.tag1': 'Талантливые студенты', 'projects.tag2': 'Современная лаборатория', 'projects.tag3': 'Точные расчёты',
        'projects.more': 'Подробнее →',
        'contact.title': 'Контакты',
        'contact.lead': 'Есть новые проекты? Свяжитесь с нами.',
        'form.name': 'Ваше имя', 'form.message': 'О вашем проекте', 'form.send': 'Отправить сообщение',
        'form.sending': 'Отправка…',
        'form.ok': 'Спасибо! Ваше сообщение отправлено.',
        'form.err': 'Не удалось отправить. Попробуйте ещё раз или напишите на email.',
        'footer.tag': 'Реальные проекты, точные расчёты.'
    },
    en: {
        title: 'EnergyVibe — Daler Qurbonaliyev | Power Supply Engineer',
        meta: 'Personal website of power supply engineer Daler Qurbonaliyev: energy projects, calculation tools and simulators.',
        skip: 'Skip to main content',
        'nav.about': 'About', 'nav.tools': 'Tools', 'nav.skills': 'Expertise', 'nav.projects': 'Projects', 'nav.contact': 'Contact', 'nav.apps': 'Apps',
        'hero.eyebrow': 'Power supply engineer',
        'hero.hello': 'Hi, I’m', 'hero.name': 'Daler',
        'hero.lead': 'Create new projects in engineering and technology with us.',
        'hero.cta1': 'Our projects', 'hero.cta2': 'Get in touch', 'hero.cta3': 'Open the tools',
        'about.title': 'About me',
        'about.text': 'A specialist in electrical power supply. I have hands-on experience with engineering calculations and design software (AutoCAD, Compass-3D, MATLAB, Mathcad). I have completed a practical project on designing energy facilities and keep developing my skills in technical documentation and system optimisation.',
        'about.s1': 'Projects', 'about.s2': 'Years of experience', 'about.s3': 'Clients',
        'about.cap': 'Single-line diagram: 10 kV → transformer → 0.4 kV consumers',
        'tools.title': 'Engineering tools',
        'tools.lead': 'Practical programs, simulators and calculation tools available on this site.',
        'tools.open': 'Open →',
        'tools.locked': 'Code required',
        'tools.t1.tag': 'Simulator', 'tools.t1.title': 'Power system', 'tools.t1.desc': 'A demo model of power stations (thermal, nuclear, solar) and consumers.',
        'tools.t2.tag': 'Prototype', 'tools.t2.title': 'RES system project', 'tools.t2.desc': 'Prototype of the RES internship portal: student account and admin control panel.',
        'tools.t3.tag': 'Animation', 'tools.t3.title': 'Residential consumption', 'tools.t3.desc': 'Distribution animation: 10 kV line → transformer → 0.4 kV residential network.',
        'tools.t4.tag': 'Course project', 'tools.t4.title': 'EET course project', 'tools.t4.desc': 'Electrical networks course project and its checking tool.',
        'tools.t5.tag': 'Calculator', 'tools.t5.title': 'Economic calculator', 'tools.t5.desc': 'A calculator for electricity consumption and its cost.',
        'tools.t6.tag': 'Chart', 'tools.t6.title': 'Load curve', 'tools.t6.desc': 'Daily electrical load curve with the times of maximum and minimum load.',
        'tools.t7.tag': '3D trainer', 'tools.t7.title': 'Switchboard wiring', 'tools.t7.desc': 'Assemble a home switchboard in 3D: breaker, RCD, meter. Watch how protection trips on a short circuit and on leakage current.',
        'tools.t8.tag': '3D trainer', 'tools.t8.title': 'Circuit breaker assembly', 'tools.t8.desc': 'Build a circuit breaker part by part in 3D: terminals, contact, arc chute, coil, bimetal. Then test how it trips on overload and short circuit.',
        'tools.t9.tag': '3D trainer', 'tools.t9.title': 'Frequency drive wiring', 'tools.t9.desc': 'Wire the frequency drive, motor, braking resistor, potentiometer and START/STOP buttons yourself. Then run the motor, change the frequency and test the protection faults.',
        'tools.t10.tag': '3D trainer', 'tools.t10.title': 'Reversing drive with sensors', 'tools.t10.desc': 'Wire the breaker, two contactors, 24 V supply, interposing relays and PNP sensors through cable ducts. Then watch the carriage shuttle between the sensors and see how the interlock works.',
        'tools.t11.tag': '3D trainer', 'tools.t11.title': 'Home switchboard: meter and RCBOs', 'tools.t11.desc': 'Wire the energy meter, main breaker, voltage relay, RCBOs, sockets, switch and lamp. Then test how the protection trips with a kettle, an oven and faulty appliances.',
        'tools.t12.tag': 'Training simulator', 'tools.t12.title': 'Substation simulator', 'tools.t12.desc': 'Take the dispatcher’s order, perform switching on the single-line diagram in the right sequence, apply earthing, hang warning signs and keep the log. Interlocks and the consequences of mistakes work like in real life.',
        'tools.t13.tag': 'History site', 'tools.t13.title': 'History of physics', 'tools.t13.desc': 'From Archimedes to Einstein: a timeline, great scientists and 6 historic experiments you can repeat in the browser.',
        'tools.t14.tag': 'Educational game', 'tools.t14.title': 'Electrical engineer: one working day', 'tools.t14.desc': 'A day at a plant: diagnose motor faults with instruments, repair safely, justify repair vs. replacement economically and propose energy savings. 25 tasks, random root causes (game interface is in Uzbek).',
        'tools.t15.tag': 'Course project', 'tools.t15.title': 'Relay protection and automation', 'tools.t15.desc': 'Pick a scheme and variant, enter the line lengths: short-circuit currents, line and transformer protections, auto-reclosing/ATS and the settings map are calculated. Download the finished course project as a Word file (interface is in Uzbek).',
        'tools.t16.tag': 'Course project', 'tools.t16.title': 'Industrial plant power supply', 'tools.t16.desc': 'Pick the plant and variant, enter workshop areas, coordinates and cable lengths measured from the site plan — the whole design is calculated. Word, Excel and A1 drawings as PDF (interface is in Uzbek).',
        'tools.t17.tag': 'App demo', 'tools.t17.title': 'EV charging', 'tools.t17.desc': 'A charging-station app: battery percentage, range and price change in real time; unplug, pay in sum or dollars and print a receipt. In 3 languages.',
        'tools.t18.tag': 'Game', 'tools.t18.title': 'City builder', 'tools.t18.desc': 'A 40-level game: stations, lines and transformers light up the city. Part 2 adds biogas, wind turbines, two-way (N-1) supply and backup power for hospitals (interface is in Uzbek).',
        'tools.t19.tag': '3D trainer', 'tools.t19.title': 'Build a transformer', 'tools.t19.desc': 'Assemble a TM-630/10 transformer in 13 steps: core, windings, Δ/Y₀ connection, tank, oil, conservator and a 10 kV test. A question and explanation at every step. In 3 languages.',
        'tools.t20.tag': 'Course project', 'tools.t20.title': 'Power transformer design', 'tools.t20.desc': 'Electrical Machines course project: pick a variant and the main dimensions, LV and HV windings, short-circuit and no-load parameters, thermal design and tank are calculated. Download the report as a Word file in Uzbek or Russian.',
        'tools.t21.tag': 'Teaching tool', 'tools.t21.title': 'Python Dars: lab session monitor', 'tools.t21.desc': '8 lab sessions: variants are handed out automatically and code runs in Python right in the browser. The teacher watches 20+ students’ code live, fixes it and sends harder problems.',
        'apps.title': 'Apps',
        'apps.lead': 'My apps and games for your phone: download them or open them in the browser.',
        'apps.a1.tag': 'Android · iPhone', 'apps.a1.title': 'Rele Lug‘at', 'apps.a1.desc': 'Learn relay protection by playing: 214 terms, 24 diagrams, 170 quiz questions. Works offline.',
        'apps.a2.tag': 'Android app', 'apps.a2.title': 'Home Food', 'apps.a2.desc': 'A marketplace for home-cooked meals: buyer, seller and courier apps.',
        'apps.a3.tag': 'Android · iPhone', 'apps.a3.title': 'Cats & Dogs', 'apps.a3.desc': 'Photograph the stray cats and dogs you meet on the street; the location is tagged automatically.',
        'apps.a4.tag': 'Android app', 'apps.a4.title': 'Physics', 'apps.a4.desc': 'For grades 6–11 and applicants: textbook quizzes, certificate prep and lab games.',
        'apps.a5.tag': 'Android app', 'apps.a5.title': 'ElektrUy', 'apps.a5.desc': 'From a room photo: cable route, diagram, 3D view and materials list. Voice lessons.',
        'apps.a6.tag': 'Web games', 'apps.a6.title': 'Games', 'apps.a6.desc': 'A collection of traditional Uzbek games: tug of war, besh tosh, oshiq, chillak, kurash and more. With a leaderboard.',
        'skills.title': 'Expertise',
        'skills.c1': 'Electrical network systems', 'skills.c2': 'Electrical safety and reliability', 'skills.c3': 'Relay protection',
        'skills.s1': 'Electrical installation', 'skills.s2': 'Protective equipment', 'skills.s3': 'Circuit breaker installation', 'skills.s4': 'Circuit breaker setup',
        'projects.title': 'Future projects',
        'projects.p1.title': 'Wireless power transfer',
        'projects.p1.desc': 'The technology is based on the laws of electromagnetic induction. In power-engineering terms, it is like a “transformer that works through the air”.',
        'projects.p2.title': 'Hydrogen generator',
        'projects.p2.desc': 'When solar panels produce surplus current during the day, it can be sent to a hydrogen generator instead of a battery. The hydrogen produced is stored in tanks.',
        'projects.p3.title': 'Smart meter',
        'projects.p3.desc': 'A modern microprocessor-based device that not only measures the electricity consumed but also transmits data to the utility remotely, in real time.',
        'projects.tag1': 'Talented students', 'projects.tag2': 'Modern laboratory', 'projects.tag3': 'Precise calculations',
        'projects.more': 'Learn more →',
        'contact.title': 'Contact',
        'contact.lead': 'Have a new project? Get in touch with us.',
        'form.name': 'Your name', 'form.message': 'About your project', 'form.send': 'Send message',
        'form.sending': 'Sending…',
        'form.ok': 'Thank you! Your message has been sent.',
        'form.err': 'Could not send the message. Please try again or write by email.',
        'footer.tag': 'Real projects, precise calculations.'
    }
};

const LANG_KEY = 'energyvibe-lang';
let currentLang = 'uz';

function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.uz[key] || key;
}

function setLang(lang) {
    if (!I18N[lang]) lang = 'uz';
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = t('title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta'));

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage may be blocked */ }
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

let saved = null;
try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* ignore */ }
setLang(saved && I18N[saved] ? saved : 'uz');

/* ---------- 2. Navigation, progress bar, voltage rail ---------- */
const navbar = document.getElementById('navbar');
const navMenu = document.getElementById('nav-menu');
const hamburger = document.getElementById('hamburger');
const progressTop = document.getElementById('progress-top');
const heroPhoto = document.getElementById('hero-photo');
const rail = document.getElementById('rail');
const railItems = [...rail.querySelectorAll('li')];
const navLinks = [...navMenu.querySelectorAll('a')];
const hero = document.getElementById('home');
const stationIds = railItems.map(li => li.dataset.target);
const stationEls = stationIds.map(id => document.getElementById(id));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function closeMenu() {
    navMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
}
hamburger.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
});
navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
document.addEventListener('click', e => {
    if (!navbar.contains(e.target)) closeMenu();
});
railItems.forEach(li => li.addEventListener('click', () => {
    const el = document.getElementById(li.dataset.target);
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}));

let ticking = false;
function onScroll() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const doc = document.documentElement;

    navbar.classList.toggle('scrolled', y > 30);

    const max = doc.scrollHeight - vh;
    progressTop.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';

    if (!reducedMotion && heroPhoto && y < vh * 1.3) {
        heroPhoto.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
    }

    // active station
    let active = -1;
    stationEls.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= vh * 0.4) active = i;
    });
    navLinks.forEach(a => {
        const idx = stationIds.indexOf(a.getAttribute('href').slice(1));
        a.classList.toggle('active', idx !== -1 && idx === active);
    });
    railItems.forEach((li, i) => {
        li.classList.toggle('on', i === active);
        li.classList.toggle('done', i < active);
    });

    // rail progress: from the first station to the last one
    const start = stationEls[0].offsetTop;
    const end = stationEls[stationEls.length - 1].offsetTop;
    const p = Math.max(0, Math.min(1, (y + vh * 0.4 - start) / (end - start)));
    rail.style.setProperty('--p', p.toFixed(3));
    rail.classList.toggle('show', y > hero.offsetHeight * 0.55);
}
window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* ---------- 3. Reveal on scroll ---------- */
const revealEls = [...document.querySelectorAll('.reveal')];
if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => {
        const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
        el.style.transitionDelay = (siblings.indexOf(el) % 4) * 90 + 'ms';
        revealObserver.observe(el);
    });
} else {
    revealEls.forEach(el => el.classList.add('in'));
}

/* ---------- 4. Skill gauges ---------- */
function setGauge(g) {
    const v = Math.max(0, Math.min(100, Number(g.dataset.value) || 0));
    const fill = g.querySelector('.g-fill');
    const needle = g.querySelector('.g-needle');
    fill.style.strokeDasharray = v + ' 100';
    needle.style.transform = 'rotate(' + (-90 + v * 1.8) + 'deg)';
}
const gaugeEls = [...document.querySelectorAll('.gauge')];
if ('IntersectionObserver' in window && !reducedMotion) {
    const gaugeObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.gauge').forEach((g, i) => setTimeout(() => setGauge(g), 250 + i * 200));
                gaugeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('.skill-category').forEach(c => gaugeObserver.observe(c));
} else {
    gaugeEls.forEach(setGauge);
}

/* ---------- 5. Hero: three-phase waves + cursor glow ---------- */
(function heroFx() {
    const canvas = document.getElementById('phase-canvas');
    const glow = document.getElementById('hero-glow');

    if (glow) {
        hero.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            glow.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
            glow.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        }, { passive: true });
    }
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = ['#ffd23f', '#2fd6a3', '#ff4d79'];   // A yellow, B green, C red
    let W = 0, H = 0, dpr = 1, phase = 0, visible = true;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const period = W < 640 ? 300 : 520;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[k];
            ctx.shadowColor = colors[k];
            ctx.shadowBlur = 12;
            ctx.globalAlpha = 0.92;
            for (let x = -4; x <= W + 4; x += 3) {
                const a = (x / period) * Math.PI * 2 - phase - k * (2 * Math.PI / 3);
                const y = H / 2 - Math.sin(a) * (H * 0.36);
                x === -4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function loop() {
        if (visible) { phase += 0.035; draw(); }
        requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
    }
    if (!reducedMotion) requestAnimationFrame(loop);
})();

/* ---------- 6. Contact form (real result, not a fake success) ---------- */
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const sendLabel = form.querySelector('.send-label');

form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    sendLabel.textContent = t('form.sending');
    statusEl.className = 'form-status';
    statusEl.textContent = '';

    try {
        const res = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        statusEl.classList.add('ok');
        statusEl.textContent = t('form.ok');
    } catch (err) {
        statusEl.classList.add('err');
        statusEl.textContent = t('form.err');
    } finally {
        btn.disabled = false;
        sendLabel.textContent = t('form.send');
    }
});
