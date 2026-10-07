# Amaliyot portali (RES) — mustaqil, ko'chirib o'tkaziladigan versiya

Elektr ta'minoti kafedrasi talabalarining RES (korxona)dagi amaliyotini yuritish tizimi: davomat va naryad, brigadalar,
kundalik va hisobot (PDF), korxona rahbari tasdig'i (pechat va imzo bilan), topshiriqlar, e'lonlar, rasmlar.

Bu versiya **hech qanday bulut xizmatiga bog'liq emas** (Supabase, Vercel, Firebase va hokazo yo'q). Hamma narsa
o'z serverida ishlaydi: bitta Node.js jarayoni + PostgreSQL. Oliy ta'lim vazirligi yoki universitet uni o'z
serveriga o'rnatib, to'liq nazorat qila oladi.

## Tarkibi

| Papka | Vazifasi |
|---|---|
| `server/` | Node.js serveri (kirish, rollar, ma'lumotlar shlyuzi, rasm saqlash, boshqaruv). Yagona tashqi kutubxona: `pg`. |
| `web/` | Brauzer sahifalari (build bosqichi yo'q; oddiy HTML/JS/CSS). Tashqi manbalardan hech narsa yuklanmaydi. |
| `db/migrations/` | PostgreSQL sxemasi va qator darajasidagi xavfsizlik (RLS) qoidalari. |
| `deploy/` | Docker kirish skripti, HTTPS (Caddy/nginx) va systemd namunalari. |
| `scripts/` | Maxfiy qiymatlar yaratish, zaxira nusxa olish va tiklash. |
| `tests/e2e/` | Brauzer sinovlari (haqiqiy Chromium + server + PostgreSQL). |
| `docs/` | Hujjatlar (pastda). |

## Tez boshlash (Docker)

```sh
cp .env.example .env
./scripts/gen-secrets.sh >> .env       # tasodifiy parollar va kalitlar
docker compose up -d --build           # baza + server (migratsiyalar avtomatik)
docker compose exec app node src/cli.js create-admin --login admin --name "F.I.SH"
```
Brauzerda `http://SERVER:8080` ni oching, chiqqan vaqtinchalik parol bilan kiring (birinchi kirishda almashtiriladi).
Ishlab chiqarishda HTTPS shart: [docs/INSTALL.md](docs/INSTALL.md).

## Hujjatlar

- [docs/INSTALL.md](docs/INSTALL.md) — o'rnatish (Docker va Docker'siz), HTTPS, yangilash
- [docs/ADMIN.md](docs/ADMIN.md) — kundalik boshqaruv: foydalanuvchilar, talabalar importi, zaxira, nosozliklarni bartaraf etish
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — tuzilma va **xavfsizlik** (tahdidlar, himoya qatlamlari, ma'lum cheklovlar)
- [docs/HEMIS.md](docs/HEMIS.md) — HEMIS bilan integratsiya (CSV hozir ishlaydi; API ulash tartibi va HEMIS administratoriga savollar)
- [docs/HANDOVER.md](docs/HANDOVER.md) — topshirish ro'yxati: nima sinalgan, nima sinalmagan, qaror kutayotgan masalalar

## Sinovlar

```sh
# PostgreSQL ishlayotgan bo'lishi kerak (superuser ulanishi):
export TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres
cd server && npm ci && npm test                 # server: 60 ta sinov (kirish, RLS rollar matritsasi, import, rasm, xavfsizlik, HEMIS)
cd ../tests/e2e && npm ci && npm test           # brauzer: 48 ta sinov (Chromium kerak: CHROMIUM_PATH)
```
Har bir sinov faylida vaqtinchalik baza yaratiladi va o'chiriladi; ishlab chiqarish bazasiga tegilmaydi.
