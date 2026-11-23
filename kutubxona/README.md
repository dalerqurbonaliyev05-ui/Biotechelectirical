# Kutubxona (/kutubxona/)

Statik bo'lim (bundler yo'q): javon + kitobdek varaqlanadigan o'quvchi + kitob ichidan qidiruv
(lotincha yozsangiz ham kirill matnidan topadi) + "o'qishni davom ettirish".

## Yangi kitob qo'shish
1. PDF ni `books/` ga qo'ying (nomi lotincha, bo'shliqsiz: `montaj-qollanma.pdf`).
2. Muqova: `pdftoppm -jpeg -f 1 -l 1 -scale-to-x 560 -scale-to-y -1 books/montaj-qollanma.pdf covers/montaj-qollanma`
   (hosil bo'lgan faylni `covers/montaj-qollanma.jpg` deb nomlang).
3. `books.json` dagi `books` ro'yxatiga yozuv qo'shing (`id` = fayl nomi, `pages` = betlar soni, `sizeMB`).
   Yangi turkum kerak bo'lsa `categories` ga qo'shing — bo'sh turkumlar javonda ko'rinmaydi.

## Texnik
- PDF -> `pdf.js`, varaqlash -> `StPageFlip`; hammasi `vendor/` ichida (tashqi CDN kerak emas).
- Sahifalar faqat kerak bo'lganda chiziladi, shuning uchun 300+ betlik kitob ham tez ochiladi.
- O'qish joyi brauzerda (localStorage) saqlanadi.
- Havola oxirida `/` bilan: `/kutubxona/` (`vercel.json` da `/kutubxona` shu yerga yo'naltiriladi).
