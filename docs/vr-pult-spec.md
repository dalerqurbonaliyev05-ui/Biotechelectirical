# Ikki qo‘lli VR pult (kontroller) — spetsifikatsiya

**Versiya:** 3 (qoralama). Matn hozircha 2-versiya asosida, 3-versiya qarorlari qo‘llangan; keyin loyiha hujjatidan to‘ldiriladi.
**Hujjat egalari:** bu fayl — sayt va firmware o‘rtasidagi **kelishuv manbai** (tugma jadvali shu yerda turadi).
Firmware (ESP32) alohida repoda: **`vr-pult-firmware`**. Sayt repo'si faqat statik sayt va Vercel uchun.
Qaror o‘zgarsa, bu fayl, [`vr-audit.md`](./vr-audit.md) va [`vr-reja.md`](./vr-reja.md) **birga yangilanadi**.

Maqsad: ikkita bir xil pult, har biri VR dagi bitta «slot» (chap/o‘ng). Talaba ko‘zoynak ichida pultni ko‘rmaydi, shuning uchun hammasi tuyg‘u bilan ishlashi kerak. Android va iPhone'da ishlashi shart.

## 0. Qabul qilingan qarorlar

1. **Yurish: muallif profili standart.** Bir pult joystick'i oldinga/orqaga, ikkinchisi chapga/o‘ngga. Standart (chap yurish + o‘ng burilish) profil sozlamada tanlanadi. Qaysi pult qaysi vazifani bajarishi sozlamada almashtiriladi (chapaqaylar uchun).
2. **Balandlik: narvon** (stol emas). *(8-bosqich.)*
3. **Telefonlar:** Android va iPhone ikkalasi ham.
4. **Chap/o‘ng farqi:** pultlar jismonan va dasturan bir xil, lekin **chap va o‘ng turli tugma to‘plamini yuboradi**. Qaysi to‘plam — platadagi **fizik jumper** bilan belgilanadi (brauzer hodisadan qurilmani ajrata olmaydi, shuning uchun farq tugma kodida bo‘lishi shart).
5. **Joystick bosilishi:**
   - bitta joystick **≈ 300 ms ushlab turilsa** — ko‘rish rejimi (ushlab turilgan vaqtda joystick qarashni boshqaradi);
   - ikkala joystick **≈ 150 ms oynada birga bosilsa** — og‘ir narsani ko‘tarish; bunda ko‘rish rejimi bekor bo‘ladi.
   Chegaralar **saytda** (`InputManager`) hisoblanadi, firmware faqat xom bosish/qo‘yib yuborish yuboradi.
6. **Pult = tugmalar to‘plami.** «Qo‘l» yo‘q: pultda harakat sensori yo‘q, qo‘l fazoda kuzatilmaydi; nur har doim ekran markazidan chiqadi. «Ikki qo‘l» = **ikki slot** (chap/o‘ng), HUD'da ko‘rsatiladi.
7. **MVP doirasi:** joystick, **A**, **C**, **Menyu**. B, narvon, uy buyumlari, asbob va elementni o‘rnatish — **8-bosqich** (qarang 1-bo‘lim).
8. **Klaviatura rejimida band tugmalar ishlatilmaydi:** `Esc`, `Delete`, `Backspace`, `Ctrl+Z/Y`, `F` (hozirgi `mashq.js` dagi tezkor tugmalar).
9. **Firmware alohida repoda** (`vr-pult-firmware`).

## 1. MVP va keyingi bosqich

| Imkoniyat | MVP | 8-bosqich |
|---|---|---|
| Yurish (joystick) | ✅ | |
| Qarash: telefon giroskopi; giroskopsiz — joystick ushlab turish | ✅ | |
| **A** — terminalni tanlash, sim ulash, tugma/dasta bosish | ✅ | |
| **C** — maslahat | ✅ | |
| **Menyu** — topshiriq, tekshirish, sozlamalar, to‘xtatish; uzoq bosish — qayta markazlash | ✅ | |
| Tok berish (avtomat dastasini A bilan bosish) | ✅ | |
| **B** — uy buyumlari, narvon | | ✅ |
| Narvon (balandga chiqish) | | ✅ |
| Asbob (otvyortka, ambur), ikki slotda ob‘ekt + asbob | | ✅ |
| Uy buyumi sudrash, yengil/og‘ir ko‘tarish | | ✅ |
| Elementni o‘rnatish, olish/qo‘yish | | ✅ |

B tugmasi platada **bor** (jismoniy), lekin MVP dasturida ishlatilmaydi.

## 2. Jismoniy joylashuv (har bir pult)

| Element | Barmoq | Izoh |
|---|---|---|
| Joystick | bosh barmoq | harakat; bosish — ko‘rish rejimi (ushlab turish) / og‘ir narsa (ikkalasi birga) |
| **A** | ko‘rsatkich barmoq (old tetik) | simlar, terminal, tugma/dasta (8-b.: asbob) |
| **B** | o‘rta barmoq (tutqich) | *8-bosqich:* uy buyumlari, narvon |
| **C** | bosh barmoq (tepada) | maslahat |
| **Menyu** | bosh barmoq (tepada) | sozlamalar, topshiriq, to‘xtatish. Uzoq bosish: ko‘rish yo‘nalishini qayta markazlash |
| **Power** | yon tomonda | tasodifan bosilmasligi uchun slayder yoki chuqurlashtirilgan |

Asosiy qoida: bosh barmoq joystickda band, shuning uchun A va B ni bosh barmoq bilan bosib bo‘lmaydi.
Qo‘shimcha talablar: tugmalar tuyg‘uda farqlansin; bilak tasmasi; ulanish LED'i (chap/o‘ng rangi har xil); kit raqami (Pult-07); 10 daqiqa harakatsizlikdan keyin uyqu; **chap/o‘ng jumperi** (4-qaror).

## 3. Mantiqiy harakatlar

| Harakat | Qanday bajariladi | Bosqich |
|---|---|---|
| Oldinga/orqaga | birinchi pult joystick'i | MVP |
| Chapga/o‘ngga | ikkinchi pult joystick'i: giroskop bor — yon qadam; yo‘q — burilish | MVP |
| Qarash | telefon giroskopi (bosh bilan). Giroskop yo‘q: joystick ≈ 300 ms ushlab turilsa, joystick qarashni boshqaradi | MVP |
| Terminal/asbob/dasta | A. Birinchi terminal → ikkinchi terminal: sim ulanadi. Takror bosish — bekor | MVP |
| Maslahat | C: 1 — yo‘nalish, 2 — aniq terminallar, 3 — to‘g‘ri javob (ball kamayadi) | MVP |
| Menyu | Topshiriq, Tekshirish, Qaytadan boshlash, Til, Sozlamalar, Chiqish | MVP |
| Tok berish | avtomat dastasini A bilan bosish (menyuda zaxira) | MVP |
| Uy buyumi | B ushlab turilganda sudraladi; ikkala B birga — yengil buyumni ko‘tarish | 8 |
| Og‘ir narsa (motor) | ikkala joystick bosilishi birga (≈ 150 ms oynada) | 8 |
| Narvonga chiqish | narvonga B bilan: kamera sekin ko‘tariladi, tovush, chetlar qorayadi | 8 |
| Ikki slotda asbob | bir slotda ob‘ekt (avtomat), ikkinchisida asbob; HUD'da ko‘rsatiladi | 8 |

## 4. Tugma jadvali (sayt ↔ firmware kelishuvi)

> **TAKLIF — tasdiqlanmagan.** Firmware repo'si bilan kelishilguncha o‘zgarishi mumkin. Jadvalni o‘zgartirsangiz — bu faylni va `InputManager` xaritasini birga yangilang.

Qoidalar:
- Sayt `KeyboardEvent.code` ni o‘qiydi (`key` emas): bu telefondagi til/klaviatura tartibiga bog‘liq emas (uz/ru/en).
- Firmware: har bir bosishda `keydown`, qo‘yib yuborishda `keyup` yuboradi; ushlab turish, ikki tugma birga bosish va uzoq bosishni **sayt** hisoblaydi.
- Ishlatilmaydi: `Escape`, `Delete`, `Backspace`, `KeyF`, `KeyZ`, `KeyY` (`Ctrl+Z/Y` bilan to‘qnashmaslik uchun), bo‘shliq, strelkalar (sahifani aylantiradi), media tugmalari (OT ushlab oladi).
- `preventDefault` saytda chaqiriladi; kanvas fokusda bo‘lishi kerak (iPhone).

| Mantiqiy nom | Chap pult (`code`) | O‘ng pult (`code`) |
|---|---|---|
| Joystick oldinga | `KeyW` | `KeyI` |
| Joystick orqaga | `KeyS` | `KeyK` |
| Joystick chapga | `KeyA` | `KeyJ` |
| Joystick o‘ngga | `KeyD` | `KeyL` |
| Joystick bosilishi | `KeyQ` | `KeyU` |
| **A** | `KeyE` | `KeyO` |
| **B** *(8-b.)* | `KeyR` | `KeyP` |
| **C** | `KeyT` | `KeyH` |
| **Menyu** | `KeyG` | `KeyM` |

Power — apparat tugma, kod yubormaydi.
Uzoq bosish (Menyu — qayta markazlash) chegarasi 2-bosqichda aniqlanadi.

## 5. Joystick bosilishi qoidalari

- Bitta joystick bosilsa va ≈ 300 ms ushlab turilsa → **ko‘rish rejimi**; qo‘yib yuborilsa → rejim tugaydi. 300 ms dan oldin qo‘yib yuborilsa — hech narsa bo‘lmaydi.
- Ikkinchi joystick birinchisidan keyin ≈ 150 ms ichida bosilsa → **og‘ir narsa** (8-b.). Birinchisi ko‘rish rejimiga o‘tgan bo‘lsa ham, ikkinchisi bosilgach ko‘rish rejimi bekor bo‘ladi.
- 8-bosqichgacha ikkala joystick birga bosilganda hech narsa bo‘lmaydi, lekin ko‘rish rejimi yoqilmasligi uchun shu oyna hisobga olinadi.

## 6. Telefon sensori (giroskop)

Sayt «VR ga kirish» tugmasi bosilganda sensorni tekshiradi (iPhone'da ruxsat shu tugma bosilganda so‘raladi). Uch holat:
- **Giroskop bor:** silliq qarash.
- **Faqat kompas/akselerometr bor:** qarash ishlaydi, titrashi mumkin; silliqlash filtri qo‘shiladi.
- **Sensor yo‘q:** «Pult bilan qarash» rejimi avtomatik yoqiladi.

`DeviceOrientationEvent` sensor bo‘lmasa ham brauzerda mavjud, shuning uchun «yo‘q» holati birinchi hodisadagi `alpha/beta/gamma` qiymatlari `null` ekanidan (≈ 1 s kutib) aniqlanadi. Faqat giroskopda yaw sekin siljiydi → Menyu uzoq bosish bilan qayta markazlash.
Sensor holati pult-testi sahifasida ko‘rinadi: dars oldidan o‘qituvchi har bir talabaning telefonini tekshiradi.

## 7. Ulanish va telefon turlari

- **Bosh qoida:** iPhone'dagi Safari gamepadni faqat Apple'ning GameController tizimi tanisa ko‘radi; oddiy BLE gamepadlarni tanimaslik haqida dasturchilar shikoyat qilgan. Shu sabab ESP32 gamepad bo‘lib iPhone'da ishlamasligi mumkin.
- **Universal rejim (asosiy): klaviatura.** Har pult Bluetooth klaviatura bo‘lib ulanadi (4-bo‘lim jadvali). Android va iPhone'da ishlashi kutiladi, joystick raqamli bo‘ladi (analog tezlik yo‘q). Ikkita Bluetooth klaviaturaning bir vaqtda ulanishi iPhone'da prototipda tekshiriladi.
- **Qo‘shimcha rejim: gamepad** (faqat Android'da, analog tezlik uchun).
- **Prototip:** bitta ESP32 + joystick + 3 tugma; Android va iPhone'da 2-bosqichdagi pult-testi bilan sinash.
- Plata: ESP32; batareya: Li-Po + zaryadlash moduli.

## 8. iPhone'ga xos

- To‘liq ekran: Fullscreen API ishonchsiz (qisman qo‘llab-quvvatlanadi). Sayt to‘liq ekran yo‘q holatda ham ishlashi kerak (manzil satri minimal, landshaft); «Bosh ekranga qo‘shish» (PWA) varianti prototipda tekshiriladi.
- Giroskop ruxsati: faqat tugma bosilganda so‘raladi.

## 9. Xavfsizlik

- Talaba ko‘zoynak ichida atrofni ko‘rmaydi: o‘tirgan holda (aylanuvchi stul) ishlasin yoki bo‘sh joyda tursin.
- Balandlik (8-b.): kamera sekin ko‘tariladi, tezkor sakrash yo‘q.
- Narvon (8-b.): elektrik amaliyoti bo‘yicha xavfsiz usul.

## 10. Ochiq masalalar

1. Ikki Bluetooth klaviaturaning iPhone'da bir vaqtda ishlashi (prototipda sinash).
   *Zaxira (taklif, tekshirilmagan):* ikkinchi pult birinchisiga ESP-NOW orqali ulanadi, telefonga bitta BLE ulanish qoladi. ESP32'da BLE va ESP-NOW radio'ni ulashadi — prototipda tekshirish kerak.
2. iPhone'da to‘liq ekran/PWA varianti (prototipda sinash).
3. Giroskopsiz Android'larda «pult bilan qarash» qulayligi (haqiqiy telefonda sinash).
4. 4-bo‘limdagi tugma kodlari firmware repo'si bilan tasdiqlanishi kerak.
5. Menyu uzoq bosish chegarasi (2-bosqich).

## 11. Saytga ta’siri (2-bosqich)

- `InputManager` mantiqiy nomlari qo‘l (slot) bo‘yicha: `chap.A`, `o‘ng.joystick`, …; profil (muallif/standart) va chap-o‘ng almashtirish shu yerda.
- Raqamli joystick holati (bosilib turgan tugmalar), ushlab turish va ikki tugma birga bosishni aniqlash.
- `/laboratoriya/pult-testi`: qaysi pult/tugma/hodisa kelgani, bosilib turganlar, sensor holati, ikki pult bir vaqtda ishlayaptimi, iPhone to‘liq ekran/PWA holati, Gamepad API ro‘yxati. (Manzil uchun `vercel.json` da alohida yozuv kerak — `vr-audit.md`, 7-bo‘lim, 2-band.)
