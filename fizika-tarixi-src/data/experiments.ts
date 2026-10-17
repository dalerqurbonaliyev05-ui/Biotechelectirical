import { l } from "@/lib/i18n/types";
import type { ExperimentMeta } from "./types";

export const EXPERIMENTS: ExperimentMeta[] = [
  {
    slug: "arximed-suzish",
    branch: "mexanika",
    scientist: "arximed",
    title: l("Arximed: suzish qonuni", "Архимед: закон плавучести", "Archimedes: buoyancy"),
    lead: l(
      "Jismni suyuqlikka tushiring: zichliklarni o‘zgartirib, u suzishini yoki cho‘kishini kuzating.",
      "Опустите тело в жидкость: меняя плотности, наблюдайте, плавает оно или тонет.",
      "Drop a body into a fluid: change the densities and watch whether it floats or sinks.",
    ),
    formula: l(
      ["F_A = ρ_suyuqlik · g · V_botgan", "Suzadi, agar ρ_jism < ρ_suyuqlik"],
      ["F_A = ρ_ж · g · V_погр", "Плавает, если ρ_тела < ρ_ж"],
      ["F_A = ρ_fluid · g · V_sub", "Floats if ρ_body < ρ_fluid"],
    ),
    law: l(
      "Suyuqlikka botirilgan jismga yuqoriga yo‘nalgan itaruvchi kuch ta’sir etadi. Uning kattaligi jism siqib chiqargan suyuqlikning og‘irligiga teng.",
      "На погружённое в жидкость тело действует направленная вверх выталкивающая сила. Она равна весу вытесненной телом жидкости.",
      "A body immersed in a fluid feels an upward buoyant force. Its size equals the weight of the fluid the body displaces.",
    ),
    history: l(
      "Rivoyatga ko‘ra, Sirakuza shohi Gieron zargardan yasalgan tojning sof oltindan ekanligini tekshirishni Arximeddan so‘ragan. Arximed yechimni vannada o‘tirganda topgan. Hikoya keyinroq yozilgan bo‘lsa-da, suzish qonuni uning “Suzuvchi jismlar haqida” asarida bayon etilgan.",
      "По преданию, сиракузский царь Гиерон попросил Архимеда проверить, из чистого ли золота сделан венец. Решение Архимед нашёл, сидя в ванне. История записана позже, но закон плавучести изложен в его труде «О плавающих телах».",
      "According to legend, King Hiero of Syracuse asked Archimedes to check whether a crown was pure gold. Archimedes found the answer while sitting in a bath. The story was written down later, but the law of buoyancy is set out in his work On Floating Bodies.",
    ),
    observe: l(
      [
        "Jism zichligi suyuqlikdan kichik bo‘lsa, u suzadi; botgan qism ρ_jism / ρ_suyuqlik ga teng.",
        "Simobni tanlang: po‘lat ham suzadi, chunki simob po‘latdan zichroq.",
        "Zichlik suyuqlik zichligiga yetganda jism suyuqlik ichida muallaq turadi.",
      ],
      [
        "Если плотность тела меньше плотности жидкости, оно плавает; погружённая часть равна ρ_тела / ρ_жидкости.",
        "Выберите ртуть: даже сталь будет плавать, ведь ртуть плотнее стали.",
        "При равных плотностях тело «висит» внутри жидкости.",
      ],
      [
        "If the body is less dense than the fluid it floats; the submerged part equals ρ_body / ρ_fluid.",
        "Choose mercury: even steel floats, because mercury is denser than steel.",
        "When the densities are equal the body hangs suspended inside the fluid.",
      ],
    ),
  },
  {
    slug: "galiley-qiyalik",
    branch: "mexanika",
    scientist: "galiley",
    title: l("Galiley: qiya tekislik", "Галилей: наклонная плоскость", "Galileo: the inclined plane"),
    lead: l(
      "Sharcha qiya tekislikda tushadi. Belgilar teng vaqt oralig‘ida qo‘yilgan: yo‘llar qanday o‘sishini ko‘ring.",
      "Шар скатывается по наклонной плоскости. Метки поставлены через равные промежутки времени: посмотрите, как растут пути.",
      "A ball runs down an inclined plane. The marks are placed at equal time intervals: see how the distances grow.",
    ),
    formula: l(
      ["s = a · t² / 2", "a = g · sin θ  (sirpanish)", "a = (5/7) · g · sin θ  (dumalash)"],
      ["s = a · t² / 2", "a = g · sin θ  (скольжение)", "a = (5/7) · g · sin θ  (качение)"],
      ["s = a · t² / 2", "a = g · sin θ  (sliding)", "a = (5/7) · g · sin θ  (rolling)"],
    ),
    law: l(
      "Qiya tekislikda tezlanish burchak sinusiga proporsional, bosib o‘tilgan yo‘l esa vaqt kvadratiga proporsional. Teng vaqt oralig‘ida yo‘llar 1 : 4 : 9 : 16 kabi nisbatda bo‘ladi.",
      "На наклонной плоскости ускорение пропорционально синусу угла, а пройденный путь — квадрату времени. За равные промежутки времени пути относятся как 1 : 4 : 9 : 16.",
      "On an inclined plane the acceleration is proportional to the sine of the angle, and the distance to the square of the time. At equal time intervals the distances are in the ratio 1 : 4 : 9 : 16.",
    ),
    history: l(
      "Tez tushayotgan jismni o‘lchash qiyin edi, shuning uchun Galiley harakatni sekinlashtirdi: sharchani qiya tekislikda dumalatib, teng vaqt oralig‘ida bosib o‘tilgan yo‘llarni o‘lchadi. Natija erkin tushish tekis tezlanuvchan harakat ekanini ko‘rsatdi.",
      "Быстро падающее тело трудно измерить, поэтому Галилей замедлил движение: он катил шар по наклонной плоскости и измерял пути за равные промежутки времени. Результат показал, что свободное падение — равноускоренное движение.",
      "A fast-falling body is hard to measure, so Galileo slowed the motion down: he rolled a ball along an inclined plane and measured the distances covered in equal time intervals. The result showed that free fall is uniformly accelerated motion.",
    ),
    observe: l(
      [
        "Belgilar orasidagi vaqt teng, lekin yo‘llar 1 : 4 : 9 : 16 kabi o‘sadi.",
        "Burchakni oshirsangiz, tezlanish va tezlik ortadi.",
        "Sirpanishda sharcha dumalashdan tezroq tushadi: dumalashda energiyaning bir qismi aylanishga ketadi.",
      ],
      [
        "Время между метками одинаково, а пути растут как 1 : 4 : 9 : 16.",
        "С ростом угла увеличиваются ускорение и скорость.",
        "При скольжении шар спускается быстрее, чем при качении: при качении часть энергии уходит на вращение.",
      ],
      [
        "The time between marks is equal, while the distances grow as 1 : 4 : 9 : 16.",
        "A larger angle gives a larger acceleration and speed.",
        "Sliding is faster than rolling: when rolling, part of the energy goes into rotation.",
      ],
    ),
  },
  {
    slug: "mayatnik",
    branch: "mexanika",
    scientist: "galiley",
    title: l("Mayatnik tebranishi", "Колебания маятника", "The pendulum"),
    lead: l(
      "Ipning uzunligini, sayyorani va boshlang‘ich burchakni o‘zgartiring, tebranish davrini o‘lchang.",
      "Меняйте длину нити, планету и начальный угол и измеряйте период колебаний.",
      "Change the string length, the planet and the starting angle, and measure the period.",
    ),
    formula: l(
      ["T₀ = 2π · √(L / g)", "θ″ = −(g / L) · sin θ"],
      ["T₀ = 2π · √(L / g)", "θ″ = −(g / L) · sin θ"],
      ["T₀ = 2π · √(L / g)", "θ″ = −(g / L) · sin θ"],
    ),
    law: l(
      "Kichik burilishlarda mayatnik davri amplitudaga bog‘liq emas: u uzunlik ildiziga to‘g‘ri, erkin tushish tezlanishi ildiziga teskari proporsional.",
      "При малых углах период маятника не зависит от амплитуды: он пропорционален корню из длины и обратно пропорционален корню из ускорения свободного падения.",
      "For small angles the period does not depend on the amplitude: it is proportional to the square root of the length and inversely proportional to the square root of the gravitational acceleration.",
    ),
    history: l(
      "Rivoyatga ko‘ra, Galiley Piza soborida lampa tebranishini o‘z tomir urishi bilan taqqoslab, davr amplitudaga deyarli bog‘liq emasligini payqagan. 1650-yillarda Gyuygens mayatnikli soatni yaratdi va vaqtni o‘lchash aniqligi keskin oshdi.",
      "По преданию, Галилей в Пизанском соборе сравнивал качание лампады со своим пульсом и заметил, что период почти не зависит от амплитуды. В 1650-х годах Гюйгенс создал маятниковые часы, и точность измерения времени резко выросла.",
      "According to legend, Galileo in Pisa Cathedral compared a swinging lamp to his own pulse and noticed that the period hardly depends on the amplitude. In the 1650s Huygens built the pendulum clock, and the accuracy of timekeeping jumped.",
    ),
    observe: l(
      [
        "Uzunlikni 4 marta oshirsangiz, davr 2 marta ortadi.",
        "Oyda (g kichik) mayatnik sekinroq tebranadi, Yupiterda tezroq.",
        "Amplituda 60° dan oshsa, o‘lchangan davr formuladagidan sezilarli uzun bo‘ladi.",
      ],
      [
        "Если увеличить длину в 4 раза, период вырастет в 2 раза.",
        "На Луне (g мало) маятник качается медленнее, на Юпитере — быстрее.",
        "При амплитуде больше 60° измеренный период заметно длиннее, чем по формуле.",
      ],
      [
        "Make the length 4 times larger and the period doubles.",
        "On the Moon (small g) the pendulum swings more slowly, on Jupiter faster.",
        "For amplitudes above 60° the measured period is noticeably longer than the formula says.",
      ],
    ),
  },
  {
    slug: "nyuton-orbita",
    branch: "astronomiya",
    scientist: "nyuton",
    title: l("Nyuton: orbita", "Ньютон: орбита", "Newton: orbits"),
    lead: l(
      "Sayyorani boshlang‘ich tezlik bilan uloqtiring: orbita aylana, ellips yoki ochiq egri chiziq bo‘lishini ko‘ring.",
      "Запустите планету с начальной скоростью: посмотрите, будет орбита окружностью, эллипсом или открытой кривой.",
      "Launch a planet with an initial speed: see whether the orbit is a circle, an ellipse or an open curve.",
    ),
    formula: l(
      ["F = G · m₁ · m₂ / r²", "v_aylana = √(GM / r)", "v_qochish = √2 · v_aylana"],
      ["F = G · m₁ · m₂ / r²", "v_кр = √(GM / r)", "v_ух = √2 · v_кр"],
      ["F = G · m₁ · m₂ / r²", "v_circ = √(GM / r)", "v_esc = √2 · v_circ"],
    ),
    law: l(
      "Ikki jism bir-birini massalar ko‘paytmasiga to‘g‘ri, orasidagi masofa kvadratiga teskari proporsional kuch bilan tortadi. Boshlang‘ich tezlikka qarab traektoriya aylana, ellips yoki ochiq egri chiziq bo‘ladi.",
      "Два тела притягиваются с силой, пропорциональной произведению масс и обратно пропорциональной квадрату расстояния. В зависимости от начальной скорости траектория — окружность, эллипс или открытая кривая.",
      "Two bodies attract each other with a force proportional to the product of their masses and inversely proportional to the square of the distance. Depending on the initial speed the path is a circle, an ellipse or an open curve.",
    ),
    history: l(
      "Nyuton tog‘ cho‘qqisidan gorizontal otilgan to‘p tezlik oshgan sari uzoqroqqa tushishini, yetarli tezlikda esa Yerni aylanib chiqishini tasavvur qilgan. Shu tarzda olmaning tushishi va Oyning harakati bitta qonun ekanini ko‘rsatgan.",
      "Ньютон представлял пушку на вершине горы: чем больше скорость ядра, тем дальше оно падает, а при достаточной скорости облетает Землю. Так он показал, что падение яблока и движение Луны подчиняются одному закону.",
      "Newton imagined a cannon on a mountain top: the faster the ball is fired, the farther it lands, and at sufficient speed it circles the Earth. This showed that a falling apple and the motion of the Moon obey one law.",
    ),
    observe: l(
      [
        "Tezlik 1,00 ga teng bo‘lsa, orbita aylana bo‘ladi.",
        "1,00 dan kichik tezlikda sayyora Quyoshga yaqinlashadi, kattaroq tezlikda uzoqlashib ellips chizadi.",
        "Tezlik √2 ≈ 1,41 dan oshsa, sayyora Quyoshdan butunlay ketadi.",
      ],
      [
        "При скорости 1,00 орбита — окружность.",
        "При меньшей скорости планета приближается к Солнцу, при большей — уходит дальше и описывает эллипс.",
        "Если скорость выше √2 ≈ 1,41, планета навсегда покидает Солнце.",
      ],
      [
        "At speed 1.00 the orbit is a circle.",
        "At a lower speed the planet falls toward the Sun; at a higher one it swings farther out along an ellipse.",
        "Above √2 ≈ 1.41 the planet leaves the Sun for good.",
      ],
    ),
  },
  {
    slug: "faradey-induksiya",
    branch: "elektr",
    scientist: "faradey",
    title: l("Faradey: induksiya", "Фарадей: индукция", "Faraday: induction"),
    lead: l(
      "Magnitni g‘altak ichiga kiritib-chiqaring. Strelka faqat magnit harakatlanganda og‘adi.",
      "Вводите магнит в катушку и выводите. Стрелка отклоняется, только когда магнит движется.",
      "Move the magnet into and out of the coil. The needle moves only while the magnet is moving.",
    ),
    formula: l(["ε = −N · dΦ / dt"], ["ε = −N · dΦ / dt"], ["ε = −N · dΦ / dt"]),
    law: l(
      "Konturdan o‘tuvchi magnit oqimi o‘zgarganda unda elektr yurituvchi kuch paydo bo‘ladi. Oqim tezroq o‘zgarsa va o‘ramlar ko‘p bo‘lsa, kuchlanish katta bo‘ladi.",
      "Когда магнитный поток через контур меняется, в нём возникает ЭДС. Чем быстрее меняется поток и чем больше витков, тем больше напряжение.",
      "When the magnetic flux through a loop changes, an emf appears in it. The faster the flux changes and the more turns there are, the larger the voltage.",
    ),
    history: l(
      "1831-yilda Faradey avval temir halqaga o‘ralgan ikki g‘altak bilan, so‘ngra magnitni g‘altak ichiga kiritib-chiqarib tajriba qildi. Galvanometr strelkasi faqat magnit harakatlanayotganda og‘ardi. Shu kashfiyot elektr generatorlariga yo‘l ochdi.",
      "В 1831 году Фарадей экспериментировал сначала с двумя катушками на железном кольце, затем с магнитом, вводимым в катушку. Стрелка гальванометра отклонялась только пока магнит двигался. Это открытие проложило путь электрическим генераторам.",
      "In 1831 Faraday experimented first with two coils on an iron ring, then with a magnet moved into a coil. The galvanometer needle deflected only while the magnet moved. This discovery paved the way for electric generators.",
    ),
    observe: l(
      [
        "Magnit turg‘un bo‘lsa, strelka qimirlamaydi.",
        "Magnitni tezroq harakatlantirsangiz, strelka ko‘proq og‘adi.",
        "Harakat yo‘nalishi yoki qutbni almashtirsangiz, tok yo‘nalishi o‘zgaradi.",
      ],
      [
        "Пока магнит неподвижен, стрелка стоит на месте.",
        "Чем быстрее движется магнит, тем сильнее отклонение.",
        "Смена направления движения или полюса меняет направление тока.",
      ],
      [
        "While the magnet is still, the needle stays put.",
        "The faster the magnet moves, the larger the deflection.",
        "Reversing the motion or the pole reverses the current.",
      ],
    ),
  },
  {
    slug: "yorugliq-sinishi",
    branch: "optika",
    scientist: "ibn-al-haysam",
    title: l("Yorug‘likning sinishi", "Преломление света", "Refraction of light"),
    lead: l(
      "Nurning tushish burchagini va muhitlarni o‘zgartiring: sinish va to‘liq ichki qaytishni kuzating.",
      "Меняйте угол падения и среды: наблюдайте преломление и полное внутреннее отражение.",
      "Change the angle of incidence and the media: watch refraction and total internal reflection.",
    ),
    formula: l(
      ["n₁ · sin θ₁ = n₂ · sin θ₂", "sin θ_kr = n₂ / n₁   (n₁ > n₂)"],
      ["n₁ · sin θ₁ = n₂ · sin θ₂", "sin θ_пр = n₂ / n₁   (n₁ > n₂)"],
      ["n₁ · sin θ₁ = n₂ · sin θ₂", "sin θ_c = n₂ / n₁   (n₁ > n₂)"],
    ),
    law: l(
      "Yorug‘lik ikki muhit chegarasida sinadi: tushish va sinish burchaklari sinuslari nisbati sindirish ko‘rsatkichlari nisbatiga teng. Zich muhitdan siyrak muhitga o‘tganda kritik burchakdan katta burchaklarda nur to‘liq qaytadi.",
      "На границе двух сред свет преломляется: отношение синусов углов падения и преломления равно отношению показателей преломления. При переходе из более плотной среды в менее плотную при углах больше предельного свет полностью отражается.",
      "At the boundary of two media light is refracted: the ratio of the sines of the angles of incidence and refraction equals the ratio of the refractive indices. Going from a denser to a less dense medium, light is totally reflected at angles above the critical angle.",
    ),
    history: l(
      "Sinish qonunini 984-yilda Ibn Sahl, 1621-yilda Villebrord Snell qayta kashf etdi; hozirgi shaklini Dekart e’lon qildi. Ibn al-Haysam esa sinishni tajribada o‘rgangan va yorug‘lik tadqiqotini tajriba asosiga qo‘ygan.",
      "Закон преломления описал Ибн Сахль в 984 году, заново открыл Виллеброрд Снелль в 1621 году, а современную форму опубликовал Декарт. Ибн аль-Хайсам изучал преломление опытным путём и поставил исследование света на экспериментальную основу.",
      "The law of refraction was described by Ibn Sahl in 984, rediscovered by Willebrord Snell in 1621, and published in its modern form by Descartes. Ibn al-Haytham studied refraction experimentally and put the study of light on an experimental footing.",
    ),
    observe: l(
      [
        "Havodan suvga o‘tganda nur normalga yaqinlashadi.",
        "Suvdan havoga o‘tishda burchakni oshiring: kritik burchakdan keyin nur chegaradan chiqmaydi — to‘liq ichki qaytish.",
        "Olmosning sindirish ko‘rsatkichi katta, kritik burchagi kichik — shuning uchun u yarqiraydi.",
      ],
      [
        "При переходе из воздуха в воду луч приближается к нормали.",
        "Из воды в воздух увеличивайте угол: после предельного угла луч не выходит наружу — полное внутреннее отражение.",
        "У алмаза показатель преломления велик, а предельный угол мал — поэтому он так сверкает.",
      ],
      [
        "Going from air into water the ray bends toward the normal.",
        "From water into air raise the angle: past the critical angle the ray no longer leaves — total internal reflection.",
        "Diamond has a high refractive index and a small critical angle — that is why it sparkles.",
      ],
    ),
  },
];

export const EXPERIMENT_BY_SLUG = Object.fromEntries(EXPERIMENTS.map((e) => [e.slug, e])) as Record<string, (typeof EXPERIMENTS)[number]>;
