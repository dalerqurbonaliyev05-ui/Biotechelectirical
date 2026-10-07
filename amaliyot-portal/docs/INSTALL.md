# O'rnatish

Talablar: **Linux server** (Ubuntu 22.04/24.04 yoki shunga o'xshash), 2 yadro, 2 GB xotira, 20 GB disk (rasmlar ko'paysa
ko'proq). Ochiq portlar: 443 (HTTPS), 80 (HTTPS sertifikat olish/yo'naltirish uchun).

## A) Docker bilan (tavsiya)

Kerak: Docker Engine 24+ va Docker Compose v2.

```sh
git clone <loyiha manzili> amaliyot-portal && cd amaliyot-portal
cp .env.example .env
./scripts/gen-secrets.sh >> .env        # POSTGRES_PASSWORD, APP_DB_PASSWORD, JWT_SECRET, ACTIVATION_PEPPER
nano .env                               # kerak bo'lsa PUBLISH, HSTS, DOMAIN va boshqalarni to'g'rilang
docker compose up -d --build
docker compose ps                       # ikkala xizmat "healthy" bo'lishi kerak
docker compose exec app node src/cli.js create-admin --login admin --name "Familiya Ism"
```

`.env` faylini **zaxiralang va maxfiy saqlang**: `JWT_SECRET` yo'qolsa hamma qayta kiradi, `ACTIVATION_PEPPER` yo'qolsa
berilgan, lekin ishlatilmagan faollashtirish kodlari yaroqsiz bo'ladi (qayta chiqarish mumkin), `POSTGRES_PASSWORD`
yo'qolsa bazaga kirib bo'lmaydi.

Baza tashqariga **ochilmaydi** (portlar ko'rsatilmagan): unga faqat server konteyneri ulanadi.

### HTTPS

HTTPS **majburiy** (parollar va tokenlar tarmoq orqali yuboriladi). Ikki yo'l:

1. **Internetga ulangan server, domen nomi bor** — Caddy avtomatik sertifikat oladi:
   `.env` da `DOMAIN=amaliyot.example.uz`, `HSTS=1`, `TRUST_PROXY=1`, `PUBLISH=127.0.0.1:8080` qiling va
   `docker compose --profile https up -d`. Domen serverning IP manziliga yo'naltirilgan bo'lishi kerak.
2. **Yopiq tarmoq yoki o'z sertifikati** — nginx: `deploy/nginx.conf.example` namunasi. Sertifikatni tashkilotning
   o'z markazidan oling. `.env` da `TRUST_PROXY=1`, `HSTS=1`.

`TRUST_PROXY=1` faqat server **to'g'ridan-to'g'ri internetga ochiq bo'lmaganda** (proksi ortida) qo'yiladi — aks holda
kimdir `X-Forwarded-For` sarlavhasini soxtalashtirib, so'rovlar chegarasini aylanib o'tishi mumkin.

### Yangilash

```sh
git pull && docker compose up -d --build     # yangi migratsiyalar ishga tushishda avtomatik qo'llanadi
```
Yangilashdan oldin `./scripts/backup.sh` ni bajaring.

## B) Docker'siz

Kerak: Node.js 22+, PostgreSQL 15+.

```sh
# 1) Baza (postgres foydalanuvchisi nomidan)
sudo -u postgres createdb amaliyot
# 2) Kod
sudo mkdir -p /opt/amaliyot-portal /var/lib/amaliyot-portal && sudo cp -r . /opt/amaliyot-portal
cd /opt/amaliyot-portal/server && npm ci --omit=dev
# 3) Sozlamalar: /etc/amaliyot-portal.env (chmod 600), namuna — .env.example. Docker'siz kerakli o'zgaruvchilar:
#    DATABASE_ADMIN_URL=postgresql://postgres:PAROL@127.0.0.1:5432/amaliyot   (migratsiya uchun, superuser)
#    APP_DB_PASSWORD=...           (server roli `app` uchun yangi parol, >=12 belgi)
#    DATABASE_URL=postgresql://app:APP_DB_PASSWORD@127.0.0.1:5432/amaliyot
#    JWT_SECRET=...  DATA_DIR=/var/lib/amaliyot-portal  WEB_DIR=/opt/amaliyot-portal/web  PORT=8080
# 4) Xizmat
sudo useradd -r -s /usr/sbin/nologin amaliyot && sudo chown -R amaliyot /var/lib/amaliyot-portal
sudo cp deploy/amaliyot-portal.service.example /etc/systemd/system/amaliyot-portal.service
sudo systemctl daemon-reload && sudo systemctl enable --now amaliyot-portal
# 5) Birinchi administrator
cd /opt/amaliyot-portal/server && sudo -u amaliyot env $(grep -v '^#' /etc/amaliyot-portal.env | xargs) node src/cli.js create-admin --login admin --name "Familiya Ism"
```
Zaxira skriptlari (`scripts/backup.sh`) Docker uchun yozilgan; Docker'siz `pg_dump` va `DATA_DIR` papkasini nusxalang
(docs/ADMIN.md).

## Tekshirish

- `curl http://127.0.0.1:8080/api/health` → `{"ok":true}`
- Brauzerda kirish sahifasi ochiladi; admin bilan kirib, «Sozlamalar»da korxona nomi va rahbarni kiriting.
- Namunaviy ma'lumot (faqat sinov uchun): `docker compose exec app node src/cli.js seed-demo`.
