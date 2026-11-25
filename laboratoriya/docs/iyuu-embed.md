# iyuu.uz darsiga joylashtirish (embed)

iyuu.uz jonli darsida o‘qituvchi laboratoriya sxemasini topshiriq qilib beradi. Talaba darsdan chiqmasdan
sxemani shu yerdagi simulyatorda yig‘adi (iframe).

## Simulyator

`/laboratoriya/<sxema-id>?embed=iyuu&rejim=2d`

- sayt sarlavhasi (`.app-head`) yashiriladi;
- mashq har doim noldan boshlanadi (eski qoralama o‘qilmaydi);
- rejim berilmasa — 2D;
- ota oynaga `postMessage` (faqat ruxsat etilgan originlarga: `EMBED_ORIGINLAR`, `mashq.js`):

```js
{ manba: 'energyvibe-lab', tur: 'tayyor', sxema: 'yoritish-02', nomi: '...' }
{ manba: 'energyvibe-lab', tur: 'tekshiruv', sxema, togri: false }
{ manba: 'energyvibe-lab', tur: 'tugadi', sxema, ball: 85, vaqt: 312, xatolar: 1, maslahat: 1, javob: false }
```

iyuu.uz `event.origin === 'https://energyvibe.uz'` ni tekshiradi. Natija talaba brauzeridan keladi — iyuu.uz uni
o‘z-o‘zini baholash sifatida saqlaydi (reyting ballariga qo‘shilmaydi).

## Kutubxona

`/kutubxona/?embed=1#/kitob/<kitob-id>/<bet>`

- "Kutubxonaga qaytish" tugmasi yashiriladi;
- o‘sha kitob ochiq turganda hash'dagi bet o‘zgarsa — o‘sha betga o‘tadi (o‘qituvchi slaydi bilan birga).

iyuu.uz katalog uchun `schemes/royxat.json`, `schemes/<id>.json` va `kutubxona/books.json` ni o‘qiydi —
ularning tuzilishini o‘zgartirganda iyuu.uz’dagi `src/lib/server/energyvibe.ts` ni ham tekshiring.
