# Fizika tarixi (`/fizika-tarixi/`)

EnergyVibe saytining alohida bo‘limi: fizika tarixi xronologiyasi, olimlar va 6 ta interaktiv tajriba.
Dizayn: Figma `GGWFLkoWnrTCJezPYnaCxA`. Next.js 16 (App Router, statik eksport), UZ/RU/EN — asosiy saytdagi `energyvibe-lang` bilan umumiy.

```bash
npm install
npm run dev        # http://localhost:3000/fizika-tarixi/
npm run lint && npm run typecheck
npm run deploy     # build + ../fizika-tarixi/ ga nusxalash (Vercel shu papkani beradi)
```

- Matnlar: `lib/i18n/{uz,ru,en}.ts` (kalitlar soni teng bo‘lishi shart), kontent: `data/*.ts` (uch tilli).
- Tajribalar: `components/experiments/*` (canvas), ro‘yxat/meta: `data/experiments.ts`.
- `fizika-tarixi-src/` Vercel'ga yuklanmaydi (`.vercelignore`), faqat tayyor `fizika-tarixi/` chiqishi.
