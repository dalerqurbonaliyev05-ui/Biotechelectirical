# Energy Grid Simulator v2

Butun mamlakat miqyosidagi energotizimning o‘quv simulyatori. Ikki sharoit: **O‘zbekiston (2026)** va **Yevropa (EU o‘rtacha tarkibi, O‘zbekistonga teng masshtabda)**. Interfeys: UZ / RU / EN.

## Fayllar
| Fayl | Vazifasi |
|---|---|
| `index.html` | sahifa tuzilishi |
| `style.css` | dizayn (bosh sahifa uslubida) |
| `scenarios.js` | ikki stsenariy: stansiyalar, iste’molchilar, iqlim, narxlar |
| `engine.js` | hisoblash dvigateli (DOM’siz, Node’da ham ishlaydi) |
| `app.js` | interfeys: kartalar, grafik, oqim sxemasi, o‘quv jadvali |
| `i18n.js` | tarjimalar |

Server kerak emas — `index.html` ni brauzerda ochish kifoya.

## Manbalar (stansiyalar)
- **O‘zbekiston:** quyosh 4,5 GW, shamol 1,9 GW, GES 2,2 GW, bug‘-gaz qurilmalari 8 GW, eski gaz bloklari 4,5 GW, IEM 1 GW, ko‘mir 2 GW, gaz-porshenli pikerlar 1,2 GW, akkumulyatorlar 0,5 GW / 1,5 GWh, import 1,5 GW, AES (Jizzax, 2,1 GW — reja, standart holatda o‘chirilgan).
- **Yevropa:** quyosh 13 GW, quruqlik shamoli 4,6 GW, dengiz shamoli 0,6 GW, GES 3,3 GW, AES 3 GW, biomassa 1,4 GW, ko‘mir 2,9 GW, bug‘-gaz 4,7 GW, gaz turbinali pikerlar 1,5 GW, akkumulyatorlar 1,2 GW, GAES 1,5 GW, qo‘shni tarmoqlar 3 GW.

## Iste’molchilar (9 guruh)
Aholi, isitish/konditsioner (Yevropada issiqlik nasoslari), sanoat, savdo va xizmatlar, sug‘orish nasoslari (Yevropada qishloq xo‘jaligi), transport, shifoxona/suv/aloqa, ma’lumot markazlari va mayning, ko‘cha yoritgichlari. Har birining soatlik profili, fasl va dam olish kuni ta’siri, prioriteti bor.

## Model
- 24 soat, 15 daqiqalik qadam; fasl, ob-havo (quyoshli / bulutli / shamolli / shamolsiz), ish kuni / dam olish.
- **Real tarmoq rejimi:** barcha stansiyalar umumiy tarmoqqa beradi. Dispetcher merit-order bo‘yicha (avval quyosh va shamol, keyin arzon manbalar) ishlaydi; AES, ko‘mir, IEM texnik minimum va ramp cheklovlariga ega; akkumulyator/GAES sof yuklama past bo‘lganda zaryadlanadi, cho‘qqida beradi; ortiqcha energiya eksport qilinadi yoki cheklanadi; taqchillikda chastota tushadi va UFLS yuklamani prioritet bo‘yicha o‘chiradi.
- **O‘quv jadvali rejimi:** manba → iste’molchi jadvalini qo‘lda to‘ldirish (avtomatik rejim ham bor).
- Ko‘rsatkichlar: talab, ishlab chiqarish, chastota, aylanma zaxira (N-1), marjinal narx, CO₂ intensivligi, qayta tiklanuvchi ulush, o‘chirilgan yuklama; kunlik hisobot va 24 soatlik stek grafigi.
- Sinov: gaz ta’minoti slideri (qishki tanqislik), N-1 avariya tugmasi, har bir stansiya quvvatini o‘zgartirish, iste’molchi talabini 0–200%.

## Kalibrlash
- O‘zbekiston: yozgi cho‘qqi ≈13,6 GW (2025-yil iyul rekordi 13,3 GW), qishki ≈13,5 GW, yiliga ≈86 TWh, qayta tiklanuvchi ulush ≈23%.
- Yevropa: Ember 2025 ulushlari (quyosh ≈13%, shamol ≈17%, gaz ≈17%, ko‘mir ≈9%, AES ≈24%) ga yaqinlashtirilgan; EU ETS ≈85 €/t.

Qiymatlar taxminiy va o‘quv maqsadida. Haqiqiy tarmoqda quvvat Kirxgof qonunlari bo‘yicha taqsimlanadi, liniya va kuchlanish cheklovlari ham hisobga olinadi.
