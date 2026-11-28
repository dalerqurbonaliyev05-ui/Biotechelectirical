# VR / 3D montaj laboratoriyasi — Bosqich 0: audit

Maqsad: `/laboratoriya/yoritish-01` mashqini telefon + VR ko‘zoynak (split-screen stereo) va Bluetooth pult bilan
o‘ynaladigan qilish uchun mavjud kodni o‘rganish. **Bu bosqichda kod o‘zgartirilmagan**, faqat shu hujjat yozilgan.
Tekshirilgan holat: branch `claude/inspiring-lovelace-pgp203`, commit `917715f`. `node --test tests/laboratoriya/*.test.mjs` — 87 ta sinov, hammasi o‘tadi.

**Tegishli hujjatlar:** [`vr-pult-spec.md`](./vr-pult-spec.md) — ikki qo‘lli pult spetsifikatsiyasi (sayt ↔ firmware kelishuvi, tugma jadvali); [`vr-unumdorlik-byudjeti.md`](./vr-unumdorlik-byudjeti.md) — 6-bo‘lim asosidagi unumdorlik byudjeti. Qaror o‘zgarsa, tegishli hujjatlar birga yangilanadi.

## 0. Xulosa

1. **Engine allaqachon ajratilgan.** Sxema = JSON; tekshirish (`checker.js`) va simulyatsiya (`simulator.js`) — DOM'siz sof funksiyalar, Node'da sinovdan o‘tadi.
   2D va 3D **bitta** holat obyektini (`Lab`, `state.js`) ishlatadi, mantiq ikki marta yozilmagan. Reja bo‘yicha 1-bosqich asosan *qayta yozish emas, tozalash* bo‘ladi (5-bo‘lim).
2. **Eng katta xavf — unumdorlik.** `yoritish-01` bitta kadrda ≈ 810 draw call / 139 ming uchburchak (lampa yonganda **1266 / 244 ming**). Split-screen bunga ×2 qo‘shadi. Asosiy sabab — soyalar (2 yo‘nalishli yorug‘lik + yongan lampaning kub soyasi). 6-bo‘limga qarang.
3. **Kiritish (input) ko‘rinishga yopishgan.** Raycast va hodisalar `View3D.hodisalar()` ichida, kamera — `OrbitControls`. VR/pult uchun «nur bo‘yicha tanlash» va «kamera rig»ni ajratish kerak.
4. **Panel/HUD DOM'da** (`mashq.js`): topshiriq, taymer, ball, xatolar matni. VR'da DOM ko‘rinmaydi — shu mantiq `view-model`ga chiqarilib, sahnadagi panelga ham berilishi kerak.
5. **Rejada yo‘q, lekin kerak bo‘ladigan narsalar** topildi (7-bo‘lim): «elementni o‘rnatish» mexanikasi yo‘q, `/laboratoriya/pult-testi` manzili mavjud rewrite bilan to‘qnashadi, branch nomi CLAUDE.md bilan mos emas.

## 1. Fayllar xaritasi

URL `/laboratoriya/yoritish-01` → `vercel.json` rewrite (`/laboratoriya/:id` → `mashq.html`).

| Fayl | Vazifasi | Qatlam |
|---|---|---|
| `laboratoriya/mashq.html` | Sahifa skeleti: asboblar paneli, yon panel (topshiriq/natija/maslahat/holat), pastki panel (sim rangi, element chiplari), dialoglar. importmap: `three` → `vendor/three/…` | View (DOM) |
| `laboratoriya/mashq.js` (265 q.) | Sxema JSON'ni `fetch` qiladi, `Lab`, `View2D`, `View3D`ni yaratadi; tugmalar, klaviatura, panel matnlari, 2D/3D almashtirish, `?embed=iyuu` + `postMessage` | Yopishtiruvchi + UI |
| `laboratoriya/schemes/yoritish-01.json`, `royxat.json` | Sxema ta’rifi (21 ta sxema, `royxat.json` da id) | **Engine ma’lumoti** |
| `engine/state.js` (339 q.) | `Lab` klassi: simlar, element holati, tanlov, ball/xato/maslahat, qaytarish/takrorlash, qoralama (localStorage), hodisalar (`on/emit`) | **Engine** (yarim) |
| `engine/simulator.js` (400 q.) | Union-find tarmoq, manbalar (A/B/C/N/PE), qisqa tutashuv, tugunlar usuli (fazor), holatli elementlar sikli, tok oqimi yo‘li | **Engine** (sof) |
| `engine/checker.js` (331 q.) | `tekshir(sxema, simlar)` → `{togri, xatolar[]}`, `QOIDALAR` reestri, `togriSimlar()` («to‘g‘ri javob»), `ssenariyIshla()` | **Engine** (sof) |
| `engine/elements/*.js` (13 fayl) | Element turlari: klemmalar, `ichki`, `yuklamalar`, `hisobla` + `svg()` (2D) + `model3d(c)` (3D, THREE `ctx` orqali beriladi) | Engine + view aralash |
| `engine/view2d.js` (347 q.) | SVG ish maydoni, pointer hodisalari, sim yo‘li | View 2D |
| `engine/view3d.js` (1072 q.) | three.js sahna, xona, soyalar, simlar (Tube), tok oqimi nuqtalari, uchqun, raycast, `OrbitControls` | View 3D |
| `engine/view3d-avto.js` (343 q.) | `sahna3d`siz sxemalar uchun avto-joylash va umumiy modellar (shit/devor/shift/pol) | View 3D |
| `engine/i18n.js`, `ranglar.js`, `sahifa.js` | uz/ru/en matnlar (`energyvibe-lang`), sim ranglari/rollari, til almashtirgich | Umumiy |
| `vendor/three/` | three.js **0.160.0** + `OrbitControls`, `RoomEnvironment` (712 KB) | Kutubxona |
| `tests/laboratoriya/*.test.mjs` | `checker`, `xatolar`, `sxemalar` (har bir sxemaning to‘g‘ri javobi) | Sinov |
| `laboratoriya/docs/sxema-qoshish.md` | Sxema JSON formati qo‘llanmasi | Hujjat |

## 2. 3D kutubxona va sahnani kim quradi

- **three.js 0.160.0**, loyiha ichida (`laboratoriya/vendor/three/`), importmap bilan; bundler yo‘q. `three.module.min.js` — 655 KB (gzip ≈ 167 KB).
  WebXR/`StereoEffect` addon'lari **ichida yo‘q** — kerak bo‘lsa vendor'ga qo‘shiladi (VR uchun reja bo‘yicha o‘zimiz yozamiz).
- Sahnani **`View3D`** quradi (`view3d.js`), faqat 3D tugmasi bosilganda dinamik `import()` bilan yuklanadi (`mashq.js:159`).
  Konstruktor tartibi: renderer → kamera + `OrbitControls` → `xonaQur()` (devor/shift/pol/oyna/eshik/radiator, 314-q.) → `bezaklarQur()` (shit korpusi, DIN-reyka, 522-q.)
  → `elementlarQur()` (har element `model3d(c)` + klemma «hit» sharlari, 605-q.) → `RoomEnvironment` (PMREM) → `soyalarniSozla()` → `simlarQur()` (har sim = `TubeGeometry` + ko‘rinmas yo‘g‘onroq «hit» trubka, 787-q.).
- Hodisalar bo‘yicha qayta qurish: `lab.on('ozgardi')` → sim o‘zgarsa `simlarQur()` (**hamma** simlar qaytadan quriladi), har safar `holatYangila()` (klemma ranglari, lampa nuri, tok nuqtalari).
- Sahna masshtabi: 1 birlik = 1 m. Xona 4.6 × 2.7 × 4.2 m, elementlar `masshtab: 1.3` bilan kattalashtirilgan (o‘qilishi uchun), shit 0.44 × 0.48 m. Klemma «hit» radiusi 9–13 mm.
- Sxema `sahna3d` bersa (faqat `yoritish-01`) — qo‘lda sozlangan xona; bermasa — `avtoJoylash()` (qolgan 20 sxema).

## 3. Ma’lumotlar qayerda va qanday shaklda

**Sxema JSON** (`schemes/yoritish-01.json`) — faqat ta’rif, holat emas:

| Kalit | Mazmuni |
|---|---|
| `elementlar[]` | `{id, tur, parametr?, pozitsiya2d:[x,y], pozitsiya3d:[x,y,z]}` — `VVOD`, `Q1` (1P avtomat 10 A), `X1` (taqsimlash qutisi 4×3 port), `SA1` (kalit), `HL1` (lampa 60 W) |
| **Terminallar** | JSON'da **yo‘q**; tur faylida (`elements/<tur>.js` → `klemmalar(param)`): `{id, yorliq, nomi{uz,ru,en}, xy, dir2d, maks, r3d?}`. Manzil formati: `"Q1.in"`, `"HL1.markaz"`, `"X1.C2"` |
| **Ulanishlar** (talaba chizadi) | `Lab.simlar = [{id, a:"Q1.out", b:"X1.C1", rang:"jigarrang"}]` — faqat xotirada; qoralama `localStorage['energyvibe-lab-qoralama-<id>']` |
| **To‘g‘ri javob** | `togri_ulanishlar[]`: `{nuqtalar:[…], orqali?:"X1", rang}` (5 guruh = 5 ta sim bosqichi). Aniq simlar emas, **potensial guruhlar**: qutidagi blok tartibi ahamiyatsiz |
| **Maqsad** | `maqsad[]`: `{holat:{SA1:{yoqilgan:true}}, kutilgan:{HL1:"yonadi"}}` — kalit ON → yonadi, OFF → o‘chadi |
| **Xato qoidalari** | `xato_qoidalari[]`: `ochiq_zanjir`, `avtomat_himoyasi`, `kalit_fazada`, `faza_markazga`, `pe_ulangan`, `sim_rangi`, `quti_orqali`. Reestr: `checker.js` `QOIDALAR`; yangi qoida = bitta funksiya |
| **Maslahat / matn** | `maslahatlar{uz,ru,en}[]` (5 ta, ketma-ket ochiladi), `topshiriq`, `nomi` |
| **Ko‘rinish** | `rejimlar`, `korinish2d`, `sahna3d{xona,masshtab,kamera,bezaklar}` — **faqat view uchun** |

**Tekshirish** — `tekshir(sxema, simlar)`: (1) qisqa tutashuv → darhol qaytadi; (2) `maqsad` ssenariylari; (3) `QOIDALAR`; (4) hammasi o‘tsa — topologiya (potensial guruhlar) solishtiriladi.
Natija `{togri, xatolar:[{tur, daraja, kalit(i18n), p, klemmalar?, simlar?}]}` — **matn emas, kalit + parametr** (View tarjima qiladi). VR HUD uchun aynan shu kerak.

**Simulyatsiya** — `simulyatsiya(els, simlar, holatlar, {vaqt})`: union-find tarmoqlar → manbalar → qisqa tutashuv (eng kichik nominalli himoya o‘chadi, topilmasa `chetlab`) → tugunlar usuli (230 V fazor) → holatli elementlar sikli (≤40 iteratsiya).
Natija: `natija[id].holatlar` (`yonadi`/`ochgan`/`kuydi`…), `qisqa`, `ochirilsin[]`, `oqim[]` (tok animatsiyasi), `fazaBor(k)/nolBor(k)`. «Tok berish» = `Lab.quvvatAlmashtir()` (barcha `himoya` elementlarni yoqadi).

**Ball/vaqt/xato** — `Lab.ball` + `JARIMA = {maslahat:10, javob:50, xato:5}` (`state.js:10`), ball = `100 − …`. Vaqt — `Date.now()`; natija `localStorage['energyvibe-lab-natijalar']` (faqat shu brauzerda).

## 4. 2D va 3D mantiqni bo‘lishadimi?

**Bo‘lishadi** — bitta `Lab` nusxasi ikkalasiga beriladi (`new View2D(root, lab)`, `new View3D(root, lab)`):
- Ikkalasi `lab.klemmaBosish / simBosish / elementBosish` chaqiradi; `lab.on('ozgardi')` bilan qayta chizadi. Sim ulash, tekshirish, ball — nusxasi yo‘q.
- Sim rangi, tanlangan klemma, belgilangan xato simlar — hammasi `Lab` holatida (`tanlangan`, `belgilangan`, `rang`).

**Ikki marta yozilgan (faqat ko‘rinish):** har element uchun `svg()` (2D) va `model3d()` (3D); sim yo‘li (`View2D` to‘g‘ri burchakli, `View3D.egri` Catmull-Rom); pointer hodisalari (`view2d.js:221`, `view3d.js:905`); tok animatsiyasi va uchqun effekti.
Bu normal — ular ko‘rinish. Muammo faqat quyidagi «oqib chiqqan» mantiq:

| Joy | Nima oqib chiqqan |
|---|---|
| `mashq.js:46–119` | `parametr()`, xato matnlarini yig‘ish, «elementlar holati» ro‘yxati (`ON` holatlar jadvali), ball/vaqt matni — HUD mantig‘i DOM bilan aralash |
| `mashq.js:253–254` | Soat: `setInterval` → `lab.vaqtQadam(0.2)` (taymer/vaqt relesi simulyatsiya vaqti) — view'ga bog‘liq |
| `mashq.js:240–248` | Klaviatura (Esc, Delete, Ctrl+Z/Y, F) — kelajakdagi `InputManager` vazifasi |
| `state.js` | `emit('xabar', {matn: t(…)})` — tayyor tarjima qilingan matn, hodisa **turi** emas; `localStorage`, `Date.now()` to‘g‘ridan-to‘g‘ri |
| `view3d.js:872–955` | `tanla(e)` faqat `clientX/Y` qabul qiladi; nur (ray) bo‘yicha tanlash yo‘q |

Element fayllaridagi `model3d()` THREE'ni `ctx` orqali oladi (import qilmaydi), shuning uchun Node'da simulyator/checker import qilinadi — buni buzmaslik kerak.
`state.js` ham Node'da import bo‘ladi (tekshirildi) — demak `Lab`ni sinash mumkin.

## 5. Engine / view ajratish uchun minimal o‘zgarishlar

Reja bo‘yicha 1-bosqich kutilganidan yengil: JSON, sof checker/simulator va 87 sinov **tayyor**.

| # | O‘zgarish | Fayl | Bosqich | Hajmi |
|---|---|---|---|---|
| 1 | `Lab.emit('xabar')`ga `kalit` + `p` qo‘shish (`matn` qoladi — orqaga mos). Ovoz/HUD hodisa turini matndan emas, kalitdan oladi | `state.js` | 1 | kichik |
| 2 | `localStorage` va `Date.now()` ni inyeksiya qilinadigan `{storage, soat}` ga (default — hozirgisi). `Lab` uchun Node sinovlari | `state.js`, yangi test | 1 | kichik |
| 3 | HUD view-model: `parametr()`, natija/maslahat/holat ro‘yxati, vaqt formati → `engine/vm.js`; `mashq.js` DOM, VR panel — ikkalasi shuni ishlatadi | `mashq.js` → `vm.js` | 1 (VR panel — 5) | o‘rta |
| 4 | Soatni `Lab` ichiga (`lab.tick(dt)`); `setInterval` o‘rniga view/rig chaqiradi | `state.js`, `mashq.js` | 1 | kichik |
| 5 | **Nur bo‘yicha tanlash:** `View3D.pick(ray)` → `{tur:'kl'|'sim'|'bos', …}` va `View3D.activate(hit)`; `tanla(e)` shularning ustiga o‘tadi. VR: nur = kamera markazi | `view3d.js:872` | 2–3 | o‘rta |
| 6 | **Kamera rig:** `OrbitControls`, `chegarala()` (qutiga siqish), `fokus()` tween → `OrbitRig`; keyin `WalkRig` (3-b.), `VrRig` (4-b.) bir xil interfeys bilan | `view3d.js:62–75, 957–988` | 3 | o‘rta |
| 7 | `kadr()` ni ikkiga: `yangila(dt)` (animatsiya) va `chiz(kamera, viewport)` — stereo'da animatsiya bir marta, chizish ikki marta | `view3d.js:1023` | 4 | kichik |
| 8 | `InputManager` (harakat, qarash, tanlash, olish, qo‘yish, tasdiq, bekor); mavjud klaviatura (`mashq.js:240`) va pointer shunga ulanadi. Pult tugmalari, chap/o‘ng slot, ushlab turish/birga bosish qoidalari — [`vr-pult-spec.md`](./vr-pult-spec.md) | yangi `engine/input.js` | 2 | o‘rta |
| 9 | `rejimlar`ga `"vr"` qo‘shish, `?rejim=vr`; `katalog.js` filtri `REJIMLAR` ro‘yxatini kengaytiradi. Faqat `yoritish-01`da yoqiladi | `mashq.js:140`, `katalog.js`, JSON | 4 | kichik |
| 10 | Ixtiyoriy `vr` bloki (boshlang‘ich nuqta, ko‘z balandligi, yo‘l to‘siqlari). Avto-sahnalar uchun `avtoJoylash().s3.kamera`dan olinadi | JSON, `view3d-avto.js` | 3 | kichik |

Ko‘chirish **shart emas:** `elements/*.js` ichidagi `model3d()` / `svg()` (THREE `ctx` orqali beriladi, Node'ni buzmaydi).

## 6. Mobil unumdorlikka xavf tug‘diradigan joylar

O‘lchov: headless Chromium (SwiftShader), 844×390 @3x (landscape telefon), `?rejim=3d`, `renderer.info` bitta `render()` uchun, **soya o‘tishlari ham kiradi**. Draw call/uchburchak soni to‘g‘ri; millisekundlar SwiftShader'da — ahamiyatsiz. Haqiqiy FPS — faqat telefonda (reja: har bosqich oxirida).

| Holat (`yoritish-01`) | Draw call | Uchburchak |
|---|---|---|
| Bo‘sh sahna (simsiz) | 774 | 95 224 |
| To‘g‘ri 9 ta sim, tok yo‘q | 810 | 138 724 |
| Tok bor, kalit ON → **lampa yonadi** | **1266** | **243 528** |
| `motor-04` (avto-sahna, 33 sim) | 537 | 151 924 |

Stereo (2 ko‘z) bu raqamlarni deyarli ikki baravar qiladi. Maqsad (taxminiy, telefonda tasdiqlanadi): ≤ 150–300 draw call va ≤ 100 ming uchburchak **bir ko‘z** uchun.

Xavflar, jiddiylik bo‘yicha:

1. **Soyalar** (`view3d.js:60–61, 494–512`). `shadowMap.enabled`, `PCFSoftShadowMap`; 2 ta soyali `DirectionalLight`. Soya xaritasi `window.innerWidth < 700 ? 1024 : 2048` (**500-q.**) — **landscape telefon ≥ 700 px, ya’ni 2×2048² oladi**: tekshiruv aynan VR holatida noto‘g‘ri tarmoqqa tushadi.
   Har `render()` soyani qayta chizadi → stereo'da 2 marta, agar `shadowMap.autoUpdate=false` qilinmasa.
2. **Yongan lampa = kub soyasi** (`view3d.js:833`: `yorugl.castShadow = intensity > 0`, xarita 512²). PointLight soyasi sahnani 6 marta chizadi: o‘lchovda **+456 draw call, +105 ming uchburchak**. Aynan «Tok berish → lampa yondi» lahzasida kadr tezligi tushadi — mashqning asosiy lahzasi.
3. **Geometriya birlashtirilmagan:** 5 elementli sahnada 318 mesh, 277 geometriya, 120 material. Vint (20×8 segment sfera + 2 quti) har klemmada alohida; avtomat profili `ExtrudeGeometry` bevel bilan. `InstancedMesh`/birlashtirish yo‘q.
4. **Simlar:** har sim — `TubeGeometry` (8 radial segment, `len×60` bo‘lak) **+ ko‘rinmas «hit» trubka** (yana bir mesh). 9 sim ≈ 17.7 ming uchburchak (kadr ichidagi hissasi soyalar bilan ko‘payadi). `simlarQur()` **har o‘zgarishda hamma simni dispose qilib qayta quradi** (GC to‘xtashi); VR'da «sim tortilayotgan» jonli ko‘rinish uchun yengilroq yo‘l kerak.
5. **Tok oqimi nuqtalari:** har nuqta — alohida `Mesh` (o‘lchovda 89 ta ⇒ 89 draw call), har kadrda CPU'da `curve.getPointAt`. `Points`/`InstancedMesh` ga o‘tkazish kerak.
6. **Renderer sozlamalari:** `antialias: true`, `pixelRatio = min(DPR, 2)` (reja: 1), `ACESFilmicToneMapping`, `MeshPhysicalMaterial` (clearcoat — `avtomat_1p`), barcha materiallar `MeshStandardMaterial` + `RoomEnvironment` PMREM. 16 ta shader dasturi (`renderer.info.programs`).
7. **Teksturalar:** 31 ta (`CanvasTexture`; shuvoq 512², laminat 1024², avtomat paneli 232×592, har yorliq — alohida kanvas). Hammasi ishga tushganda asosiy oqimda chiziladi (yuklash vaqti), mipmap + anisotropy 4–8. Reja bo‘yicha «pishirilgan yorug‘lik» uchun hozir asos yo‘q (yorug‘lik to‘liq dinamik).
8. **Doimiy render sikli:** `requestAnimationFrame` har kadrda to‘liq chizadi (`faol` bo‘lsa), «o‘zgarmasa chizma» yo‘q. VR'da bu kerak, lekin 3D (kompyuter) rejimda batareya/qizish.
9. **Yuklash:** `mashq.html` + three + view3d ≈ 1.0 MB (gzip'siz). Service worker/oflayn yo‘q; Google Fonts tashqi so‘rov.
10. **Kamera/yurish:** hozir faqat qutiga siqish (`chegarala()`); devor/shit bilan to‘qnashuv, eshik, mebel — yo‘q. `near=0.02` stereo uchun yaxshi.
11. **Aniqlik:** klemma radiusi 9–13 mm. 1.5 m masofadan nazar nuqtasi bilan (dwell) tegish deyarli mumkin emas → yaqinlashish, eng yaqin klemmaga «yopishish» yoki masofaga qarab «hit» kattalashtirish kerak (5-bosqich).

## 7. Rejaga ta’sir qiladigan topilmalar (qaror kerak)

1. **Branch.** CLAUDE.md: «laboratoriya ustidagi ish `laboratoriya` branch'ida». Rejada: `vr-laboratoriya`. Reponi hozir faqat `main` va sessiya branch'i (`claude/inspiring-lovelace-pgp203`) bor — `laboratoriya` branch'i yo‘q. Qaysi nomdan foydalanamiz?
2. **`/laboratoriya/pult-testi` URL.** `vercel.json:261`: `/laboratoriya/:id([a-z0-9-]+)` → `mashq.html`; `simulyator` uchun alohida redirect+rewrite (`vercel.json:245–258`) bor. Pult testi uchun xuddi shunday yozuv shart, aks holda «Bunday sxema topilmadi» chiqadi. `pult-testi` sxema id bo‘la olmaydi.
3. **«Avtomatni o‘rnat» bosqichi (6-bosqich) mavjud mexanikada yo‘q.** Hozir elementlar `pozitsiya3d` da tayyor turadi; «o‘rnatilgan/o‘rnatilmagan» holati ham, olish/qo‘yish ham yo‘q. Variantlar: (a) `Lab`ga `ornatilgan` holati + JSON'da `montaj` ro‘yxati; (b) MVP'da elementlar tayyor, VR faqat sim ulashni o‘ynaydi. Bu 5–6-bosqich hajmini belgilaydi.
4. **Qadam-baqadam topshiriq.** Hozir bitta `topshiriq` matni + 5 ta ketma-ket `maslahat`. Tabiiy qadamlar bor: `togri_ulanishlar` ning 5 guruhi (faza → avtomat chiqishi → kalit → nol → PE). Alohida «qadam» maydoni kerak yoki shu guruhlardan hosil qilinadi.
5. **Sim rangi tanlash** hozir pastki DOM panelda (`#ranglar`). VR'da world-space panel yoki «terminal turiga qarab avto-rang» kerak.
6. **iyuu.uz embed** (`?embed=iyuu`): iframe'da giroskop, to‘liq ekran va wake-lock uchun ota sahifada `allow="accelerometer; gyroscope; fullscreen"` kerak. Birinchi bosqichda VR faqat to‘g‘ridan-to‘g‘ri `energyvibe.uz` da ishlaydi deb olish xavfsizroq.
7. **Natija saqlash** — `localStorage` (shu qurilma). 6-bosqich mezoni («natija 2D/3D bilan bir xil») bu bilan bajariladi, lekin VR'da boshqa qurilma/brauzer bo‘lsa natija ko‘rinmaydi; SmartEdu bilan bog‘lash (8-bosqich) — hozirgi `postMessage` yo‘li asos.
8. **Yangi sxema qoidasi.** CLAUDE.md: yangi sxema/modul faqat egasi «qo‘sh» deganda. VR `yoritish-01`ning yangi **ko‘rinishi**, yangi sxema emas — lekin `rejimlar`ga `"vr"` va `vr` bloki qo‘shish JSON'ni o‘zgartiradi. Buni ham egasidan tasdiqlatamiz.
9. Hujjat joyi: `docs/vr-audit.md` repo ildizida yaratildi (so‘ralganidek). Qolgan laboratoriya hujjatlari `laboratoriya/docs/` da. Ikkalasi ham Vercel'da ochiq statik fayl sifatida beriladi.

## 8. Nimani qayta ishlatamiz / nimani ajratamiz

**Qayta ishlatamiz (o‘zgartirmasdan):** sxema JSON formati, `simulyator.js`, `checker.js`, `QOIDALAR`, `togriSimlar`, `Lab` (klemma/sim/ball/maslahat/qaytarish), element turlari (`klemmalar`, `ichki`, `hisobla`), `model3d()`lar, xona/shit/lampa modellari, sim yo‘li (`egri`), uchqun effekti, i18n kalitlari, 87 sinov.

**Ajratamiz (5-bo‘lim):** HUD mantig‘i → `vm.js`; nur bo‘yicha tanlash → `pick(ray)`; kamera → rig; `kadr()` → `yangila` + `chiz`; klaviatura/pointer → `InputManager`; `Lab`dan `localStorage`/`Date.now`/tayyor matn.

**Qayta ko‘rib chiqamiz (VR uchun):** soyalar, lampa kub soyasi, tok nuqtalari, sim qayta qurish, mesh birlashtirish (6-bo‘lim) — 3–4-bosqichlardan oldin byudjet qo‘yish kerak.

**Tavsiya etilgan keyingi qadam:** 1-bosqichni 5-bo‘limdagi 1–4 punktlar bilan boshlash (kichik, xavfsiz, sinovlar bor), 6-bo‘limdagi 1–2 punktni (soya/lampa) 3–4-bosqichdan oldin alohida «unumdorlik byudjeti» commit'i qilish.
