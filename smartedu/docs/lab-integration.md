# Laboratoriya saytini SmartEdu bilan ulash (kontrakt)

3D laboratoriya (masalan `energyvibe.uz/laboratoriya/<sxema-id>`) talaba topshiriqni bajarganda natijani SmartEdu'ga
**imzolangan** so'rov bilan yuboradi. SmartEdu natijani saqlaydi va `lab_task` turidagi savolga avtomatik ball beradi.

## Umumiy oqim

1. O'qituvchi `lab_task` savoli yaratadi: `lab_id` = laboratoriyadagi sxema id (masalan `motor-01`), `max_points`.
2. Talaba nazoratda shu savolga yetganda **"Laboratoriyani ochish"** tugmasi chiqadi. Havola:
   `<LAB_BASE_URL>/<lab_id>?student=<talaba_kodi>&from=smartedu`
3. Talaba laboratoriyada topshiriqni bajaradi. Laboratoriya **serveri** (brauzer emas!) natijani imzolab yuboradi.
4. SmartEdu natijani qabul qiladi; talaba nazorat oynasiga qaytganda "Natija qabul qilindi: 8 / 10" ko'rinadi.
5. Talaba nazoratni topshirganda natija ballga aylanadi: `ball = max_points × (score / max_score)`.
   Natija kelmagan bo'lsa javob "tekshirilishi kerak" bo'lib qoladi (o'qituvchi qo'lda qo'yadi; kech kelgan natija
   baholash sahifasida ball sifatida taklif qilinadi).

## So'rov

```
POST https://<smartedu-sayt>/api/lab/submit
Content-Type: application/json
X-Signature: sha256=<hex>

{ ...tana... }
```

### Tana (JSON)

| Maydon         | Tur                                 | Izoh                                                          |
| -------------- | ----------------------------------- | ------------------------------------------------------------- |
| `student_code` | satr, 3–32                          | Talaba kodi (katta-kichik harfga bog'liq emas)                |
| `lab_id`       | satr, `[A-Za-z0-9._-]`, ≤ 100       | `lab_task` savolidagi `lab_id` bilan bir xil                  |
| `score`        | son, 0 ≤ score ≤ `max_score`        | Olingan ball                                                  |
| `max_score`    | son > 0                             | Maksimal ball                                                 |
| `passed`       | mantiqiy, ixtiyoriy                 | O'tdi/o'tmadi                                                 |
| `time`         | ISO 8601 (zona bilan) yoki epoch ms | Natija vaqti. **Server vaqtidan ±5 daqiqadan oshmasin**       |
| `nonce`        | satr, `[A-Za-z0-9_-]`, 8–64         | Har so'rov uchun **noyob** tasodifiy qiymat (replay himoyasi) |
| `details`      | obyekt, ixtiyoriy                   | Ixtiyoriy tafsilot (urinishlar, vaqt). Tana ≤ 8 KB            |

### Imzo

`X-Signature = "sha256=" + hex( HMAC-SHA256( LAB_SHARED_SECRET, <tananing AYNAN baytlari> ) )`

Muhim: imzo **yuborilayotgan matn bo'yicha** hisoblanadi — JSON'ni qayta tuzmang (probel/tartib o'zgarsa imzo buziladi).
`LAB_SHARED_SECRET` ni **faqat laboratoriya serveri** biladi (kamida 16 belgi, uzun tasodifiy qator). Brauzerga chiqarmang.

### Javoblar

| Kod                                            | Ma'nosi                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `200 {"ok":true,"duplicate":false,"id":"..."}` | Saqlandi                                                         |
| `200 {"ok":true,"duplicate":true}`             | Shu `nonce` avval qabul qilingan (tarmoq qayta urinishi xavfsiz) |
| `400 validation` / `bad_json` / `stale`        | Tana noto'g'ri / vaqt ±5 daqiqadan tashqarida                    |
| `401 bad_signature`                            | Imzo mos emas                                                    |
| `404 student_not_found`                        | Bunday faol talaba yo'q                                          |
| `413 too_large`                                | Tana 8 KB dan katta                                              |
| `429 rate_limited`                             | Juda ko'p so'rov (`Retry-After` sarlavhasi bilan)                |
| `503 not_configured`                           | SmartEdu'da `LAB_SHARED_SECRET` sozlanmagan                      |

## Namunalar

### curl (imzo `openssl` bilan)

```bash
BODY='{"student_code":"S001","lab_id":"motor-01","score":8,"max_score":10,"passed":true,"time":"2026-03-01T10:00:00Z","nonce":"Zk3p9QxA1mLw"}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$LAB_SHARED_SECRET" -hex | sed 's/^.* //')"
curl -i https://smartedu.example.uz/api/lab/submit \
  -H "Content-Type: application/json" -H "X-Signature: $SIG" --data-binary "$BODY"
```

### Node.js (laboratoriya serveri / Vercel funksiyasi)

```js
import { createHmac, randomBytes } from 'node:crypto'

const body = JSON.stringify({
  student_code,
  lab_id: 'motor-01',
  score,
  max_score: 10,
  passed: score >= 6,
  time: new Date().toISOString(),
  nonce: randomBytes(12).toString('base64url'),
})
const signature =
  'sha256=' + createHmac('sha256', process.env.LAB_SHARED_SECRET).update(body, 'utf8').digest('hex')
const res = await fetch(`${process.env.SMARTEDU_URL}/api/lab/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
  body,
})
```

### Python

```python
import hmac, hashlib, json, os, secrets, datetime, requests
body = json.dumps({"student_code": code, "lab_id": "motor-01", "score": 8, "max_score": 10,
                   "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   "nonce": secrets.token_urlsafe(12)}, separators=(",", ":"))
sig = "sha256=" + hmac.new(os.environ["LAB_SHARED_SECRET"].encode(), body.encode(), hashlib.sha256).hexdigest()
requests.post(f"{os.environ['SMARTEDU_URL']}/api/lab/submit", data=body.encode(),
              headers={"Content-Type": "application/json", "X-Signature": sig})
```

### Tayyor sinov skripti

```bash
LAB_SHARED_SECRET=... node scripts/lab-sign.mjs --url http://localhost:3000/api/lab/submit --code S001 --lab motor-01 --score 8 --max 10
```

## Xavfsizlik modeli va cheklovlar

- **Faqat imzolangan so'rov qabul qilinadi.** Imzo JSON tahlilidan OLDIN, vaqt-doimiy taqqoslash bilan tekshiriladi.
  Sir yo'q/qisqa bo'lsa (`< 16` belgi) endpoint 503 qaytaradi (fail-closed).
- **Replay:** `time` ±5 daqiqa + `nonce` DB'da unikal. Qayta yuborilgan so'rov ikkinchi marta hisoblanmaydi.
- **Talabani kim ekani:** `student_code` laboratoriya saytidan keladi (havoladagi `?student=`). Laboratoriya serveri uni
  talaba o'zi kiritgan/URL'dan olgan holda ishonadi — ya'ni talaba boshqa talaba kodi bilan natija yuborishi mumkin
  (o'ziga foyda yo'q, lekin o'rtoqqa "ball" berish mumkin). Kuchaytirish: SmartEdu imzolagan qisqa muddatli
  "ishga tushirish tokeni" (kod + nazorat + muddat) havolaga qo'shilib, laboratoriya serveri uni tekshiradi
  (`docs/roadmap.md`). Hozircha o'qituvchi baholashda natijani ko'ra oladi.
- **Ball oynasi:** natija nazorat OCHILGANIDAN keyin kelgan bo'lsa hisobga olinadi (eski natijadan qayta foydalanib
  bo'lmasin). Bir `lab_id` bo'yicha eng yaxshi natija (ball/maks nisbati) olinadi.
- **Maxfiylik:** `details` ga shaxsiy ma'lumot yozmang.

## Kitoblar bilan bog'lanish

Savolga `book_ref = {slug, page}` qo'yiladi. Natijalar sahifasida "Bu mavzuni kitobning N-betida o'qing" havolasi
`BOOKS_BASE_URL/#/kitob/<slug>/<bet>` ga olib boradi (`slug` = kutubxonadagi kitob id, ya'ni PDF fayl nomi).
`BOOKS_BASE_URL` — `.env` da; boshqa kutubxona formati uchun faqat `src/lib/books.ts` o'zgaradi.
