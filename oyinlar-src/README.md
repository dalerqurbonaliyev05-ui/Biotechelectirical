# Milliy o'zbek o'yinlari (`/oyinlar/`)

Next.js 16 (App Router, TypeScript, CSS Modules) bo'limi. **Serversiz**: barcha o'yin mantig'i brauzerda,
natijalar `localStorage` da. Asosiy sayt build bosqichisiz statik HTML bo'lgani uchun bu loyiha
`output: "export"` + `basePath: "/oyinlar"` bilan statik fayllarga yig'iladi va `../oyinlar/` ga
ko'chiriladi (xuddi `fizika-src/` → `fizika/` kabi).

## Buyruqlar

```bash
npm install
npm run dev        # http://localhost:3000/oyinlar/
npm run lint
npm run typecheck
npm run deploy     # next build + out/ -> ../oyinlar/ (shu papkani commit qiling)
```

## Tuzilma

```
app/                       marshrutlar: /, /besh-tosh, ..., /yutuqlar, /reyting (har birida metadata)
components/games/<nom>/    o'yinlar (canvas yoki DOM + CSS)
components/games/GameShell O'ynash | Qoidalari | Tarixi tablari, rekord, natija oynasi
components/games/common/   Quiz, Stick (SVG figura)
lib/games/                 storage, audio (Web Audio sintez), hooks (rAF sikl), progress,
                           achievements (26 nishon), leaderboard (LocalLeaderboard + Supabase uchun interfeys)
lib/i18n/                  uz.ts, ru.ts, en.ts + useT(); til kaliti asosiy sayt bilan umumiy ("energyvibe-lang")
data/                      katalog, qoidalar/tarix matnlari (3 til), viktorinalar, topishmoqlar, maqollar
```

## Keyingi bosqich (TODO)

- `SupabaseLeaderboard` — `lib/games/leaderboard.ts` dagi `Leaderboard` interfeysini amalga oshirish
  (natijani serverda tekshirish, RLS) va `leaderboard` eksportini almashtirish.
- Onlayn 1v1 (Arqon tortish, Oshiq, Oq terak) — hozir faqat bitta qurilmada 2 kishi.
