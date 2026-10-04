# Uy taomlari: 30 soniyalik reklama videosi (Remotion)

Vertikal **1080×1920 (9:16)**, **30 soniya, 30 fps**: TikTok / Instagram Reels / YouTube Shorts uchun. React + TypeScript (Remotion 4).
Ilovalardagi bilan bir xil brend rangi (to'q sariq `#ff6a13`) va Manrope shrifti.

## Ishga tushirish
```bash
cd media/promo-video
npm install
npm run preview        # Remotion Studio: lokal ko'rish, matn va ranglarni jonli o'zgartirish (Props paneli)
npm run render         # -> out/uyovqat-promo.mp4
npm run still          # -> out/poster.png (120-kadr)
node scripts/stills.mjs 30 150 300   # tanlangan kadrlarni PNG qilib ko'rish
```
Birinchi renderda Remotion o'zi Chrome yuklab oladi (internet kerak). Tayyor brauzeringiz bo'lsa:
`npx remotion render src/index.ts PromoVideo out/uyovqat-promo.mp4 --browser-executable=/yo'l/chrome`.

## Sahnalar (storyboard)
| Sahna | Vaqt | Fayl | Mazmuni |
|---|---|---|---|
| 1 | 0–3 s | `scenes/Scene1.tsx` | Brend nomi + slogan, bug'li kosa, aylanuvchi taomlar |
| 2 | 3–8 s | `scenes/Scene2.tsx` | Xaridor ilovasi: kategoriyalar (suyuq/xamirli), mastavaga 10 kishiga buyurtma |
| 3 | 8–13 s | `scenes/Scene3.tsx` | Promokod yoziladi, narx pasayadi, `−10%` stikeri |
| 4 | 13–18 s | `scenes/Scene4.tsx` | Sotuvchiga "Yangi buyurtma!" bildirishnomasi, qabul qilish |
| 5 | 18–24 s | `scenes/Scene5.tsx` | Eng yaqin kuryer avtomatik biriktiriladi, yo'l chiziladi, taom yetib keladi |
| 6 | 24–28 s | `scenes/Scene6.tsx` | Yetkazildi, 5 yulduz, qoniqish + konfetti |
| 7 | 28–30 s | `scenes/Scene7.tsx` | 3 ta ilova belgisi + "energyvibe.uz'dan yuklab oling" |

Sahna chegaralari `src/theme.ts` dagi `SCENES` da. Har sahna oldingisi ustiga doira ("iris") bo'lib ochiladi (`OVERLAP` = 10 kadr).

## Matn, rang va ma'lumotlarni o'zgartirish
Hammasi **props** orqali: `src/theme.ts` → `defaultProps` (yoki Studio'dagi Props paneli):
brend nomi va slogan (`brandName`, `slogan`), har sahna sarlavhalari (`orderTitle1/2`, `promoTitle1/2`, …), `ctaText`, taom (`dish`, `people`, `pricePerPerson`),
promokod (`promoCode`, `discountPercent`), ranglar (`accent`, `accentDark`, `accentSoft`, `ink`, `cream`).
Narxlar va chegirma avtomatik hisoblanadi (ilovadagi formula bilan bir xil: 250 000 − 10% + 8 000 = 233 000).

## Musiqa va ritm
`bpm` (standart 120): pop-animatsiyalar, fon shakllari va CTA tugmasi har beat'da "uradi" (120 BPM = har 15 kadr). Sahna chegaralari ham 15 kadrning ko'paytmasida.
Musiqa qo'shish: faylni `public/` ga qo'ying va `audioSrc` ga nomini yozing. Batafsil: `public/README.md`.

## Haqiqiy ilova skrinshotlari
Hozir telefon ichidagi interfeys kod bilan chizilgan (`src/components/ui.tsx`, ilovalar dizayn-tokenlari bilan). Haqiqiy skrinshotlar qo'yish uchun `screens` proplariga qarang (`public/README.md`).

## Tuzilma
```
src/
  index.ts, Root.tsx        Composition (1080x1920, 900 kadr, 30 fps), props sxemasi (zod)
  PromoVideo.tsx            Sahnalarni birlashtirish, audio
  theme.ts                  O'lchamlar, sahna vaqtlari, props sxemasi va standart qiymatlar
  anim.tsx                  Pop/PopWords (spring), IrisIn, Confetti, beat yordamchilari
  scenes/Scene1..7.tsx      Har bir sahna alohida komponent
  components/Phone.tsx      Telefon ramkasi (390x844 interfeysni masshtablaydi / skrinshot)
  components/ui.tsx         Ilova ekranlari: xaridor, sotuvchi, kuryer
  components/MapSvg.tsx     Xarita, belgilar, kuryer yo'li (@remotion/paths)
  components/Food.tsx       Tarelka, kosa + bug', ilova belgisi, kulgich
  components/Layout.tsx     Fon, sarlavha bloki, stiker
```
