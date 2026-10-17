# «Susambil» multfilmi — ish holati

> Suhbat uzilsa, shu fayldan davom ettiriladi. Har bosqichdan keyin yangilanadi.

**Oxirgi yangilanish:** 2026-10-17
**Hozirgi bosqich:** 2-bosqich (qahramonlar) — **Eshak tasdiq kutmoqda**

## Asosiy havolalar

- Figma fayli: https://www.figma.com/design/95y1kKJ0CQnn0EhpFmtyld (fayl kaliti: `95y1kKJ0CQnn0EhpFmtyld`)
- Figma sahifalari: `Qahramonlar` (0:1), `Fonlar` (1:2), `Buyumlar` (1:3)
- Palitra ramkasi: `Palitra` (2:25), Qahramonlar sahifasida
- Ranglar to'plami (Figma o'zgaruvchilari): `Susambil palitra` (VariableCollectionId:2:2) + `Palitra/...` rang stillari
- Ssenariy: [storyboard.md](storyboard.md)
- Palitra (kod uchun): [palitra.json](palitra.json)

## Vositalar (2026-10-17 tekshiruvi)

| Vosita | Holat |
|---|---|
| Figma ulanishi | ✅ ishlaydi (Daler Qurbonaliyev's team, Full seat, Starter tarif) |
| Node.js | ✅ v22.22.0, npm 10.9.4 |
| ffmpeg / ffprobe | ✅ 6.1.1 |
| ElevenLabs | ✅ ulangan; 9 ta o'zbekcha ovoz bor. Tarif va kredit miqdori hali tekshirilmagan (5-bosqichda) |

**Eslatma:** Figma serveridan rasmni `curl` bilan yuklab olish tarmoqda bloklangan (figma.com). Skrinshotlar Figma ichidan olinadi; eksport (4-bosqich) SVG matni orqali qilinadi.

## Qahramonlarni chizish usuli

1. Qahramon `manba/qahramonlar/<nom>.mjs` faylida SVG qatlamlar sifatida yoziladi (palitra nomlari bilan).
2. Tekshirish: `node manba/vosita/render.mjs <nom>` → `chiqish/<nom>/` (PNG, git'ga kirmaydi).
3. Figma kodi: `node manba/vosita/figma_kod.mjs <nom> yon|old|ifodalar` → `use_figma` orqali joylanadi.
4. Qatlamlar ro'yxati va aylanish nuqtalari: `node manba/vosita/manifest.mjs <nom>` → `qatlamlar/<nom>.json`.
5. Figma'da: bo'lim (Section) `<Nom>` ichida `<nom>_yon`, `<nom>_old` (shaffof kadr) va `<nom>_ifodalar` varag'i. Har kadrda yashirin `_pivotlar` guruhi bor.

**Muhim texnik eslatma:** Figma'da rangni o'zgaruvchiga bog'laganda shaffoflik 100% ga qaytadi — `figma_kod.mjs` buni avtomatik tiklaydi.

## Uslub qoidalari

- Yassi (flat) vektor, yumshoq yumaloq shakllar, qalin konturlarsiz, issiq ranglar.
- Faqat palitradagi 10 rang. Soya = `toq` 22% shaffof, yorug'lik = `qaymoq` 45% shaffof.
- Qatlam nomlari: kichik harflar, bo'sh joysiz (`eshak_bosh`, `eshak_quloq_chap` ...).

## Bosqichlar

| # | Bosqich | Holat |
|---|---|---|
| 1 | Figma fayli, sahifalar, palitra | ✅ tasdiqlandi |
| 2 | Qahramonlar (9 ta, birma-bir) | 🟡 jarayonda |
| 3 | Fonlar F1–F8 va buyumlar | ⏳ |
| 4 | Animatsiya (Remotion), 34 klip | ⏳ |
| 5 | Ovoz (ElevenLabs sinovi) | ⏳ |
| 6 | `ovoz_matni.md` | ⏳ |
| 7 | `canva_uchun/` va `CANVA_QOLLANMA.md` | ⏳ |

## Qahramonlar

| # | Qahramon | Holat |
|---|---|---|
| 1 | Eshak | 🟡 tasdiq kutmoqda (Figma bo'limi `Eshak`, 3:2) |
| 2 | Ho'kiz | ⏳ |
| 3 | Xo'roz | ⏳ |
| 4 | Kalamush 1 va 2 | ⏳ |
| 5 | Ari | ⏳ |
| 6 | Boy | ⏳ |
| 7 | Qo'shni xotin | ⏳ |
| 8 | Bo'rilar podshosi | ⏳ |
| 9 | Hovliqma bo'ri 1 va 2 | ⏳ |

## Fonlar

F1 ⏳ · F2 ⏳ · F3 ⏳ · F4 ⏳ · F5 ⏳ · F6 ⏳ · F7 ⏳ · F8 ⏳ · Buyumlar ⏳
