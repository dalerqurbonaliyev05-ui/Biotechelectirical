# 💌 TaklifnomaBot

Butunlay Telegram ichida ishlaydigan taklifnoma boti: shaxsiy chatda taklifnoma yaratasiz, so'ng
**istalgan chatda** `@BotUsername` yozib uni tugmalari bilan yuborasiz. Qabul qiluvchi «Ha 💖» /
«Yo'q» bosadi, joy va vaqtni tanlaydi — xabar o'sha joyning o'zida tahrirlanadi, sizga esa bildirishnoma keladi.

Hech qanday tashqi sahifa, rasm, GIF yoki havola yo'q — faqat Telegram formatlashi, tugmalar va emoji-reaksiyalar.

**Stek:** Python 3.11+, aiogram 3.x (async), SQLite + aiosqlite.

---

## 1. BotFather'da botni sozlash

1. Telegram'da [@BotFather](https://t.me/BotFather) ni oching.
2. **Bot yaratish va token olish:**
   - `/newbot` yuboring.
   - Bot nomini kiriting (masalan, `Taklifnoma`).
   - Username kiriting — `bot` bilan tugashi shart (masalan, `TaklifnomaUzBot`).
   - BotFather token beradi: `123456789:AAAbbb...`. Uni hech kimga bermang — shu token `.env` faylga yoziladi.
3. **Inline rejimni yoqish (majburiy):**
   - `/setinline` → botingizni tanlang → yozuv qatorida chiqadigan maslahat matnini yuboring,
     masalan: `Taklifnomani tanlang…`
   - Busiz `@BotUsername` yozilganda hech narsa chiqmaydi.
4. **Inline feedback'ni yoqish:**
   - `/setinlinefeedback` → botingiz → `Enabled` (100%).
   - Shunda bot qaysi taklifnoma chatga yuborilganini biladi va `/mine`da «↗️ Yuborilgan: N» hisoblagichi ishlaydi.
5. *(Ixtiyoriy)* `/setdescription`, `/setabouttext`, `/setuserpic` — bot profilini bezash.
   Buyruqlar ro'yxatini (`/start`, `/new`, `/mine`, `/help`) bot ishga tushganda o'zi uch tilda o'rnatadi.

## 2. O'rnatish va ishga tushirish

```bash
cd taklifnoma-bot
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # so'ng .env ichida BOT_TOKEN=... ni to'ldiring
python bot.py
```

Logda `@BotUsername ishga tushdi (inline rejim: True)` chiqsa — hammasi joyida.
`False` bo'lsa, 3-qadamni (`/setinline`) bajaring.

### `.env` sozlamalari

| O'zgaruvchi | Standart | Izoh |
|---|---|---|
| `BOT_TOKEN` | — | BotFather tokeni (majburiy) |
| `DB_PATH` | `taklifnoma.db` | SQLite fayl yo'li |
| `TZ_NAME` | `Asia/Tashkent` | `/mine`dagi sana/vaqtlar uchun vaqt zonasi |
| `ALLOW_SELF_ANSWER` | `false` | `true` — egasi o'z taklifnomasiga inline xabarda ham javob bera oladi (bitta akkaunt bilan sinash uchun) |

## 3. Foydalanish

1. Bot bilan shaxsiy chatda `/start` → til (UZ / RU / EN) → taklifnoma turi
   (To'y / Tug'ilgan kun / Uchrashuv-randevu / Tadbir / Umumiy).
2. Bot navbat bilan so'raydi (har qadamda «⬅️ Orqaga» va «❌ Bekor qilish»):
   kichik sarlavha → asosiy matn → savol (3 ta tayyor variant yoki o'zingiz yozasiz) →
   «Yo'q»ga ruxsat → joy/vaqtni qabul qiluvchi tanlaydimi?
   - **Ha:** joy variantlari (Kafe/Restoran/Kino/Bouling/Tushlik/Sayr/Muzqaymoq/Konsert, bir nechtasi) +
     vaqt variantlari (har qatorda bittadan, masalan `Shanba, 18:00`);
   - **Yo'q:** aniq joy va vaqt matni.
3. Oxirida bot taklifnoma chatda qanday ko'rinishini **namuna xabar** sifatida yuboradi → «💾 Saqlash».
4. Istalgan chatda yozuv qatoriga `@BotUsername` yozing → ro'yxatdan taklifnomani tanlang.
   - `@BotUsername #12` — faqat 12-raqamli taklifnoma, `@BotUsername kino` — matn bo'yicha qidiruv.
   - Saqlangandan keyingi «↗️ Chatga yuborish» tugmasi buni avtomatik qiladi.
5. Qabul qiluvchi tugmalarni bosadi — natija o'sha xabarda ko'rinadi, sizga bildirishnoma keladi.
6. `/mine` — barcha taklifnomalar, «📊 Javoblar» (kim, qachon, qanday javob berdi) va «🗑 O'chirish».
7. `/help` — qisqa yo'riqnoma.

### Javob berish mantig'i

- **«Ha 💖»**
  - joy/vaqtni mehmon tanlasa: matn o'zgarmaydi, tugmalar joy variantlariga, so'ng vaqt variantlariga
    almashadi; vaqt tanlangach xabar `✅ [Ism] rozi bo'ldi — [joy], [vaqt]` ga tahrirlanadi, tugmalar olib tashlanadi;
  - aks holda darhol `✅ [Ism] rozi bo'ldi — [joy], [vaqt]`.
- **«Yo'q» — taslim bo'lmaydigan tugma** (faqat «Yo'q»ga ruxsat berilgan taklifnomalarda):
  - har bosilishda `no_count += 1`, xabar `no_phrases` dagi navbatdagi hazil iboraga almashadi va savol qayta
    so'raladi, «Yo'q» tugmasining matni `no_button_labels` dan olinadi (`Baribir Yo'q 😤`, …);
  - **10-marta** — `😄 10 marta urinib ko'rdingiz... mayli, baribir Ha ekan 😏` va avtomatik oddiy «Ha» oqimi
    (joy/vaqt tanlash yoki darhol «rozi bo'ldi»); egasiga alohida
    `🎉 [Ism] 10 marta 'Yo'q' deb o'ynashdan keyin baribir 'Ha' dedi 😄` xabari boradi.
- Hammasi **shu chat ichida**, faqat `editMessageText` / `editMessageReplyMarkup` orqali — yangi xabar yuborilmaydi.
- Xabarga birinchi bosgan odam «egalik qiladi». Guruhda boshqa odam bossa —
  `Bu taklifnoma allaqachon javob berilgan` toast'i chiqadi, xabar o'zgarmaydi.
- Egasiga bildirishnomalar: birinchi «Yo'q»da, yakuniy «Ha»da va 10× «Yo'q»dan keyingi «Ha»da.

### Inline xabarlarni tahrirlash haqida

Inline rejim orqali yuborilgan xabarning callback'ida `callback_query.message` bo'lmaydi — faqat
`inline_message_id` keladi. Bot shuni tekshiradi (`handlers/callbacks.py` → `Ctx._target`):
`inline_message_id` bo'lsa u bilan, bo'lmasa `chat_id + message_id` bilan tahrirlaydi.

**🎉 reaksiya cheklovi:** Telegram'ning `setMessageReaction` metodi faqat `chat_id + message_id` qabul qiladi,
inline xabarlar uchun esa bot chatni bilmaydi. Shuning uchun 🎉 animatsiyali reaksiya oddiy xabarlarda
(masalan, saqlangandan keyingi «🧪 Shu yerda sinab ko'rish» nusxasida) qo'yiladi; inline xabarlarda
bot buning o'rniga «🎉» toast'ini ko'rsatadi.

## 4. Ma'lumotlar bazasi

- `invitations`: `id, creator_tg_id, type, eyebrow, message, question, allow_no, let_guest_pick,
  place_options (json), time_options (json), fixed_place, fixed_time, lang, sent_count, created_at`
- `responses`: `id, invitation_id (FK, ON DELETE CASCADE), chat_id, message_id, inline_message_id, msg_key (UNIQUE),
  responder_tg_id, responder_name, answer ('yes'|'no'), status, no_count, chosen_place, chosen_time, responded_at`
  - `msg_key` — xabar kaliti: oddiy xabar uchun `m:<chat_id>:<message_id>`, inline xabar uchun
    `i:<inline_message_id>`. Shu kalit bo'yicha «ikkinchi marta bosish» tekshiriladi.
  - `status`: `no` (Yo'q o'yini) → `place` → `time` → `done`.
- `users`: `tg_id, lang` — tanlangan til.

Eski bazada `no_count` va boshqa yangi ustunlar bo'lmasa, bot ishga tushganda ularni o'zi qo'shadi.

## 5. Loyiha tuzilishi

```
taklifnoma-bot/
├── bot.py                  # kirish nuqtasi, routerlar, buyruqlar
├── config.py               # .env sozlamalari
├── handlers/
│   ├── create_flow.py      # /start, /new — FSM orqali yaratish
│   ├── inline_mode.py      # @BotUsername inline natijalari
│   ├── callbacks.py        # Ha / Yo'q / joy / vaqt tugmalari
│   ├── mine.py             # /mine — ro'yxat, javoblar, o'chirish
│   └── common.py           # /help va fallback
├── keyboards/              # inline klaviaturalar va callback_data
├── services/
│   ├── db.py               # aiosqlite qatlami
│   ├── i18n.py             # locale fayllardan matn olish
│   ├── render.py           # taklifnoma HTML matni
│   └── middlewares.py      # foydalanuvchi tili
├── locales/                # uz.json, ru.json, en.json — barcha matnlar
├── tests/                  # Telegram'siz end-to-end testlar
├── .env.example
└── requirements.txt
```

## 6. Testlar

```bash
pip install -r requirements-dev.txt
pytest
```

Testlar haqiqiy `Dispatcher` orqali update'larni o'tkazadi, Telegram API chaqiruvlari esa soxta sessiyada
yoziladi — yaratish oqimi, inline natijalar, «Ha»/joy/vaqt, 10× «Yo'q», ikkinchi odam bosishi va `/mine` tekshiriladi.
