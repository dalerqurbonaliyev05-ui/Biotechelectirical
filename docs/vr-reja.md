# VR montaj laboratoriyasi — to‘liq reja (2.1-versiya)

Tegishli hujjatlar: [`vr-audit.md`](./vr-audit.md) · [`vr-pult-spec.md`](./vr-pult-spec.md) · [`vr-unumdorlik-byudjeti.md`](./vr-unumdorlik-byudjeti.md).
Qaror o‘zgarsa, tegishli hujjatlar birga yangilanadi.

Konsepsiya: talaba telefonini VR quti (Shinecon turi) ichiga qo‘yadi, ikkita o‘zimiz yasagan pult bilan 3D xonada yuradi, shitni va simlarni ulaydi, tok beradi, tizim natijani tekshiradi. Birinchi xona: yoritish-01 (energyvibe.uz/laboratoriya/yoritish-01). Android va iPhone ikkalasida ishlashi shart.

## Hozirgi holat

- Tayyor: 0-bosqich auditi (`docs/vr-audit.md`); pult spetsifikatsiyasi (`docs/vr-pult-spec.md`, 3-versiya); unumdorlik o‘lchovi (`docs/vr-unumdorlik-byudjeti.md`).
- Bajarilmagan: unumdorlik tuzatishlari kodga o‘tkazilmagan (faqat o‘lchov va hujjat).
- Audit natijasi: engine allaqachon ajratilgan (87 sinov o‘tadi). Eng katta xavf: unumdorlik, kiritish ko‘rinishga yopishgan, klemma radiusi 9–13 mm.
- O‘lchov (yoritish-01, lampa yongan lahza, bir ko‘z): hozir 1266 draw call va 243 528 uchburchak. Barcha soyalar o‘chirilsa 433 / 77 708. Soyalar, tok nuqtalari, ko‘rinmas "hit" meshlar va klemma markerlari tozalansa 291 / 44 948. Stereo (ikki ko‘z) bo‘lganda hozir ≈2530, tozalangandan keyin ≈580 draw call. Draw call va uchburchak sonlari ishonchli, FPS ishonchsiz: haqiqiy tezlik faqat telefonda ma’lum bo‘ladi.

## Arxitektura qoidasi

Uch qatlam: **Engine** (sxema JSON, tekshirish, simulyatsiya, ball), **View** (2D, 3D, VR), **Input** (sichqoncha, touch, klaviatura-pult, gamepad, nazar). Engine ko‘rinishni bilmaydi. VR mavjud mashqning uchinchi ko‘rinishi.

## Ikki yo‘nalish (parallel)

**D — Dastur (sayt, Claude Code)** va **H — Pult (elektronika, ESP32)**. H yo‘nalishi D ni kutmaydi: pult-testi sahifasi tayyor bo‘lishi bilan prototip sinaladi.

| Dastur | Pult (H) |
|---|---|
| 1A, 1B | — |
| 2 (InputManager, pult-testi) | H1: bitta ESP32 + joystick + 3 tugma prototipi |
| 3 | H2: prototipni Android va iPhone‘da sinash (klaviatura, 2 pult, ESP-NOW zaxira) |
| 4, 5 | H3: ikkita pult yig‘ish (jumper L/R, korpus, batareya, tasma) |
| 6 (MVP) | H4: firmware v1 (klaviatura rejimi), H5: sinfda sinash |
| 7 | H5 davomi, ishonchlilik |
| 8, 9 | H6: gamepad rejimi (Android), yangi tugma vazifalari |

## Sinov tartibi (Claude noutbukdagi Chrome‘dan foydalanadi)

Maqsad: kodni har bosqichda tez tekshirish va telefon tajribasiga imkon qadar yaqin ko‘rish. Foydalanuvchi noutbukidagi Chrome‘ga Claude in Chrome kengaytmasi ulangan (2026-11-28 holatida ulanish tekshirilgan: Windows, "Browser 1"). Claude bu orqali ishlaydi, lekin faqat foydalanuvchi sayt uchun ruxsat bergandan keyin.

### 1-daraja — Claude Code, avtomatik (har commitda)
- 87 ta mavjud sinov + yangi birlik sinovlar (InputManager, joystick ushlab turish/birga bosish mantig‘i, sensor aniqlash).
- Playwright, mobil emulyatsiya (telefon ekrani, touch, landscape), CPU sekinlashtirish. Sensor hodisalari (`deviceorientation`) skript bilan beriladi.
- Tekshiradi: xatolar yo‘qligi, draw call va uchburchak soni (`?debug=1`), yurish va to‘qnashuv mantig‘i.

### 2-daraja — noutbuk Chrome, Claude in Chrome orqali (Vercel preview)
Qanday ishlaydi:
1. Claude yangi tab ochadi (foydalanuvchining ochiq tablariga tegmaydi), Vercel preview manzilini ochadi: `?debug=1&quality=past`.
2. Oyna telefon landscape o‘lchamiga keltiriladi (masalan 844×390 va 667×375) — VR split-screen shu o‘lchamda ko‘rinadi.
3. Pult o‘rniga klaviatura: chap pult WASD, o‘ng pult IJKL (taklif jadvali). Claude tugmalarni bosadi va ekranda natijani ko‘radi.
4. Giroskop o‘rniga: sahifa ichida sinov uchun `deviceorientation` hodisasini JS bilan yuborish (yoki sichqoncha bilan "boshni burish" test rejimi). Bu real giroskop emas, faqat mantiqni tekshiradi.
5. Claude skrinshot yoki GIF oladi, konsol xatolarini o‘qiydi, FPS/draw call ko‘rsatkichini yozadi, topilganlarni Claude Code‘ga xulosa qilib beradi.
6. Ish tugagach, ochilgan tablarni yopadi.

Qoidalar: JS `alert/confirm` dialoglari chaqirilmaydi; 2–3 urinishdan keyin ishlamasa to‘xtab foydalanuvchidan so‘raydi; pult-testi sahifasi bilan bir xil, ya’ni haqiqiy pult ulanganda ham shu sahifa tekshiradi.

### 3-daraja — haqiqiy telefon va VR quti (foydalanuvchi, har bosqich oxirida)
- Foydalanuvchining telefoni, eng arzon Android, bitta iPhone. Preview havolasi + `?debug=1`.
- Faqat shu yerda ishonchli bilinadi: haqiqiy FPS, giroskop sezgisi, linza va ko‘z oralig‘i, ko‘z charchashi va ko‘ngil aynishi, Bluetooth pult, iPhone Safari‘ning o‘ziga xos xatti-harakatlari (to‘liq ekran, sensor ruxsati).

### Noutbuk sinovining chegaralari (halol)
- Noutbuk GPU‘si telefondan ancha kuchli: noutbukda silliq ko‘ringani telefonda silliq degani emas. Unumdorlik uchun faqat draw call/uchburchak soni hisobga olinadi, FPS emas.
- DevTools‘dagi CPU sekinlashtirish va Sensors panelini Claude boshqara olmaydi: bu 1-darajada (Playwright) qilinadi.
- Chrome iPhone Safari (WebKit) o‘rnini bosmaydi.
- Haqiqiy Bluetooth pult, giroskop, linza, qulaylik faqat 3-darajada.
- "Telefonni his qilish" noutbukda faqat taxminiy: ekran o‘lchami, touch, klaviatura-pult va sensor mantig‘i tekshiriladi, jismoniy tajriba tekshirilmaydi.

### Qaysi bosqichda qaysi daraja
| Bosqich | 1 | 2 | 3 |
|---|---|---|---|
| 1A unumdorlik | ha | draw call va ko‘rinish | FPS (telefonda `?debug=1&quality=past`) |
| 2 pult-testi | ha | klaviatura bilan | prototip pult, Android va iPhone |
| 3 yurish | ha | WASD/IJKL yurish | virtual joystick, FPS |
| 4 VR rejimi | ha | split-screen ko‘rinishi, sensor mantig‘i | giroskop, iPhone ruxsati, linza |
| 5–6 o‘zaro ta‘sir, MVP | ha | butun mashqni klaviaturada o‘tish | butun mashq VR qutida |
| 7 sayqal | ha | regressiya | arzon Android, iPhone, sinf |

## Bosqichlar (dastur)

### 0 — Audit. TAYYOR
Natija: `docs/vr-audit.md`.

### 1A — Unumdorlik tuzatishlari
Maqsad: sahnani telefon uchun yengillashtirish, vizual o‘zgarishsiz kompyuter rejimida.
Qilinadi:
- Sifat darajalari: past (VR, yurish, telefon), o‘rta, yuqori (kompyuter 3D, hozirgidek). Daraja `?quality=` va qurilma imkoniyatiga bog‘liq, ekran kengligiga emas.
- Yongan lampaning kub soyasi "past" darajada o‘chadi, o‘rniga yorug‘lik nuri/glow effekti.
- Ko‘rinmas "hit" meshlar, ortiqcha tok nuqtalari va klemma markerlari tozalanadi (funksiyasini saqlab: nishonga olish uchun kerak joylar qoladi).
- Statik meshlar birlashtiriladi (merge/instancing).
- pixelRatio pog‘onalari 1 / 1.5 / 2 (past daraja 1 linza orqali donador ko‘rinishi mumkin).
- `?debug=1`: ekranda FPS, draw call, uchburchak soni.
Tayyor mezoni: tozalangan sahnada ≤ 300 draw call (bir ko‘z), 87 sinov o‘tadi, kompyuter 3D ko‘rinishi o‘zgarmagan. Telefonda FPS o‘lchanadi.

### 1B — Engine tozalash
- `state.js` dagi localStorage va `Date.now()` ajratiladi.
- HUD matnlari `mashq.js` dan chiqariladi.
- `emit('xabar')` ga matn bilan birga kalit qo‘shiladi.
- Sxema JSON ga `"vr"` rejimi qo‘shiladi (faqat qo‘shimcha, alohida commit, sinovlar o‘tadi; foydalanuvchi tasdiqlagan).
Tayyor mezoni: 2D/3D avvalgidek ishlaydi, testlar o‘tadi.

### 2 — Input qatlami va pult-testi
- `InputManager`: mantiqiy nomlar qo‘l bo‘yicha (`chap.A`, `o‘ng.joystick`), profil (muallif/standart), chap-o‘ng almashtirish.
- Raqamli joystick: bosilib turgan tugmalar holati, ~300 ms ushlab turish, ~150 ms birga bosish aniqlanishi.
- Klaviatura jadvali: `KeyboardEvent.code` (til tartibiga bog‘liq emas). Taklif: chap pult WASD, o‘ng pult IJKL. Band tugmalar (Esc, Delete, Backspace, Ctrl+Z/Y, F) ishlatilmaydi; strelkalarda `preventDefault`; iPhone‘da kanvas fokusi.
- Sensor aniqlash: birinchi hodisada `alpha/beta/gamma` null bo‘lsa (≈1 soniya) sensor yo‘q.
- `/laboratoriya/pult-testi` sahifasi (Vercel `vercel.json` da alohida yozuv, `simulyator` kabi): qaysi pult va tugma, bosilib turganlar, sensor holati (bor / faqat kompas / yo‘q), Gamepad API ro‘yxati, ikki pult bir vaqtda, iPhone‘da to‘liq ekran/PWA holati.
- Sinov uchun: sahifa va VR rejimida `deviceorientation` hodisasini qo‘lda yuboradigan yashirin test rejimi (`?sensortest=1`), noutbuk Chrome‘da sinash uchun.
Tayyor mezoni: sahifa Android va iPhone‘da ishlaydi, prototip pult tugmalari to‘g‘ri ko‘rinadi.

### 3 — Yurish mumkin 3D xona (VR‘siz)
- Kamera rig‘ini OrbitControls dan ajratish.
- "Nur bo‘yicha tanlash" (raycast ekran markazidan, sichqoncha koordinatasiga emas).
- Birinchi shaxs yurish, to‘qnashuv (devor, shit), kamera balandligi.
- Telefonda virtual joystick (pultsiz sinash uchun).
Tayyor mezoni: telefon brauzerida xonada yurib, shitga yaqinlashish mumkin; "past" sifat darajasida FPS qabul qilarli.

### 4 — VR rejimi
- "VR ga kirish" tugmasi (iPhone‘da giroskop ruxsati shu tugmada so‘raladi).
- Split-screen stereo, giroskop bilan qarash, uch sensor holati (bor / faqat kompas: silliqlash / yo‘q: pult bilan qarash).
- Menyuni uzoq bosish bilan qayta markazlash.
- To‘liq ekran (iPhone‘da ishonchsiz: ekransiz ham ishlaydi, "Bosh ekranga qo‘shish" varianti), ekran o‘chmasligi, ko‘z oralig‘i va linza buzilishi sozlamasi.
Tayyor mezoni: telefon VR qutida, xona hajmli ko‘rinadi, boshni burganda dunyo barqaror.

### 5 — VR da o‘zaro ta‘sir
- Nazar nuqtasi, element yoritilishi, terminalni tanlash.
- Klemma radiusi 9–13 mm: nazar bilan tegish qiyin, shuning uchun yaqinlashganda yopishish (snap) mexanikasi.
- Sim tortish, ulash, bekor qilish. Sim — egri chiziq.
- Dunyo ichidagi (world-space) panel: topshiriq, taymer, ball, xatolar.
- Maslahat C: 1-bosish yo‘nalish, 2-bosish aniq terminallar, 3-bosish to‘g‘ri javob (ball kamayadi).
- Menyu: Topshiriq, Tekshirish, Qaytadan boshlash, Til, Sozlamalar, Chiqish.
Tayyor mezoni: VR da bitta sim ulab, bekor qilib, qayta ulash mumkin; hammasi pult bilan.

### 6 — MVP: yoritish-01 to‘liq VR da
- Qadamma-qadam topshiriq: faza, nol, lampa/vyklyuchatel, avtomat dastasiga A bilan "Tok berish".
- Xato oqibatini ko‘rsatish (qisqa tutashuv uchquni, lampa yonmasligi), yakuniy tekshirish, natija paneli.
- Pult MVP‘da: joystick, A, C, Menyu (B vazifasiz).
Tayyor mezoni: talaba boshdan oxirigacha VR da mashqni bajaradi, natija 2D/3D variant bilan bir xil. **MVP shu yerda tugaydi.**

### 7 — Sayqal va sinov
- Haqiqiy telefonlarda sinov: arzon Android, o‘rta Android, iPhone (ro‘yxat foydalanuvchidan).
- FPS, yuklash tezligi, tekstura siqish, PWA/oflayn, ovoz (tok urishi, avtomat shiqillashi).
- Xona ichida o‘rgatuvchi ko‘rsatma. O‘qituvchi uchun dars oldidan telefonlarni tekshirish (pult-testi).

### 8 — Kengaytirish 1: qo‘l ishi
- Ikki slot (chap/o‘ng) va HUD, asboblar (otvyortka, ambur), element olish/qo‘yish (avtomatni o‘rnatish).
- Uy buyumlari (B): sudrash, yengil buyumni ko‘tarish; og‘ir narsa (ikkala joystick bosish).
- Narvon va balandlik hissi: kamera sekin ko‘tariladi, tovush, chetlar qorayadi. Stol emas.

### 9 — Kengaytirish 2: kontent va tizim
- Yangi xonalar/sxemalar: motor + avtomat, UZO, potensiometr, rele, boshqa guruhlar.
- O‘qituvchi rejimi, kirish kodi, guruh natijalari, sertifikat, SmartEdu bilan bog‘lash.

### Bonus (alohida mahsulot) — Pepper‘s ghost piramida
Stol usti gologramma rejimi: auditoriyaga avtomat/shit modelini aylantirib ko‘rsatish. VR emas, ko‘zga taqilmaydi. Asosiy rejaga bog‘liq emas.

## Qabul qilingan qarorlar (qisqa)

Yurish: muallif profili standart. Narvon (stol emas), 8-bosqichda. Android va iPhone. Pult = tugmalar to‘plami (qo‘l yo‘q), ikki slot. Chap/o‘ng: jumper bilan fizik farqlanadigan tugma to‘plami. Joystick: ushlab turish = ko‘rish rejimi, ikkalasi birga = og‘ir narsa. MVP: joystick, A, C, Menyu. Firmware alohida repoda. JSON ga `"vr"` qo‘shish tasdiqlangan. Sinov: uch daraja (Claude Code avtomatik → noutbuk Chrome‘da Claude in Chrome → haqiqiy telefon va VR quti); noutbukdagi sinov telefonni to‘liq almashtirmaydi.

## Ochiq masalalar

1. Soyalar: kompyuter 3D rejimida saqlanadi (tavsiya), tuzatishlar past darajaga bog‘lanadi.
2. Sinov uchun telefon modellari ro‘yxati.
3. Klaviatura tugma jadvali (WASD/IJKL) — taklif, firmware bilan kelishilguncha o‘zgarishi mumkin. `code` ba‘zi Android virtual klaviaturalarida bo‘sh kelishi mumkin: prototipda tekshiriladi, kerak bo‘lsa `key` ga o‘tiladi.
4. iPhone‘da ikkita Bluetooth klaviatura va to‘liq ekran/PWA — prototipda tekshiriladi.
5. Stereo ≈580 draw call (tozalangandan keyin) arzon telefonlar uchun yetarlimi — haqiqiy FPS 4-bosqichda ma‘lum bo‘ladi; yetmasa qo‘shimcha birlashtirish.
6. Vercel preview havolasi parol/himoya ostida bo‘lsa, Claude in Chrome ochishi uchun foydalanuvchi kirgan bo‘lishi kerak (yoki himoyani o‘chirish): birinchi preview chiqqanda tekshiriladi.

---

## Qo‘shimcha: kod audit natijasida taklif qilingan aniqlashtirishlar (tasdiqlanmagan)

Bu bo‘lim rejaning asosiy matniga kirmaydi; qaror qabul qilinguncha taklif sifatida turadi.

1. **`"vr"` ni qachon qo‘shish.** `katalog.js` har bir kartochkada `rejimlar` dagi barcha qiymatni belgi sifatida chiqaradi va filtr ro‘yxati (`REJIMLAR = ['2d','3d']`) qo‘lda yozilgan. 1B da `"vr"` qo‘shilsa, VR tayyor bo‘lmasdan kartochkada "VR" belgisi paydo bo‘ladi. Taklif: qo‘shishni 4-bosqichga ko‘chirish.
2. **VR da sim rangini tanlash.** `checker.js` ning `sim_rangi` qoidasi rangni baholaydi, shuning uchun avtomatik rang qo‘yib bo‘lmaydi. MVP pultida B yo‘q. Variantlar: Menyu ichida «Sim rangi», yoki birinchi terminal tanlangach joystick yuqori/past bilan rang almashtirish. 5-bosqichgacha hal qilinadi.
3. **Sinov 2-darajasi.** Claude in Chrome noutbuk bilan ishlaydigan lokal sessiyada ishlaydi; bulutdagi sessiya noutbuk Chrome‘iga ulana olmaydi. Bulutda 1-daraja (lokal server + Playwright) ishlaydi.
4. **1B ga qo‘shimcha.** Soatni `Lab` ichiga ko‘chirish (`lab.tick(dt)`), `mashq.js` dagi `setInterval` o‘rniga (audit, 5-bo‘lim, 4-punkt).
