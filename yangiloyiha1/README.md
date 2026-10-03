# Amaliyot (RES) portali: veb-ilova

Statik sahifalar (Vercel'da joylashadi) + Supabase (baza, kirish, fayllar, server funksiyalari).

| Sahifa | Kim uchun | Nima qiladi |
|---|---|---|
| `login.html` | hamma | HEMIS ID yoki xodim logini + parol; talabani faollashtirish (kod bilan); vaqtinchalik parolni almashtirish |
| `talaba_portali.html` | talaba | davomat va brigada tarixi, topshiriq/e'lonlar, jarayon rasmlari, kundalik va hisobot PDF, tasdiqqa yuborish, takliflar |
| `res_panel.html` | RES rahbari | davomat va naryad belgilash, brigadalar, kundalik/hisobotni tasdiqlash (pechat va imzo), hisobotlar |
| `amaliyot_panel.html` | amaliyot rahbari | davomat nazorati, topshiriq va e'lonlar, HEMIS ro'yxatini yuklash, faollashtirish kodlari, amaliyot davrlari |
| `admin_panel.html` | administrator | xodimlarni yaratish/parol tiklash, talabalar, davrlar, e'lonlar, korxona sozlamalari |

Admin RES va amaliyot panellariga ham kira oladi.

## Tuzilishi
- `js/app.js`: Supabase ulanishi, kirish tekshiruvi (`requireRole`), umumiy interfeys (qobiq, modal, toast), tasdiq xeshi.
- `js/modules.js`: bir nechta panelda ishlatiladigan bo'limlar (talabalar/import, davrlar, e'lonlar, topshiriqlar).
- `js/import.js`: CSV/Excel'dan nusxa olingan jadvalni o'qish (toza mantiq, sinovlari bor).
- `js/pdf.js`: kundalik va hisobot PDF'lari. `js/pages/*.js`: har bir sahifaning mantig'i.
- `vendor/`: `supabase-js`, `jsPDF`, `autotable` (CDN'ga bog'liq emas). `assets/`: namunaviy pechat va imzo (SVG).
- Inline skript yo'q: qat'iy CSP (`<meta>` va `vercel.json` sarlavhasi).

## Pechat va imzo
`assets/pechat.svg` va `assets/imzo.svg` **o'ylab topilgan namunalar**. Rasmiy pechat va imzo tayyor bo'lganda shu ikki faylni (PNG/SVG, shaffof fon) almashtiring. Sozlamalar (korxona nomi, rahbar) adminda: «Sozlamalar».
PDF'ga pechat va imzo faqat RES rahbari tasdiqlagan **va** ma'lumotlar tasdiqdan keyin o'zgarmagan bo'lsagina qo'yiladi (tasdiq xeshi). PDF talaba brauzerida yaratiladi, shuning uchun hujjatning haqiqiyligi PDF pastidagi *tasdiq kodi* orqali tekshiriladi (RES panelida: Tasdiqlash → «Hujjat kodini tekshirish»).

## Sinash
`tests/ui/` papkasida: `npm install && npm test` (haqiqiy Chromium + xotiradagi soxta Supabase). Baza qoidalari (RLS) alohida: `supabase/` papkasi.
