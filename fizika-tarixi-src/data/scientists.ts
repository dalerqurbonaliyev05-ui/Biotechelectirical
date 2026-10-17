import { l } from "@/lib/i18n/types";
import type { Scientist } from "./types";

export const SCIENTISTS: Scientist[] = [
  {
    slug: "arximed",
    initials: "AR",
    name: l("Arximed", "Архимед", "Archimedes"),
    years: l("m.a. 287 – 212 (taxminan)", "ок. 287 – 212 до н. э.", "c. 287 – 212 BC"),
    born: l("Sirakuza (Sitsiliya)", "Сиракузы (Сицилия)", "Syracuse (Sicily)"),
    field: l("Mexanika, gidrostatika", "Механика, гидростатика", "Mechanics, hydrostatics"),
    branches: ["mexanika"],
    summary: l(
      "Qadimgi yunon olimi: suzish qonuni va richag nazariyasi muallifi.",
      "Древнегреческий учёный, автор закона плавучести и теории рычага.",
      "Ancient Greek scholar, author of the law of buoyancy and the theory of the lever.",
    ),
    bio: l(
      [
        "Arximed Sitsiliyadagi Sirakuza shahrida yashagan. U fizikani matematika bilan birinchilardan bo‘lib bog‘lagan: jismlarning muvozanatini va suyuqlikdagi holatini aniq hisoblar bilan ifodalagan.",
        "Rivoyatga ko‘ra, u hammomda suv sathi ko‘tarilishini ko‘rib, toj zargarlik qalbaki emasligini tekshirish usulini topgan va “Evrika!” deb xitob qilgan. Bu hikoya keyinroq yozilgan, ammo uning g‘oyasi — jism hajmini suv siqib chiqarishi — haqiqiy kashfiyotga yaqin.",
      ],
      [
        "Архимед жил в Сиракузах на Сицилии. Он одним из первых соединил физику с математикой: равновесие тел и их поведение в жидкости он описывал точными расчётами.",
        "По преданию, увидев в бане, как поднимается вода, он нашёл способ проверить, не подделан ли золотой венец, и воскликнул «Эврика!». История записана позже, но её идея — вытеснение воды телом — близка к настоящему открытию.",
      ],
      [
        "Archimedes lived in Syracuse, Sicily. He was among the first to join physics with mathematics, describing the balance of bodies and their behaviour in fluids with exact calculations.",
        "According to legend, he noticed the water rise in a bath, found a way to test whether a golden crown was fake, and shouted “Eureka!”. The story was written down later, but its idea — a body displacing water — is close to the real discovery.",
      ],
    ),
    achievements: l(
      [
        "Suzish qonuni: suyuqlikka botirilgan jismga siqib chiqarilgan suyuqlik og‘irligiga teng kuch ta’sir etadi.",
        "Richag qonuni: kichik kuch uzun yelka orqali katta yukni ko‘taradi.",
        "π sonini taxminan 3,14 aniqlikda baholagan.",
      ],
      [
        "Закон плавучести: на тело, погружённое в жидкость, действует сила, равная весу вытесненной жидкости.",
        "Закон рычага: малая сила на длинном плече поднимает большой груз.",
        "Оценил число π с точностью около 3,14.",
      ],
      [
        "The law of buoyancy: a body immersed in a fluid feels a force equal to the weight of the fluid it displaces.",
        "The law of the lever: a small force on a long arm lifts a large load.",
        "Estimated π to about 3.14.",
      ],
    ),
    experiments: ["arximed-suzish"],
  },
  {
    slug: "ibn-al-haysam",
    initials: "IH",
    name: l("Ibn al-Haysam", "Ибн аль-Хайсам", "Ibn al-Haytham"),
    years: l("taxminan 965 – 1040", "ок. 965 – 1040", "c. 965 – 1040"),
    born: l("Basra", "Басра", "Basra"),
    field: l("Optika, tajriba usuli", "Оптика, экспериментальный метод", "Optics, the experimental method"),
    branches: ["optika"],
    summary: l(
      "“Optika kitobi” muallifi, ko‘rish va yorug‘lik haqidagi ta’limotni tajribaga tayantirgan.",
      "Автор «Книги оптики», опиравший учение о зрении и свете на опыт.",
      "Author of the Book of Optics, who grounded the study of vision and light in experiment.",
    ),
    bio: l(
      [
        "Ibn al-Haysam Basrada tug‘ilgan, umrining ko‘p qismini Qohirada o‘tkazgan. U “Optika kitobi”ni 1011–1021-yillarda yozgan.",
        "O‘sha davrda ko‘z nur chiqaradi deb o‘ylashgan. Ibn al-Haysam esa tajribalar bilan ko‘rish jismdan qaytgan yorug‘lik ko‘zga tushganda sodir bo‘lishini isbotladi. U qorong‘i xona (kamera-obskura) bilan ham ishlagan.",
      ],
      [
        "Ибн аль-Хайсам родился в Басре, большую часть жизни провёл в Каире. «Книгу оптики» он написал в 1011–1021 годах.",
        "В то время считали, что глаз испускает лучи. Ибн аль-Хайсам опытами доказал: мы видим, когда свет, отражённый от предмета, попадает в глаз. Он работал и с тёмной комнатой (камерой-обскурой).",
      ],
      [
        "Ibn al-Haytham was born in Basra and spent much of his life in Cairo. He wrote the Book of Optics in 1011–1021.",
        "At the time many believed the eye emits rays. Ibn al-Haytham showed by experiment that we see when light reflected from an object enters the eye. He also worked with the dark chamber (camera obscura).",
      ],
    ),
    achievements: l(
      [
        "Ko‘rish nazariyasi: yorug‘lik ko‘zga tashqaridan tushadi.",
        "Qaytish va sinish hodisalarini tajriba bilan o‘rgangan.",
        "Gipoteza → tajriba → xulosa tartibini izchil qo‘llagan.",
      ],
      [
        "Теория зрения: свет попадает в глаз извне.",
        "Опытно изучал отражение и преломление света.",
        "Последовательно применял порядок «гипотеза → опыт → вывод».",
      ],
      [
        "A theory of vision: light enters the eye from outside.",
        "Studied reflection and refraction experimentally.",
        "Applied the sequence hypothesis → experiment → conclusion consistently.",
      ],
    ),
    experiments: ["yorugliq-sinishi"],
  },
  {
    slug: "beruniy",
    initials: "AB",
    name: l("Abu Rayhon Beruniy", "Абу Райхан Бируни", "Abu Rayhan al-Biruni"),
    years: l("973 – 1048", "973 – 1048", "973 – 1048"),
    born: l("Kat (Xorazm)", "Кят (Хорезм)", "Kath (Khwarezm)"),
    field: l("Fizika, geodeziya, astronomiya", "Физика, геодезия, астрономия", "Physics, geodesy, astronomy"),
    branches: ["astronomiya", "mexanika"],
    summary: l(
      "Xorazmlik ensiklopedist olim: Yer radiusini o‘lchagan, moddalar zichligini aniq aniqlagan.",
      "Хорезмийский учёный-энциклопедист: измерил радиус Земли и точно определял плотности веществ.",
      "A polymath from Khwarezm who measured the Earth's radius and determined the densities of substances precisely.",
    ),
    bio: l(
      [
        "Beruniy Xorazmning Kat shahrida tug‘ilgan. Fizika, astronomiya, geodeziya, tarix va geografiya bo‘yicha o‘nlab asarlar yozgan. Hindistonga safarida u mahalliy ilmni o‘rgangan va “Hindiston” kitobini yaratgan.",
        "U Yer radiusini tog‘ balandligi va ufq burchagini o‘lchash orqali hisoblagan — bu usul ancha aniq natija bergan. Shuningdek, ko‘plab metall va qimmatbaho toshlarning solishtirma og‘irligini o‘lchagan.",
      ],
      [
        "Бируни родился в городе Кят в Хорезме. Он написал десятки трудов по физике, астрономии, геодезии, истории и географии. Во время путешествия в Индию изучал местную науку и создал книгу «Индия».",
        "Радиус Земли он вычислил, измерив высоту горы и угол понижения горизонта, и получил довольно точный результат. Он также измерял удельный вес многих металлов и драгоценных камней.",
      ],
      [
        "Biruni was born in Kath in Khwarezm. He wrote dozens of works on physics, astronomy, geodesy, history and geography. On his journey to India he studied local learning and wrote the book India.",
        "He calculated the Earth's radius by measuring a mountain's height and the dip angle of the horizon, with a fairly accurate result. He also measured the specific weight of many metals and gems.",
      ],
    ),
    achievements: l(
      [
        "Yer radiusini geodezik usulda hisoblagan.",
        "Moddalar solishtirma og‘irligini aniq o‘lchagan.",
        "Astronomiya va geodeziyada o‘lchash usullarini rivojlantirgan.",
      ],
      [
        "Вычислил радиус Земли геодезическим методом.",
        "Точно измерял удельный вес веществ.",
        "Развивал методы измерений в астрономии и геодезии.",
      ],
      [
        "Calculated the Earth's radius by a geodetic method.",
        "Measured the specific weight of substances accurately.",
        "Advanced measurement methods in astronomy and geodesy.",
      ],
    ),
    experiments: ["arximed-suzish"],
  },
  {
    slug: "ulugbek",
    initials: "UB",
    name: l("Mirzo Ulug‘bek", "Мирзо Улугбек", "Mirzo Ulugh Beg"),
    years: l("1394 – 1449", "1394 – 1449", "1394 – 1449"),
    born: l("Sultoniya", "Султания", "Soltaniyeh"),
    field: l("Astronomiya", "Астрономия", "Astronomy"),
    branches: ["astronomiya"],
    summary: l(
      "Temuriy hukmdor va astronom: Samarqand rasadxonasi va yulduzlar jadvali muallifi.",
      "Тимурид-правитель и астроном: создатель Самаркандской обсерватории и звёздного каталога.",
      "Timurid ruler and astronomer: founder of the Samarkand observatory and its star catalogue.",
    ),
    bio: l(
      [
        "Ulug‘bek Samarqandda hukmronlik qilgan va ilm-fanga alohida e’tibor bergan. 1420-yillarda u shaharda o‘z davrining eng yirik rasadxonalaridan birini qurdirgan. Asosiy asbob — katta meridian yoyi — yulduz va sayyoralar o‘rnini yuqori aniqlikda o‘lchash imkonini bergan.",
        "Rasadxonada olib borilgan kuzatuvlar asosida “Ziji Jadidi Guragoniy” yulduzlar jadvali tuzildi. Unda 1018 ta yulduzning o‘rni berilgan. Yil uzunligi esa haqiqiy qiymatdan bir daqiqadan ham kamroqqa farq qilgan.",
      ],
      [
        "Улугбек правил в Самарканде и уделял особое внимание науке. В 1420-х годах он построил в городе одну из крупнейших обсерваторий своего времени. Главный инструмент — большая меридианная дуга — позволял измерять положения звёзд и планет с высокой точностью.",
        "По наблюдениям обсерватории составлен звёздный каталог «Зидж-и Джадид-и Гураганий», где указаны положения 1018 звёзд. Длина года отличалась от истинной менее чем на минуту.",
      ],
      [
        "Ulugh Beg ruled in Samarkand and paid special attention to science. In the 1420s he had one of the largest observatories of his time built in the city. Its main instrument, a large meridian arc, allowed the positions of stars and planets to be measured with high accuracy.",
        "From the observatory's records the star catalogue Zij-i Jadid-i Guragani was compiled, listing the positions of 1018 stars. His length of the year differed from the true value by less than a minute.",
      ],
    ),
    achievements: l(
      [
        "Samarqand rasadxonasini barpo etgan.",
        "1018 ta yulduzni o‘z ichiga olgan jadval tuzgan.",
        "Yil uzunligini yuqori aniqlikda hisoblagan.",
      ],
      [
        "Основал Самаркандскую обсерваторию.",
        "Составил каталог из 1018 звёзд.",
        "С высокой точностью определил длину года.",
      ],
      [
        "Founded the Samarkand observatory.",
        "Compiled a catalogue of 1018 stars.",
        "Determined the length of the year with high accuracy.",
      ],
    ),
    experiments: ["nyuton-orbita"],
  },
  {
    slug: "galiley",
    initials: "GG",
    name: l("Galileo Galiley", "Галилео Галилей", "Galileo Galilei"),
    years: l("1564 – 1642", "1564 – 1642", "1564 – 1642"),
    born: l("Piza", "Пиза", "Pisa"),
    field: l("Mexanika, astronomiya", "Механика, астрономия", "Mechanics, astronomy"),
    branches: ["mexanika", "astronomiya"],
    summary: l(
      "Tajribaviy fizikaning asoschilaridan biri: erkin tushish, inersiya va teleskop kuzatuvlari.",
      "Один из основателей экспериментальной физики: свободное падение, инерция и наблюдения в телескоп.",
      "One of the founders of experimental physics: free fall, inertia and telescope observations.",
    ),
    bio: l(
      [
        "Galiley Italiyaning Piza shahrida tug‘ilgan. U harakatni o‘lchab o‘rgangan: qiya tekislikda sharcha dumalashini kuzatib, bosib o‘tilgan yo‘l vaqt kvadratiga proporsional ekanini ko‘rsatgan. Bu g‘oya Nyuton mexanikasiga yo‘l ochdi.",
        "1609–1610-yillarda u teleskopni takomillashtirib, Oy tog‘lari va Yupiterning to‘rtta yo‘ldoshini ko‘rdi. Natijalarni 1610-yilda “Yulduzlar xabarchisi” asarida e’lon qildi. Keyinchalik Yer harakati haqidagi qarashlari uchun cherkov sudiga tortildi.",
      ],
      [
        "Галилей родился в Пизе. Он изучал движение с помощью измерений: наблюдая за шаром на наклонной плоскости, показал, что пройденный путь пропорционален квадрату времени. Эта идея открыла путь механике Ньютона.",
        "В 1609–1610 годах он усовершенствовал телескоп и увидел горы на Луне и четыре спутника Юпитера. Результаты опубликованы в 1610 году в «Звёздном вестнике». Позже за взгляды на движение Земли его судила церковь.",
      ],
      [
        "Galileo was born in Pisa. He studied motion by measurement: watching a ball on an inclined plane, he showed that the distance covered is proportional to the square of the time. This idea paved the way for Newton's mechanics.",
        "In 1609–1610 he improved the telescope and saw mountains on the Moon and four moons of Jupiter. He published the results in 1610 in Sidereus Nuncius. Later he was tried by the Church for his views on the motion of the Earth.",
      ],
    ),
    achievements: l(
      [
        "Tekis tezlanuvchan harakat: yo‘l ~ t².",
        "Inersiya g‘oyasini asoslagan.",
        "Yupiter yo‘ldoshlari va Oy relefini kashf etgan.",
      ],
      [
        "Равноускоренное движение: путь ~ t².",
        "Обосновал идею инерции.",
        "Открыл спутники Юпитера и рельеф Луны.",
      ],
      [
        "Uniformly accelerated motion: distance ~ t².",
        "Laid the groundwork for the idea of inertia.",
        "Discovered Jupiter's moons and the relief of the Moon.",
      ],
    ),
    experiments: ["galiley-qiyalik", "mayatnik"],
  },
  {
    slug: "nyuton",
    initials: "IN",
    name: l("Isaak Nyuton", "Исаак Ньютон", "Isaac Newton"),
    years: l("1643 – 1727", "1643 – 1727", "1643 – 1727"),
    born: l("Vulstorp (Angliya)", "Вулсторп (Англия)", "Woolsthorpe (England)"),
    field: l("Mexanika, optika, matematika", "Механика, оптика, математика", "Mechanics, optics, mathematics"),
    branches: ["mexanika", "astronomiya", "optika"],
    summary: l(
      "Harakat qonunlari va butun olam tortishish qonuni muallifi.",
      "Автор законов движения и закона всемирного тяготения.",
      "Author of the laws of motion and the law of universal gravitation.",
    ),
    bio: l(
      [
        "Nyuton 1687-yilda “Naturfalsafaning matematik asoslari” (“Prinsipiya”) asarini e’lon qildi. Unda uchta harakat qonuni va butun olam tortishish qonuni bayon etilgan: osmondagi sayyoralarni ham, yerdagi tushayotgan olmani ham yagona qonun boshqaradi.",
        "Optikada u prizma yordamida oq yorug‘lik turli ranglardan iborat ekanini ko‘rsatgan va akslantiruvchi teleskop yasagan. Matematikada Leybnis bilan birga differensial hisobning asoschisi hisoblanadi.",
      ],
      [
        "В 1687 году Ньютон опубликовал «Математические начала натуральной философии» («Начала»). В них изложены три закона движения и закон всемирного тяготения: планеты на небе и падающее яблоко на земле подчиняются одному закону.",
        "В оптике он с помощью призмы показал, что белый свет состоит из разных цветов, и построил зеркальный телескоп. В математике вместе с Лейбницем считается основателем дифференциального исчисления.",
      ],
      [
        "In 1687 Newton published the Mathematical Principles of Natural Philosophy (the Principia). It sets out the three laws of motion and the law of universal gravitation: the planets in the sky and an apple falling on Earth obey a single law.",
        "In optics he used a prism to show that white light consists of different colours, and built a reflecting telescope. In mathematics he shares with Leibniz the founding of the differential calculus.",
      ],
    ),
    achievements: l(
      [
        "Uch harakat qonuni.",
        "Butun olam tortishish qonuni: F = G·m₁·m₂ / r².",
        "Oq nurning spektri va akslantiruvchi teleskop.",
      ],
      [
        "Три закона движения.",
        "Закон всемирного тяготения: F = G·m₁·m₂ / r².",
        "Спектр белого света и зеркальный телескоп.",
      ],
      [
        "The three laws of motion.",
        "The law of universal gravitation: F = G·m₁·m₂ / r².",
        "The spectrum of white light and the reflecting telescope.",
      ],
    ),
    experiments: ["nyuton-orbita", "mayatnik"],
  },
  {
    slug: "faradey",
    initials: "MF",
    name: l("Maykl Faradey", "Майкл Фарадей", "Michael Faraday"),
    years: l("1791 – 1867", "1791 – 1867", "1791 – 1867"),
    born: l("Nyuington Batts (London)", "Ньюингтон-Баттс (Лондон)", "Newington Butts (London)"),
    field: l("Elektr va magnetizm", "Электричество и магнетизм", "Electricity and magnetism"),
    branches: ["elektr"],
    summary: l(
      "Elektromagnit induksiya hodisasini kashf etgan tajribachi olim.",
      "Учёный-экспериментатор, открывший электромагнитную индукцию.",
      "The experimentalist who discovered electromagnetic induction.",
    ),
    bio: l(
      [
        "Faradey kambag‘al oilada tug‘ilgan, kitob muqovalovchi shogirdi bo‘lib ishlagan, so‘ng Qirollik institutida olim bo‘lgan. U matematikani kam bilgan, ammo tajribalari juda aniq va g‘oyalari chuqur edi.",
        "1831-yilda u g‘altak yaqinida magnit harakatlanganda yoki g‘altakdagi tok o‘zgarganda ikkinchi g‘altakda tok paydo bo‘lishini aniqladi. Shu hodisa elektr generatorlari va transformatorlarning asosi bo‘ldi.",
      ],
      [
        "Фарадей родился в бедной семье, работал подмастерьем переплётчика, затем стал учёным в Королевском институте. Математику он знал мало, но опыты его были очень точны, а идеи — глубоки.",
        "В 1831 году он обнаружил, что при движении магнита около катушки или изменении тока в катушке во второй катушке возникает ток. Это явление стало основой электрических генераторов и трансформаторов.",
      ],
      [
        "Faraday was born into a poor family and worked as a bookbinder's apprentice before becoming a scientist at the Royal Institution. He knew little mathematics, but his experiments were precise and his ideas deep.",
        "In 1831 he found that moving a magnet near a coil, or changing the current in one coil, produces a current in another. This phenomenon became the basis of electric generators and transformers.",
      ],
    ),
    achievements: l(
      [
        "Elektromagnit induksiya (1831).",
        "Elektroliz qonunlari.",
        "Maydon (kuch chiziqlari) g‘oyasi.",
      ],
      [
        "Электромагнитная индукция (1831).",
        "Законы электролиза.",
        "Идея поля (силовых линий).",
      ],
      [
        "Electromagnetic induction (1831).",
        "The laws of electrolysis.",
        "The idea of the field (lines of force).",
      ],
    ),
    experiments: ["faradey-induksiya"],
  },
  {
    slug: "maksvell",
    initials: "JM",
    name: l("Jeyms Klerk Maksvell", "Джеймс Клерк Максвелл", "James Clerk Maxwell"),
    years: l("1831 – 1879", "1831 – 1879", "1831 – 1879"),
    born: l("Edinburg", "Эдинбург", "Edinburgh"),
    field: l("Elektrodinamika, molekulyar fizika", "Электродинамика, молекулярная физика", "Electrodynamics, molecular physics"),
    branches: ["elektr"],
    summary: l(
      "Elektr, magnetizm va yorug‘likni yagona nazariyada birlashtirgan.",
      "Объединил электричество, магнетизм и свет в единой теории.",
      "United electricity, magnetism and light in one theory.",
    ),
    bio: l(
      [
        "Maksvell Faradey g‘oyalarini matematik tilga o‘tkazdi. 1865-yilda e’lon qilingan nazariyasida elektr va magnit maydonlari to‘lqin sifatida tarqalishi, to‘lqin tezligi esa yorug‘lik tezligiga teng ekani ko‘rsatildi.",
        "Shundan xulosa: yorug‘lik — elektromagnit to‘lqin. Radio, mobil aloqa va Wi-Fi shu nazariyaga tayanadi. Maksvell gazlar kinetik nazariyasiga ham katta hissa qo‘shgan va 1861-yilda birinchi rangli fotosuratni namoyish etgan.",
      ],
      [
        "Максвелл перевёл идеи Фарадея на язык математики. В теории 1865 года показано, что электрические и магнитные поля распространяются как волна, а её скорость равна скорости света.",
        "Отсюда вывод: свет — электромагнитная волна. На этой теории основаны радио, мобильная связь и Wi-Fi. Максвелл внёс большой вклад и в кинетическую теорию газов, а в 1861 году продемонстрировал первую цветную фотографию.",
      ],
      [
        "Maxwell put Faraday's ideas into mathematical language. His 1865 theory showed that electric and magnetic fields travel as a wave whose speed equals the speed of light.",
        "The conclusion: light is an electromagnetic wave. Radio, mobile communication and Wi-Fi rest on this theory. Maxwell also contributed greatly to the kinetic theory of gases and demonstrated the first colour photograph in 1861.",
      ],
    ),
    achievements: l(
      [
        "Elektromagnit maydon tenglamalari.",
        "Yorug‘likning elektromagnit tabiati.",
        "Gazlar kinetik nazariyasi (Maksvell taqsimoti).",
      ],
      [
        "Уравнения электромагнитного поля.",
        "Электромагнитная природа света.",
        "Кинетическая теория газов (распределение Максвелла).",
      ],
      [
        "The equations of the electromagnetic field.",
        "The electromagnetic nature of light.",
        "The kinetic theory of gases (the Maxwell distribution).",
      ],
    ),
    experiments: ["faradey-induksiya", "yorugliq-sinishi"],
  },
  {
    slug: "kyuri",
    initials: "MK",
    name: l("Mariya Skłodovska-Kyuri", "Мария Склодовская-Кюри", "Marie Skłodowska-Curie"),
    years: l("1867 – 1934", "1867 – 1934", "1867 – 1934"),
    born: l("Varshava", "Варшава", "Warsaw"),
    field: l("Radioaktivlik", "Радиоактивность", "Radioactivity"),
    branches: ["kvant"],
    summary: l(
      "Radioaktivlikni o‘rgangan, ikki xil fan sohasida Nobel mukofoti olgan olima.",
      "Исследовательница радиоактивности, лауреат Нобелевской премии в двух разных науках.",
      "A pioneer of radioactivity who won Nobel Prizes in two different sciences.",
    ),
    bio: l(
      [
        "Mariya Kyuri Varshavada tug‘ilgan, Parijda o‘qigan. Eri Per Kyuri bilan birga uran rudasini tekshirib, 1898-yilda poloniy va radiy elementlarini kashf etdi. “Radioaktivlik” atamasini ham u fanga kiritgan.",
        "1903-yilda u Per Kyuri va Anri Bekkerel bilan birga fizika bo‘yicha, 1911-yilda esa kimyo bo‘yicha Nobel mukofotiga sazovor bo‘ldi. U Parij universitetida professor bo‘lgan birinchi ayol edi.",
      ],
      [
        "Мария Кюри родилась в Варшаве, училась в Париже. Вместе с мужем Пьером Кюри она исследовала урановую руду и в 1898 году открыла полоний и радий. Термин «радиоактивность» тоже ввела она.",
        "В 1903 году она вместе с Пьером Кюри и Анри Беккерелем получила Нобелевскую премию по физике, а в 1911 году — по химии. Она стала первой женщиной-профессором Парижского университета.",
      ],
      [
        "Marie Curie was born in Warsaw and studied in Paris. With her husband Pierre Curie she investigated uranium ore and in 1898 discovered polonium and radium. She also introduced the term “radioactivity”.",
        "In 1903 she shared the Nobel Prize in Physics with Pierre Curie and Henri Becquerel, and in 1911 she won the Nobel Prize in Chemistry. She became the first woman professor at the University of Paris.",
      ],
    ),
    achievements: l(
      [
        "Poloniy va radiy kashfiyoti (1898).",
        "Fizika (1903) va kimyo (1911) bo‘yicha Nobel mukofotlari.",
        "Radioaktivlik tadqiqotlari — atom fizikasi va tibbiyotga yo‘l ochdi.",
      ],
      [
        "Открытие полония и радия (1898).",
        "Нобелевские премии по физике (1903) и химии (1911).",
        "Исследования радиоактивности открыли путь атомной физике и медицине.",
      ],
      [
        "The discovery of polonium and radium (1898).",
        "Nobel Prizes in Physics (1903) and Chemistry (1911).",
        "Her work on radioactivity opened the way to atomic physics and medicine.",
      ],
    ),
    experiments: [],
  },
  {
    slug: "eynshteyn",
    initials: "AE",
    name: l("Albert Eynshteyn", "Альберт Эйнштейн", "Albert Einstein"),
    years: l("1879 – 1955", "1879 – 1955", "1879 – 1955"),
    born: l("Ulm (Germaniya)", "Ульм (Германия)", "Ulm (Germany)"),
    field: l("Nisbiylik nazariyasi, kvant fizikasi", "Теория относительности, квантовая физика", "Relativity, quantum physics"),
    branches: ["nisbiylik", "kvant"],
    summary: l(
      "Maxsus va umumiy nisbiylik nazariyalari muallifi, fotoeffekt tushuntirgan olim.",
      "Автор специальной и общей теорий относительности, объяснивший фотоэффект.",
      "Author of special and general relativity, who explained the photoelectric effect.",
    ),
    bio: l(
      [
        "1905-yilda Eynshteyn bir yilning o‘zida fotoeffekt, Broun harakati va maxsus nisbiylik nazariyasi haqida maqolalar e’lon qildi. Shu sababli 1905-yil “mo‘jizalar yili” deb ataladi. Nisbiylik nazariyasiga ko‘ra, vaqt va fazo kuzatuvchining harakatiga bog‘liq, massa va energiya esa E = mc² orqali bog‘langan.",
        "1915-yilda u umumiy nisbiylik nazariyasini yaratdi: tortishish — massa tufayli fazo-vaqtning egilishi. 1921-yilda unga Nobel mukofoti fotoeffekt qonunini tushuntirgani uchun berildi.",
      ],
      [
        "В 1905 году Эйнштейн за один год опубликовал работы о фотоэффекте, броуновском движении и специальной теории относительности. Поэтому 1905-й называют «годом чудес». По теории относительности время и пространство зависят от движения наблюдателя, а масса и энергия связаны формулой E = mc².",
        "В 1915 году он создал общую теорию относительности: тяготение — это искривление пространства-времени массой. В 1921 году Нобелевскую премию ему присудили за объяснение законов фотоэффекта.",
      ],
      [
        "In 1905 Einstein published, within a single year, papers on the photoelectric effect, Brownian motion and special relativity. That is why 1905 is called the “miracle year”. According to relativity, time and space depend on the observer's motion, while mass and energy are linked by E = mc².",
        "In 1915 he created general relativity: gravity is the curving of space-time by mass. In 1921 he received the Nobel Prize for explaining the laws of the photoelectric effect.",
      ],
    ),
    achievements: l(
      [
        "Maxsus nisbiylik nazariyasi va E = mc² (1905).",
        "Fotoeffekt tushuntirilishi — yorug‘lik kvantlari.",
        "Umumiy nisbiylik nazariyasi (1915).",
      ],
      [
        "Специальная теория относительности и E = mc² (1905).",
        "Объяснение фотоэффекта — кванты света.",
        "Общая теория относительности (1915).",
      ],
      [
        "Special relativity and E = mc² (1905).",
        "The explanation of the photoelectric effect — quanta of light.",
        "General relativity (1915).",
      ],
    ),
    experiments: [],
  },
];

export const SCIENTIST_BY_SLUG = Object.fromEntries(SCIENTISTS.map((s) => [s.slug, s])) as Record<string, Scientist>;
