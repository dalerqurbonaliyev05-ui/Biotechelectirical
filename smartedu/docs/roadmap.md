# Yo'l xaritasi (hozir YO'Q — kelajak uchun bo'sh joylar)

Bu versiya (MVP) ataylab quyidagilarni o'z ichiga olmaydi. Har biri uchun "qayerga ulanadi" ko'rsatilgan.

## 1. Jonli video (masofaviy talabalar)

- **Eng oddiy yo'l:** ma'ruza yaratilganda Google Meet/Zoom havolasi maydoni (`lecture_sessions.video_url`, ixtiyoriy).
  Talaba telefonidagi `/live/<kod>` sahifasida "Videoni ochish" tugmasi chiqadi. Bitta ustun + bitta tugma.
- **O'z video xizmati:** LiveKit (ochiq kodli; o'z serveringizda yoki LiveKit Cloud). Token berish uchun yangi API route
  (`/api/live/video-token`), faqat qo'shilgan ishtirokchiga (`requireParticipant`). Bepul tarifda trafik/ulanishlar cheklangan.
- Doskadagi slaydni video oqimiga qo'shish — alohida vazifa (ekran ulashish).

## 2. AI yordamchi

- **Talabaga:** savol natijasi sahifasida "Tushuntir" tugmasi (to'g'ri javobni TUSHUNTIRADI, lekin nazorat tugamaguncha emas).
- **O'qituvchiga:** PDF ma'ruzadan savol qoralamasi yaratish; yozma javoblarni rubrika bo'yicha dastlabki baholash (yakuniy
  bahoni o'qituvchi tasdiqlaydi — shu loyiha qoidasi o'zgarmaydi).
- Ulanadigan joy: `src/lib/server/ai.ts` (yangi). Tashqi API kaliti `.env` da; talabalar ma'lumotini YUBORMANG (anonimlashtiring).
  Pullik xizmat bo'lgani uchun alohida qaror kerak ("tashqi pullik xizmat yo'q" qoidasi).

## 3. Universitet integratsiyalari (HEMIS va boshqalar)

- Talabalar/guruhlar/fanlarni HEMIS'dan import qilish: `scripts/import-hemis.mjs` yoki `POST /api/admin/sync/hemis`
  (service role). Mavjud CSV importi (`lib/import/students.ts`) shu yerga mos format beradi.
- Baholarni HEMIS'ga qaytarish: semestr reyting ma'lumoti (`lib/server/analytics.ts → loadGroupSemester`) tayyor manba.
- Yagona kirish (SSO/OIDC): Supabase Auth provayderi orqali; talaba kodi → sintetik email xaritasi o'rniga HEMIS ID.

## 4. Ko'p universitetli rejim

- Hozir `faculties` eng yuqori daraja. Kerak bo'lsa `organizations` jadvali + har jadvalga `org_id` va RLS'da
  `org_id = my_org_id()` sharti qo'shiladi (`my_group_id()` kabi yordamchi). Migratsiya orqali bosqichma-bosqich.

## 5. Xavfsizlikni kuchaytirish

- **Laboratoriya "ishga tushirish tokeni":** SmartEdu imzolagan qisqa muddatli token (talaba kodi + nazorat + muddat) havolaga
  qo'shiladi, laboratoriya serveri tekshiradi → boshqa talaba kodi bilan natija yuborib bo'lmaydi (`docs/lab-integration.md`).
- **Davomat:** bir xil tarmoq (IP guruhi) / geolokatsiya signali; javob faolligi bilan solishtirish (`docs/attendance.md`).
- **Realtime private kanallar:** `realtime.messages` RLS siyosati bilan faqat sessiya egasi yubora oladi (`docs/decisions.md`, 6-bosqich).
- **Tezlik cheklovi:** hozir xotirada (instansiya bo'yicha). Qat'iy chegara: Postgres'da hisoblagich jadvali + RPC.
- **Nonce'siz CSP** hozir `'unsafe-inline'` skriptga ruxsat beradi; nonce'li CSP (middleware'da) keyingi qadam.

## 6. Qulayliklar

- Ko'p tillilik (`src/lib/i18n/uz.ts` → `ru.ts`, `en.ts`; til tanlash cookie/profil).
- PowerPoint (.pptx) yuklash: server tomonda PDF ga o'tkazish (LibreOffice) — bepul tarifda og'ir; hozir "PDF qiling" xabari.
- Savollarni arxivlash (ustun bor, UI yo'q), qisman ballli ko'p javobli test, matematik formulalar (KaTeX).
- Offline-first nazorat: hozir javoblar `localStorage` da saqlanadi; to'liq PWA keyin.
