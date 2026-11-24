# Davomat: QR va kod orqali qo'shilish

## Qanday ishlaydi

1. O'qituvchi darsni boshlaydi → 6 xonali **kod** yaratiladi (faqat faol sessiyalar orasida noyob).
2. Doskada **QR-kod** (`/live/<kod>?t=<token>`) va kod ko'rinadi. QR dagi `t` — HMAC bilan imzolangan,
   **vaqt chegarali** token (`ATTENDANCE_SECRET`, `qr_window_sec` — standart 45 s). Doska uni har oynada yangilaydi;
   token joriy va oldingi oynada amal qiladi (~45–90 s).
3. Talaba:
   - QR'ni skanerlaydi → token yaroqli → qatnashish turi **`auditorium`** (auditoriya);
   - yoki kodni qo'lda kiritadi (token yo'q/yaroqsiz) → **`remote`** (masofadan).
4. Qo'shilish **bir talabaga bir yozuv** (`session_participants`, `attendance`: `unique(session, student)`).
   Tur faqat yaxshilanadi (remote → auditorium), hech qachon pasaymaydi.
5. **Takroriy kirish tekshiriladi:** har qayta qo'shilishda yangi `join_token` beriladi, eskisi bekor bo'ladi
   (eski qurilma `token_replaced` oladi), `rejoin_count` oshadi. O'qituvchi bu sonni davomat jadvalida ko'radi.

## MUHIM: bu ehtimoliy signal, to'liq himoya EMAS

QR-kod bitta o'zi davomatni kafolatlamaydi. Quyidagilar mumkin:

- auditoriyadagi do'st QR'ni suratga olib (yoki havolani yuborib) darhol uzatishi — token ~1–2 oyna amal qiladi;
- talaba o'z hisobini boshqa odamga berishi (bunda `rejoin_count` oshadi — signal);
- doskaning suratini sinfdan tashqarida ochib turish (oyna qisqa, lekin nol emas).

Shuning uchun tizim **jazolamaydi**: faqat tur (auditoriya/masofadan), qo'shilish vaqti va qayta kirishlar
sonini qayd etadi. Yakuniy qaror — o'qituvchida. Kuchaytirish yo'llari (hozir yo'q, `docs/roadmap.md`):
bir xil tarmoq (IP) tekshiruvi, geolokatsiya, savollarga javob berish faolligi bilan solishtirish.

## Sozlash

| Nima                                  | Qayerda                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `ATTENDANCE_SECRET` (kamida 16 belgi) | `.env` — yo'q bo'lsa QR tokeni berilmaydi va hamma `remote` bo'ladi (fail-closed) |
| QR oynasi (soniya)                    | Admin → Sozlamalar → "QR token yashash vaqti"                                     |
