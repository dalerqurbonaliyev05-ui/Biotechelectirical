# VR unumdorlik byudjeti (A vazifasi)

Asos: [`vr-audit.md`](./vr-audit.md), 6-bo‘lim. Bu hujjat **kod emas** — o‘lchov natijalari, byudjet va tuzatishlar tartibi.
Qaror o‘zgarsa, audit bilan birga yangilanadi. Sahna kodiga tegilmagan.

## 1. O‘lchov usuli va ishonchlilik

- Headless Chromium (SwiftShader), 844×390 @3x, `yoritish-01?rejim=3d`. Sahifa ichida `renderer.info` bitta `render()` uchun o‘qiladi, **soya o‘tishlari ham kiradi**.
- Holat: to‘g‘ri 9 sim, tok berilgan, kalit ON (lampa yonib turibdi) — mashqning eng og‘ir lahzasi.
- Tuzatishlar **vaqtincha** sahifada o‘chirib ko‘rildi (`castShadow=false`, `visible=false`); repo kodi o‘zgarmagan. Raqamlar tuzatish uchun taxminiy tejamni ko‘rsatadi: haqiqiy tuzatishda vizual natija sinalishi kerak.
- **Draw call va uchburchak soni ishonchli. Millisekund va FPS — emas** (dasturiy renderer). Haqiqiy FPS faqat telefonda: har bosqich oxirida o‘rta va arzon Android'da, iPhone'da o‘lchanadi.

## 2. O‘lchov natijalari (bir ko‘z, `yoritish-01`, lampa yonib turibdi)

| # | Holat | Draw call | Uchburchak | Oldingisiga nisbatan |
|---|---|---|---|---|
| 0 | Hozirgi holat | **1266** | **243 528** | — |
| 1 | Ko‘rinmas «hit» meshlar chizilmasin (22 klemma + 9 sim) | 1235 | 230 972 | −31 / −12.6 ming |
| 2 | Faqat lampa kub soyasi o‘chirilsin | 899 | 151 184 | **−367 / −92 ming** (0-dan) |
| 3 | Faqat 2 ta yo‘nalishli soya o‘chirilsin | 800 | 170 052 | −466 / −73 ming (0-dan) |
| 4 | **Barcha soyalar o‘chirilsin** | **433** | **77 708** | −833 / −166 ming (0-dan) |
| 5 | 4 + tok nuqtalari (89 ta mesh) yo‘q | 344 | 65 248 | −89 / −12.5 ming |
| 6 | 5 + «hit» meshlar chizilmasin | 313 | 52 692 | −31 / −12.6 ming |
| 7 | 6 + klemma markerlari (22 ta) yo‘q | **291** | **44 948** | −22 / −7.7 ming |

Soyasiz sahna tarkibi: ko‘rinadigan 388 mesh (66 ming uchburchak), klemma «hit» 22 (7.7 ming), sim «hit» 9 (4.8 ming), bosiladigan 6 (2.3 ming).
Unikal material — 120, shuning uchun mesh'larni materiali bo‘yicha birlashtirish nazariy pastki chegarasi ≈ 120 draw call (hisob, o‘lchov emas).

**Xulosa:** draw call'ning **66 %** i (833/1266) va uchburchakning **68 %** i soyalardan. Soyasiz holatda ham 433 → 291 draw call qoladi.
Stereo har kadrda ikki `render()` → hozirgi holat ≈ **2530 draw call/kadr**; soyasiz va tozalangan holat ≈ **580**.

## 3. Byudjet

**Taxminiy** — telefonda tasdiqlanguncha ishchi maqsad. Bir ko‘z uchun (kadr = 2 ko‘z), MVP (`yoritish-01`) uchun.

| Ko‘rsatkich | Hozir | MVP chegarasi | Maqsad |
|---|---|---|---|
| Draw call / ko‘z | 1266 | ≤ 300 | ≤ 150 |
| Uchburchak / ko‘z | 243 528 | ≤ 100 000 | ≤ 60 000 |
| Dinamik soya | 3 ta (2 yo‘nalishli + lampa kub) | **0** | 0 |
| Statik soya | — | ≤ 1 xarita, ≤ 1024², bir marta chiziladi (`autoUpdate=false`) | pishirilgan |
| Yorug‘lik manbalari (jami, soyasiz) | 5 (hemisfera, ambient, 2 yo‘nalishli, lampa) | ≤ 4 | ≤ 3 |
| Teksturalar | 31 ta, ≈ 10 MB GPU (canvas teksturalar, hisob; PMREM muhit xaritasi kirmaydi) | har biri ≤ 1024², jami ≤ 16 MB | ≤ 8 MB |
| Shader dasturi | 16 | ≤ 12 | ≤ 8 |
| `pixelRatio` | min(DPR, 2) | sozlanadigan: 1 / 1.5 / 2 | avto |
| Kadr tezligi (o‘rta telefon) | — | ≥ 45 FPS | 60 FPS |
| Kadr tezligi (arzon telefon) | — | ≥ 30 FPS | 45 FPS |
| Sim o‘zgarganda qayta qurish | hamma simlar | faqat o‘zgargan sim | — |
| Boshlang‘ich yuklash (JS) | ≈ 1.0 MB, gzip'siz | ≤ 1 MB gzip | — |

**Piksellar** (844×390 landshaft, bir ko‘z ≈ 422×390 CSS px; hisob): `pixelRatio` 1 — 0.16 MP, 1.5 — 0.37 MP, 2 — 0.66 MP, 3 — 1.48 MP.
Rejadagi «pixelRatio 1» linza orqali ko‘zga **donador** ko‘rinishi mumkin; shuning uchun sifat uch pog‘onali (1 / 1.5 / 2) bo‘lib, kadr vaqtiga qarab avtomatik tushiriladi. Pog‘onani telefonda tanlaymiz.

Qoidalar:
- Soya xaritasi o‘lchami `window.innerWidth` ga bog‘lanmaydi (landshaft telefon ≥ 700 px → hozir 2048²; `view3d.js:500`). VR'da qat’iy ≤ 1024².
- Yongan lampa yorug‘ligi **soyasiz** `PointLight` yoki emissive + yorug‘lik dog‘i bo‘ladi. Kub soyasi taqiqlanadi.
- Yangi mesh/material qo‘shganda byudjet jadvali o‘zgarishi tekshiriladi (7-bo‘lim).

## 4. Tuzatishlar tartibi (tejam bo‘yicha)

| № | Tuzatish | Tejam (o‘lchangan) | Qiyinligi | Xavf |
|---|---|---|---|---|
| 1 | Lampa kub soyasini o‘chirish (`view3d.js:833` `castShadow = intensity > 0` → `false`) | −367 call, −92 ming tri | bir qator | past: lampadan soya tushmaydi |
| 2 | Yo‘nalishli soyalarni VR'da o‘chirish; 3D (kompyuter) rejimda o‘zgarishsiz | −466 call, −73 ming tri | kichik | past (VR'da); kompyuter rejimiga tegilmaydi |
| 3 | Statik soyani bir marta chizish (`shadowMap.autoUpdate=false` + `needsUpdate`) yoki pishirilgan AO — soya kerak bo‘lsa | soya kerak bo‘lsa — har kadrda emas, bir marta chiziladi (tejam alohida o‘lchanmagan) | o‘rta | o‘rta: soya xaritasini qayta chizish vaqti (simlar o‘zgarganda) |
| 4 | Tok nuqtalari: 89 ta `Mesh` → bitta `InstancedMesh` yoki `Points` | −89 call, −12.5 ming tri | kichik–o‘rta | past |
| 5 | «Hit» meshlarni chizmaslik, lekin nurni qabul qilish (alohida `layer`, `Raycaster.layers`) | −31 call, −12.6 ming tri | kichik | past |
| 6 | Klemma markerlari (22) → bitta `InstancedMesh` | −22 call, −7.7 ming tri | kichik | past |
| 7 | Statik mesh'larni materiali bo‘yicha birlashtirish (xona, shit, yorliqlar) | taxminan ≤ 120 call gacha | **katta** | o‘rta: tanlanadigan/animatsiyali qismlar alohida qolishi kerak |
| 8 | Simlar: radial segment 8 → 5, bo‘laklar `len×60` → `len×30` | uchburchakni kamaytiradi (9 sim ≈ 17.7 ming) | kichik | past |
| 9 | `simlarQur()`: faqat o‘zgargan simni qayta qurish | GC to‘xtashini yo‘qotadi (kadr tezligiga emas) | o‘rta | past |
| 10 | `antialias` VR'da o‘chirilishi, sifat pog‘onasi, kadr vaqti bo‘yicha avto-tushirish | piksel byudjeti | o‘rta | past |

1–2 va 4–6 punktlardan keyin kutilgan natija: **≈ 291 draw call / 45 ming uchburchak** bir ko‘z uchun (o‘lchov 7-qator) — MVP chegarasi (300) ichida. 7-punkt maqsadga (≤ 150) yetish uchun kerak bo‘lishi mumkin; shoshilmaymiz — telefondagi FPS ko‘rsatadi.

## 5. Qaysi bosqichda nima

| Bosqich | Qilinadigan ish |
|---|---|
| 1 | Hech narsa o‘zgarmaydi; 3D sahifa xuddi avvalgidek |
| 3 (yurish) | Byudjet jadvalini bajarish: 1, 2 (faqat VR/yurish sozlamasi), 5, 4, 6; chiqishda telefonda FPS o‘lchash |
| 4 (VR) | 3, 8, 9, 10; stereo `chiz()` ikki marta, animatsiya bir marta; sifat pog‘onasi |
| 7 (sayqal) | 7 (birlashtirish), tekstura siqish, oflayn |

Eslatma: 1–2-punktlar mavjud 3D (kompyuter) rejimning ko‘rinishini o‘zgartiradi. CLAUDE.md va audit 1-bosqichining «xuddi avvalgidek ishlaydi» mezoni uchun ularni **faqat VR/yurish rejimiga** bog‘lash (`sifat` sozlamasi) xavfsizroq.

## 6. Ochiq savollar

1. Hozirgi 3D (kompyuter) rejimda soyalar saqlansinmi yoki hamma rejimda olib tashlansinmi? (Soya — hozirgi ko‘rinishning bir qismi.)
2. «Arzon» va «o‘rta» telefon uchun aniq model ro‘yxati (sinov qurilmalari).
3. Lampa yonganda yorug‘lik dog‘i uchun yoqadigan variant: soyasiz `PointLight` yoki emissive + «glow» sprite.

## 7. Tekshirish usuli (keyingi bosqichda)

- Brauzerda: sahifa ichida `renderer.info.render.calls/triangles` (hozir `window.__v3d` mavjud) — har bosqich oxirida qayd etiladi.
- Avtomatik: Playwright'da `?rejim=3d` ochib, 0-7 holatlaridagi sonlarni byudjet jadvali bilan solishtiruvchi skript (haqiqiy FPS emas, faqat sonlar). Hozircha repoga qo‘shilmagan; 3-bosqichda qo‘shish taklif qilinadi.
