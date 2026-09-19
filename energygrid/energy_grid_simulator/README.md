# Energy Grid Simulator

O‘quv / simulyatsion model: IES, AES va Quyosh EES quvvatlari iste’molchilarga qanday taqsimlanishini ko‘rsatadi.

## Ishga tushirish
1. Zipni oching, `index.html` faylini Chrome / Edge / Firefox orqali oching (internet va server kerak emas).
2. `index.html`, `style.css`, `app.js` bir papkada turishi kerak.

## Nima qila oladi
- **Stansiyalar:** har birining quvvatini slider bilan sozlash, yoqish / o‘chirish.
- **Quyosh EES:** quvvati kun bo‘yi o‘zgaradi (06:00–18:00, tunda 0 MW). Slider — sozlangan quvvat, haqiqiy chiqish esa shu soatda mavjud quvvat bilan cheklanadi.
- **Iste’molchilar:** talabni slider bilan o‘zgartirish (sanoat, shifoxona, uylar, park).
- **Dispatch jadvali:** qaysi manbadan qaysi iste’molchiga necha MW berilishini qo‘lda kiritish.
- **AVTOMATIK tugmasi:** bosilsa, vaqt yoki quvvat o‘zgarganda iste’molchilar o‘zi ta’minlanadi: avval eng qimmat manba (IES → AES → Quyosh), iste’molchilar esa prioritet bo‘yicha (shifoxona va uylar birinchi). Jadval qulflanadi. O‘chirilsa — qo‘lda rejim, jadvalni o‘zingiz o‘zgartirasiz.
- **Haqiqiy yetkazilgan quvvat:** stansiya o‘chirilgan bo‘lsa yoki jadvalda mavjud quvvatdan ko‘p yozilgan bo‘lsa, iste’molchi faqat haqiqatda yetkazilgan quvvatni oladi (hamma stansiya o‘chirilsa — hamma iste’molchida 0 MW).
- **Simlar:** har bir stansiyadan har bir iste’molchiga alohida sim bor (3 × 4 = 12). Rangli va animatsiyali sim — quvvat oqyapti (qalinligi MW ga bog‘liq); xira yaxlit — ulangan, lekin 0 MW; xira punktir — uzilgan; qizil — jadvalda yozilgan, lekin manbada quvvat yo‘q.
- **Simlarni qo‘lda ulash / uzish (qo‘l rejimida):** animatsiyadagi sim ustiga yoki jadvaldagi katak yonidagi belgiga bosing. Har bir stansiyaning 4 ta simidan istalgan 1, 2 yoki 3 tasini ulash / uzish mumkin. Uzilgan simdan quvvat o‘tmaydi (jadval katagi qulflanadi). Ulanganda sim boshlang‘ich qiymatni o‘zi oladi: manbaning bo‘sh quvvati va iste’molchining yetishmayotgan quvvatidan kichigi — keyin jadvalda o‘zgartirishingiz mumkin. AVTOMATIK yoqilganda simlar qulflanadi va o‘zi belgilanadi.
- **Vaqt simulyatsiyasi:** 15 daqiqalik qadam bilan ketadi (12:00, 12:15, 12:30, 12:45, 13:00 …). Tezligini `app.js` boshidagi `STEP_MS` (millisekund) va qadamini `TIME_STEP` (soat) bilan o‘zgartirish mumkin.
- **Muhandislik nazorati:** yetishmovchilik, ortiqcha yuborish, zaxira haqida ogohlantirishlar.

## Muhim muhandislik izohi
Bu modelda "virtual dispatch" ishlatiladi. Haqiqiy elektr tarmog‘ida quvvat "falon stansiya falon iste’molchiga" tarzida qat’iy yo‘l bilan emas, tarmoq impedanslari va Kirchhoff qonunlari asosidagi power-flow orqali taqsimlanadi.

Keyingi versiyada qo‘shish mumkin:
- 110 / 220 / 500 kV shinalar va transformatorlar
- liniya aktiv va reaktiv qarshiligi, yo‘qotishlar
- chastota 50 Hz, kuchlanish chegaralari
- N-1 ishonchlilik
- stansiyalar uchun alohida ishlab chiqarish cheklovlari
- load shedding, SCADA ko‘rinishi
- Python backend + SQLite

Eslatma: elektr quvvati uchun MW, vaqt davomida sarflangan energiya uchun MWh ishlatiladi.
