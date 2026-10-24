# Kelajak loyihalari (`/kelajak/`)

EnergyVibe saytining alohida bo‘limi: bosh sahifadagi “Kelajakdagi loyihalar” uchun 7 qadamli interaktiv o‘quv sahifalari
(animatsiya + jonli simulyator + formulalar + xatolar + mini-quiz + XP/nishon). Next.js 16 (App Router, statik eksport).

```bash
npm install
npm run dev        # http://localhost:3000/kelajak/
npm run lint && npm run typecheck && npm test
npm run deploy     # build + ../kelajak/ ga nusxalash (Vercel shu papkani beradi)
```

- Kontent: `content/future/<slug>.ts` (sxema — `content/future/types.ts`), ro‘yxat — `content/future/index.ts`.
- Umumiy shablon: `components/template/*` (hero, progress, qadam bloklari, quiz, laboratoriya UI, canvas sikli).
- Qadam vizual/simulyatorlari: `components/projects/<slug>/*`, `components/projects/registry.tsx` orqali lazy yuklanadi.
- Hisob-kitoblar: `lib/physics/*.ts` (sof funksiyalar), testlari `tests/*.test.ts` (`node --test`).
- Yangi loyiha: kontent faylini yozing va `PROJECTS` ga qo‘shing; vizual/simulyatorlar ixtiyoriy.
- Kutubxonalar qo‘shilmagan: animatsiya SVG + CSS, simulyatorlar canvas + requestAnimationFrame (ekrandan chiqqanda to‘xtaydi),
  grafiklar o‘zimizning SVG/canvas, formulalar Unicode. `prefers-reduced-motion` hurmat qilinadi.
- `kelajak-src/` Vercel'ga yuklanmaydi (`.vercelignore`), faqat tayyor `kelajak/` chiqishi.
