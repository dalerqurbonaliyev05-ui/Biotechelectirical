# SmartEdu — interaktiv ta'lim tizimi (MVP)

Kafedra uchun bepul serverlarda ishlaydigan tizim: jonli ma'ruza (elektron doska + QR), nazorat/test,
laboratoriya va kitoblar bilan bog'lanish. Texnologiyalar: Next.js (App Router, TypeScript), Tailwind CSS,
Supabase (PostgreSQL, Auth, Realtime, Storage, RLS).

> Bu `Biotechelectirical` repozitoriysi ichidagi **alohida** loyiha (`smartedu/` papkasi). Ildizdagi
> EnergyVibe statik sayti unga bog'liq emas: `.vercelignore` orqali saytga joylanmaydi.

## Lokal ishga tushirish

Talab: Node.js 20+ (22 tavsiya), npm.

```bash
cd smartedu
npm install
cp .env.example .env.local   # keyin qiymatlarni to'ldiring
npm run dev                  # http://localhost:3000
```

Tekshiruvlar:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`.env.local` va har qanday kalitlar **hech qachon** gitga tushmaydi (`.gitignore`).

## Papka tuzilmasi

```
src/app/            sahifalar va API (App Router)
src/components/     umumiy komponentlar
src/lib/            mantiq: i18n, supabase mijozlari, ball hisoblash, tekshirish...
src/lib/i18n/uz.ts  BARCHA interfeys matnlari (bitta joyda)
supabase/           migratsiyalar, seed.sql, config.toml, SQL testlar
docs/               qarorlar (decisions.md), integratsiya kontrakti va h.k.
tests/              Vitest sinovlari
```

Keyingi bo'limlar (Supabase sozlash, joylash, cheklovlar) loyiha tugaganda shu faylda to'ldiriladi.
