# Qarorlar jurnali (taxminlar va sabablari)

Har yozuv: **nima** → **nima uchun** → **qanday o'zgartirish mumkin**.

## 0-bosqich

1. **Loyiha joyi: `smartedu/` papkasi, shu repo ichida.**
   Topshiriq "bo'sh papka" deydi, lekin bu repo EnergyVibe statik sayti. Ildizga Next.js qo'yish saytni
   buzardi. Papka `.vercelignore` ga qo'shildi (repo odatiga mos, `*-src` papkalari kabi).
   O'zgartirish: papkani yangi repoga ko'chirish mumkin, hech narsa ildizga bog'liq emas.
2. **Next.js 15 (16 emas).** 16 da `middleware.ts` → `proxy.ts` ga o'zgargan va ekotizim hali yangi;
   15.5 barqaror va hujjatlari to'liq. Keyin ko'tarish oson.
3. **ESLint 9 / TypeScript 5 / Vitest 3.** Eng yangi major'lar (ESLint 10, TS 7) `eslint-config-next@15`
   bilan mos kelmasligi mumkin, shuning uchun mos versiyalar qotirildi.
4. **Supabase turlari qo'lda (generatsiya qilinmagan).** Bu muhitda Docker/Supabase CLI yo'q, shuning
   uchun `supabase gen types` ishlatilmadi; mijoz turlanmagan, qator turlari `src/lib/types.ts` da.
   Keyin: `supabase gen types typescript --linked > src/lib/database.types.ts` va mijozga ulash.
5. **Shriftlar tizimniki.** `next/font/google` build vaqtida tarmoq so'raydi — bepul/offline muhit uchun
   ishonchsiz. Keyin o'zgartirish mumkin.
