# Kutubxona (kitoblar) bilan integratsiya

SmartEdu kutubxonani **ichki ravishda emas, havola va ramka (iframe) orqali** ishlatadi. Kutubxona kodi (`/kutubxona/`) o'zgartirilmaydi;
quyidagi shartnoma shu paytda kutubxona qanday ishlashiga tayanadi.

## 1. Chuqur havola formati (hozir mavjud)

```
<BOOKS_BASE_URL>/#/kitob/<id>[/<bet>]
```

- `BOOKS_BASE_URL` — `.env` (standart `https://energyvibe.uz/kutubxona`).
- `<id>` — `books.json` dagi kitob `id` (masalan `elektr-qurilmalari-qoidalari`); `<bet>` — ixtiyoriy, 1 dan boshlanuvchi butun son.
- Havola formati **faqat** `src/lib/books.ts` (`bookUrl`) da; kutubxona o'zgarsa faqat shu funksiya o'zgaradi.

## 2. Kitob ma'lumoti (`books.json`)

`{ categories: [{id, name}], books: [{ id, title, code, category, publisher, description, ... }] }`. SmartEdu **hozircha uni o'qimaydi**:
o'qituvchi kitobni `slug` (= `id`) va nom bilan qo'lda kiritadi (ma'ruza muharriri → slayd ostidagi 📖). Kelajakda avtomatik qidiruv uchun
quyidagi API shartnomasi taklif etiladi (kutubxonada **hali yo'q**):

| Talab                             | Tavsif                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET <BOOKS_BASE_URL>/books.json` | CORS: `Access-Control-Allow-Origin: <smartedu-sayt>`; `id` o'zgarmas va noyob                                           |
| Chuqur havola                     | yuqoridagi format barqaror saqlanadi; `#/kitob/<id>/<bet>` darhol shu betni ochadi                                      |
| Ixtiyoriy `?embed=1`              | ramka ichida ortiqcha menyu/sarlavhani yashiradi (hozir qo'llab-quvvatlanmaydi — kitob to'liq interfeys bilan ochiladi) |

## 3. Doskada ko'rsatish (iframe qatlami)

- Joriy slaydga kitob biriktirilgan bo'lsa, doska pastki panelida 📖 tugma(lar)i chiqadi (yoki klaviatura `B`). Bosilsa, slayd ostida (pastki ~62%)
  qatlam ochiladi: ichida `<iframe src=chuqur-havola>`, tepada **"Yangi oynada ochish"** va **"Yopish"**. Slayd almashsa qatlam yopiladi.
- Iframe `sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"`, `referrerpolicy="no-referrer"`; havola faqat `http(s)` bo'lsa ochiladi.
- SmartEdu CSP: `frame-src <BOOKS_BASE_URL origini>` (faqat shu manzil; boshqa ramka yo'q). `BOOKS_BASE_URL` o'zgarsa **qayta build** qiling.

### Kutubxona tomonidan talab (aks holda ramka bo'sh qoladi)

Kutubxona sahifasi SmartEdu domenida ramkaga olinishi kerak:

- javobda `X-Frame-Options: DENY/SAMEORIGIN` **bo'lmasin**, yoki
- `Content-Security-Policy: frame-ancestors 'self' https://<smartedu-sayt>` bo'lsin.

Hozirgi `energyvibe.uz` `vercel.json` da `/kutubxona/` uchun ramkani bloklovchi sarlavha **yo'q** (boshqa bo'limlarda — `/admin/` va h.k. — bor);
shu sababli ramka ishlashi kerak, lekin **haqiqiy brauzerda tekshirilmagan**. Brauzer ramka bloklanganini sahifaga bildirmaydi, shuning uchun
"Yangi oynada ochish" havolasi doim ko'rinib turadi (zaxira).

## 4. Laboratoriya endpointi (eslatma)

Laboratoriya → SmartEdu natija yuborish (`POST /api/lab/submit`, HMAC imzo) o'zgarmagan; kontrakti `docs/lab-integration.md` da.

## 5. Cheklovlar

- Kitob PDF'lari katta bo'lishi mumkin: sekin internetda ramka kech ochiladi (doska uchun kuchli ulanish tavsiya etiladi).
- Kitoblar talaba telefonida ko'rsatilmaydi (faqat doskada); talaba kutubxonaga o'zi kiradi.
