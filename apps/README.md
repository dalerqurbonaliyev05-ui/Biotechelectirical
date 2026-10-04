# Uy ovqatlari bozori: ilovalar

Uchta Android ilovasi (React + Vite + TypeScript + Capacitor) va umumiy kutubxona. Backend: Supabase (Auth, Postgres, Realtime, Storage).
Admin panel alohida ilova emas: saytning `/admin/` sahifasi (`../admin/`).

| Papka | Vazifasi |
|---|---|
| `shared/` | Dizayn-tokenlar (`styles/tokens.css`), komponentlar, types, Supabase mijozi, auth, status mantig'i |
| `buyer/` | Xaridor: taom qidirish/kategoriya, savat, buyurtma, realtime kuzatuv, sharh |
| `seller/` | Sotuvchi: taomlar, buyurtmalarni qabul/rad, daromad va bonus progressi |
| `courier/` | Kuryer: xarita, bo'sh/band, avtomatik biriktirilgan buyurtma, yetkazish bosqichlari |

## Ishga tushirish
```bash
cd apps/buyer          # yoki seller / courier
npm install            # npm workspaces: shared bilan birga o'rnatiladi
npm run dev            # http://localhost:5171 (seller 5172, courier 5173)
npm run build          # tsc + vite build -> dist/
npx cap sync android   # dist -> android/ (APK uchun Android SDK + JDK 17 kerak)
cd android && ./gradlew assembleDebug
```
Supabase ulanishi `shared/src/config.ts` (yoki `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, `.env.example`).

## Supabase'ni tayyorlash (bir marta)
1. `supabase/migrations/0005`, `0006`, `0007` (`uyovqat`) ni tartib bilan qo'llang. Tafsilot: `../supabase/README.md`.
2. Authentication → Providers → Email: ilovalar email + parol bilan ishlaydi. Email tasdiqlash yoqilgan bo'lsa, ro'yxatdan o'tgach xatdagi havolani bosish kerak (ilova shuni aytadi).
3. Birinchi adminni belgilang: ro'yxatdan o'ting (masalan xaridor ilovasida), so'ng SQL Editor'da
   `update public.uy_profiles set role = 'admin' where id = '<auth.users id>';` va `/admin/` ga shu email bilan kiring.
4. Admin panel → Sozlamalar: yetkazish narxi, platforma ulushi, bonus qoidasi (hozir har 50 buyurtmaga 5%, vaqtinchalik qiymat).

## Qanday ishlaydi
- Sotuvchi buyurtmani qabul qilganda trigger sotuvchi joylashuviga (Haversine) eng yaqin **bo'sh** kuryerni avtomatik biriktiradi. Bo'sh kuryer bo'lmasa, kuryer bo'shaganda/joylashuvi yangilanganda qayta uriniladi. Sotuvchi profilida joylashuv belgilangan bo'lishi shart.
- Holatlar faqat server RPC'lari orqali o'zgaradi (`uy_seller_set_status`, `uy_courier_set_delivery`, `uy_cancel_order`); mijoz jadvalga to'g'ridan-to'g'ri yoza olmaydi.
- Yetkazilganda sotuvchiga daromad (`seller_earnings`) yoziladi va bonus qoidalari (`bonus_rules`) tekshiriladi.
- Karta to'lovi: onlayn to'lov shlyuzi (Payme/Click) ulanmagan; hozircha to'lov usuli buyurtmada belgilanadi, to'lov yetkazishda amalga oshadi.

## Sinov
`tests/uyovqat/`: haqiqiy Chromium + soxta Supabase (`npm install && npm test`, avval uchala ilovani `npm run build` qiling).
