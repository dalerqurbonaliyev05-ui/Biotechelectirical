# public/ — videoga qo'shiladigan fayllar

Bu papkadagi fayllar `staticFile()` orqali video ichida ishlatiladi. Hozircha hammasi ixtiyoriy.

## Musiqa
`music.mp3` (yoki istalgan nom) ni shu yerga qo'ying va **Studio → Props → `audioSrc`** ga `music.mp3` yozing
(yoki `src/theme.ts` dagi `defaultProps.audioSrc`). Ritm `bpm` (120) bo'yicha sozlangan: har 0,5 soniyada urg'u.
Musiqa boshqa tempda bo'lsa, `bpm` ni o'zgartiring, shunda pop-animatsiyalar va "urish"lar unga moslashadi.

## Haqiqiy ilova skrinshotlari
Rasmlarni (390x844 nisbatda, masalan telefonda olingan skrinshot) `screens/` papkasiga qo'ying va `defaultProps.screens` ga yozing:

| Kalit | Sahna | Nima ko'rsatilishi kerak |
|---|---|---|
| `buyerHome` | 2 | xaridor bosh sahifasi (kategoriyalar) |
| `buyerFood` | 2 | taom sahifasi, "necha kishiga" |
| `buyerCart` | 3 | savat va promokod |
| `sellerOrder` | 4 | sotuvchining yangi buyurtmasi |
| `courierMap` | 5 | kuryer xaritasi |
| `buyerTrack` | 5 | xaridor kuzatuvi (kuryer yo'lda) |
| `buyerReview` | 6 | baho berish |

Skrinshot berilgan joyda chizilgan interfeys o'rniga rasm ko'rinadi, qolgan animatsiyalar (matn, stiker, o'tishlar) o'sha-o'sha qoladi.
