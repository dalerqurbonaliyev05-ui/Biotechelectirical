# Boshqaruv qo'llanmasi

## Rollar

| Rol | Nima qila oladi |
|---|---|
| **Talaba** | O'z davomati, naryadi, topshiriq va e'lonlarni ko'radi; rasm yuklaydi; kundalik/hisobot PDF yuklaydi; tasdiqlashga yuboradi; taklif yozadi. |
| **RES rahbari** (korxona boshlig'i) | Davomat va naryad belgilaydi; brigadalarni yuritadi; kundalik/hisobotni tasdiqlaydi yoki rad etadi (tasdiqlanganda hujjatga pechat va imzo tushadi); hisobotlar. |
| **Amaliyot rahbari** (kafedra o'qituvchisi) | Talabalar ro'yxatini yuklaydi, faollashtirish kodi beradi, **talabaning** parolini tiklaydi; topshiriq, e'lon, amaliyot davrlari; nazorat. |
| **Administrator** | Hammasi + xodimlar hisobini yaratish/tiklash/o'chirish, sozlamalar, audit jurnali. |

## Foydalanuvchilar

- **Xodim yaratish**: Administrator paneli → Xodimlar. Tizim vaqtinchalik parol beradi (faqat bir marta ko'rinadi);
  xodim birinchi kirishda uni almashtiradi.
- **Parol unutildi**: administrator (xodim uchun) yoki amaliyot rahbari (talaba uchun) «Parolni tiklash» ni bosadi →
  yangi vaqtinchalik parol; eski sessiyalar yopiladi. (E-pochta orqali tiklash yo'q: tashqi xizmatga bog'lanmaslik uchun.)
- **Hisobni o'chirish**: «Faolsizlantirish» — kirish darhol (≤3 soniya) to'xtaydi; ma'lumotlar saqlanadi.
- **Buyruq qatori**: `docker compose exec app node src/cli.js` → `create-admin`, `create-user`, `reset-password`, `list-users`.
  Administrator parolini yo'qotsa shu yerdan tiklanadi.
- Bir foydalanuvchi 10 marta noto'g'ri parol kiritsa, hisob 15 daqiqaga bloklanadi (sozlanadi: `.env`).

## Talabalarni yuklash va faollashtirish

1. Amaliyot rahbari paneli → **Talabalar** → ro'yxatni (HEMIS'dan Excel/CSV) joylashtiring: ustunlar `HEMIS ID, F.I.SH, Guruh, Kurs`
   (ixtiyoriy: fakultet, yo'nalish, kafedra). Tizim sarlavhalarni o'zbekcha/inglizcha/ruscha taniydi.
2. «Tekshirish» xato qatorlarni raqami bilan ko'rsatadi; xato qatorlar o'tkazib yuboriladi, faqat to'g'ri qatorlar yuboriladi. Server ham har bir qatorni qayta tekshiradi (bitta xato bo'lsa — hech narsa yozilmaydi).
3. «Import qilish» yangi talabalarga **bir martalik faollashtirish kodi** yaratadi → «Kodlarni yuklab olish» (CSV). Kod
   bazada saqlanmaydi (faqat xeshi), shuning uchun **faqat shu paytda** ko'rinadi. Kodlar 30 kun amal qiladi, 5 marta xato
   kiritilsa bloklanadi.
4. Talaba: kirish sahifasi → «Talaba: faollashtirish» → HEMIS ID + kod + o'zi o'ylagan parol.
5. Kod yo'qolsa: talabalar ro'yxatida faollashmagan talaba yonidagi «Yangi kod» tugmasi yangisini beradi (eskisi bekor bo'ladi).

HEMIS'dan to'g'ridan-to'g'ri olish: [HEMIS.md](HEMIS.md).

## Pechat va imzo

PDF'dagi pechat va imzo — `web/assets/pechat.svg` va `web/assets/imzo.svg` (hozir **namunaviy**, to'qib chiqarilgan).
Rasmiy pechat va rahbar imzosini shu fayllar o'rniga qo'ying (SVG) va `docker compose up -d --build`.
Pechat faqat RES rahbari tasdiqlagan va keyin o'zgarmagan ma'lumotga tushadi (tasdiq paytidagi ma'lumot xeshi bilan solishtiriladi).
Muhim: bu grafik belgi, **elektron raqamli imzo (ERI) emas**; hujjat kodi orqali tekshiriladi (RES paneli → Tasdiqlash → «Hujjat kodini tekshirish»).

## Zaxira nusxa va tiklash

```sh
./scripts/backup.sh                 # backups/amaliyot-SANA/ : db.dump + files.tar + SHA256SUMS
./scripts/restore.sh backups/amaliyot-20261007-145741
```
Har kuni avtomatik (cron, `crontab -e`): `30 2 * * * cd /opt/amaliyot-portal && ./scripts/backup.sh /mnt/zaxira >> /var/log/amaliyot-backup.log 2>&1`.
Eski zaxiralarni tozalashni (masalan, 30 kundan eskisini) o'zingiz sozlang. Zaxirani **boshqa kompyuter/diskka** ham
nusxalang va vaqti-vaqti bilan tiklab ko'ring (tiklash sinovi) — faqat shunda zaxiraga ishonish mumkin.
Zaxirada parol xeshlari va talaba shaxsiy ma'lumotlari bor: saqlash joyini himoyalang. `.env` zaxiraga kirmaydi — uni alohida saqlang.

## Kuzatish va nosozliklar

- Jurnal: `docker compose logs -f app` (har so'rov: usul, manzil, holat, vaqt). Parollar va tokenlar jurnalga yozilmaydi.
- Sog'liq: `GET /api/health`; Docker holati `docker compose ps`.
- **Audit jurnali** (Administrator paneli): kirishlar, noto'g'ri urinishlar, parol o'zgarishlari, import, hisob boshqaruvi.
  «Sessiya tokeni qayta ishlatildi» yozuvi — tokenni o'g'irlash belgisi bo'lishi mumkin (shu foydalanuvchining hamma sessiyasi yopiladi).
- «Juda ko'p so'rov» (429): bitta IP daqiqada 20 tadan ortiq kirish yoki 600 ta API so'rov yubordi. Umumiy tarmoq (NAT) ortida
  ko'p foydalanuvchi bo'lsa `RATE_LIMIT_*` ni oshiring.
- Sahifa ochiladi-yu «Server xatosi»: `docker compose logs app` oxirgi qatorlarini o'qing; baza ishlayotganini `docker compose ps` da tekshiring.
- Disk to'lib qolsa rasmlar yuklanmaydi: `docker system df`, `appdata` hajmi.
- Vaqt: server UTC bilan ishlaydi, sanalar brauzerda mahalliy vaqtda ko'rsatiladi. Server soati to'g'ri (NTP) bo'lishi kerak.

## Yangilash va ma'lumotlarni saqlash

Yangi versiya: `git pull && docker compose up -d --build` (oldin zaxira). Ma'lumotlar Docker «volume»larida (`dbdata`, `appdata`),
konteynerni qayta yaratish ularga tegmaydi. `docker compose down -v` esa **hammasini o'chiradi** — bunday qilmang.
