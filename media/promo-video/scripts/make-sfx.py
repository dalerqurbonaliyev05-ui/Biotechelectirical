#!/usr/bin/env python3
"""
Reklama videosi uchun ovoz effektlarini (UI tovushlari) sintez qiladi: public/sfx/*.wav
Tashqi fayl yoki litsenziya kerak emas: hammasi shu yerda matematik yo'l bilan yaratiladi.
Ishga tushirish:  pip install numpy && python3 scripts/make-sfx.py
(Tayyor .wav fayllar repoda bor, skript faqat qayta yaratish yoki tovushni o'zgartirish uchun.)
"""
import os
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sfx')
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def fade(x, a=0.002, b=0.01):
    n = len(x)
    ia, ib = max(1, int(SR * a)), max(1, int(SR * b))
    x = x.copy()
    x[:ia] *= np.linspace(0, 1, ia)
    x[-ib:] *= np.linspace(1, 0, ib)
    return x


def lowpass(x, cutoff):
    """Bir qutbli past chastotali filtr; cutoff son yoki massiv (har bir namuna uchun)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def sine_sweep(f0, f1, dur, curve=1.0):
    t = t_(dur)
    k = (t / dur) ** curve
    f = f0 + (f1 - f0) * k
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase)


def bell(freq, dur, partials=((1, 1.0, 1.0), (2.0, 0.45, 1.6), (3.01, 0.25, 2.4), (4.2, 0.12, 3.2)), decay=5.0):
    t = t_(dur)
    y = np.zeros_like(t)
    for ratio, amp, dec in partials:
        y += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-decay * dec * t)
    return y


def place(total, parts):
    """parts: [(start_seconds, signal, gain)] -> bitta massivga joylaydi."""
    out = np.zeros(int(SR * total))
    for start, sig, gain in parts:
        i = int(SR * start)
        n = min(len(sig), len(out) - i)
        if n > 0:
            out[i:i + n] += gain * sig[:n]
    return out


def save(name, x, peak=0.9):
    x = x - np.mean(x)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * peak
    x = fade(x)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print(f'{name}.wav  {len(x) / SR:.2f}s')


# ================= Ovoz palitrasi =================
# Uslub: yetkazib berish ilovalaridagidek yumshoq, "pufakchali", quvnoq (marimba / kalimba / glokenshpil),
# hammasi bitta tonallikda (C-major pentatonika), shuning uchun ketma-ket chalinganda kuy bo'lib eshitiladi.
# Eslatma: bu tovushlar noldan sintez qilingan, boshqa ilovalarning (masalan Yandex Eats) asl fayllari ishlatilmagan.

N = {  # nota chastotalari
    'C4': 261.6, 'G4': 392.0, 'A4': 440.0, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3, 'G5': 784.0, 'A5': 880.0,
    'C6': 1046.5, 'D6': 1174.7, 'E6': 1318.5, 'G6': 1568.0, 'A6': 1760.0, 'C7': 2093.0, 'D7': 2349.3, 'E7': 2637.0,
}


def marimba(freq, dur=0.5, bright=1.0):
    t = t_(dur)
    y = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 7.5)
         + 0.32 * bright * np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t * 26)
         + 0.07 * bright * np.sin(2 * np.pi * freq * 9.25 * t) * np.exp(-t * 60))
    knock = lowpass(rng.standard_normal(len(t)), 2400) * np.exp(-t * 900) * 0.18
    return (y + knock) * (1 - np.exp(-t * 900))


def kalimba(freq, dur=0.6):
    t = t_(dur)
    y = np.sin(2 * np.pi * freq * t) * np.exp(-t * 5.5) + 0.22 * np.sin(2 * np.pi * freq * 5.95 * t) * np.exp(-t * 20)
    return y * (1 - np.exp(-t * 1200))


def glock(freq, dur=0.7):
    t = t_(dur)
    y = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 4.0) + 0.3 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 9)
         + 0.12 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 16))
    return y * (1 - np.exp(-t * 2000))


def vibes(freq, dur=1.0):
    t = t_(dur)
    trem = 1 - 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t))
    y = np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.6) + 0.18 * np.sin(2 * np.pi * freq * 4.0 * t) * np.exp(-t * 9)
    return y * trem * (1 - np.exp(-t * 600))


def bubble(f0, f1, dur=0.12):
    """"Bloop": yuqoriga sirpanuvchi yumaloq ton (pufakcha)."""
    t = t_(dur)
    y = sine_sweep(f0, f1, dur, 0.55)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6 * np.exp(-t * 14)
    return y * env


def seq(notes, gap, inst=marimba, dur=0.5, total=None, decay=1.0):
    parts = [(i * gap, inst(N[n] if isinstance(n, str) else n, dur), decay ** i) for i, n in enumerate(notes)]
    return place(total or (gap * len(notes) + dur), parts)


# ---------- Tugma va teginish ----------
def click():      # tugma: yumshoq "tok" + qisqa marimba
    return place(0.25, [(0, bubble(500, 1100, 0.07), 0.7), (0.0, marimba(N['G5'], 0.22, 0.5), 0.55)])


def tap():        # chip/kartani tanlash: yog'och "tik"
    t = t_(0.08)
    wood = lowpass(highpass(rng.standard_normal(len(t)), 900), 3200) * np.exp(-t * 260)
    return wood * 0.6 + 0.8 * marimba(N['C6'], 0.08, 0.3)


def tick(pitch=1.0):   # klaviatura / hisoblagich: juda qisqa kalimba
    return kalimba(N['E6'] * pitch, 0.07)


# ---------- Pop va o'tishlar ----------
def pop():
    return bubble(380, 980, 0.11)


def whoosh(dur=0.38, bright=2600):
    n = int(SR * dur)
    t = np.arange(n) / SR
    shape = np.sin(np.pi * t / dur) ** 2
    y = highpass(lowpass(rng.standard_normal(n), 400 + bright * shape), 250) * shape
    return y * 0.8 + 0.25 * sine_sweep(300, 700, dur) * shape


def thud():            # slogan: yumshoq bas + marimba akkord
    t = t_(0.6)
    bass = np.sin(2 * np.pi * (110 - 40 * t) * t) * np.exp(-t * 9)
    return bass + place(0.6, [(0, marimba(N['C5'], 0.5), 0.6), (0, marimba(N['G5'], 0.5), 0.45), (0, marimba(N['E6'], 0.5), 0.3)])


def blip():
    return kalimba(N['A6'], 0.18)


# ---------- Bildirishnoma, muvaffaqiyat ----------
def chime():           # yangi buyurtma: quvnoq 3 notali jingl
    return seq(['E6', 'G6', 'C7'], 0.085, marimba, 0.55)


def buzz():            # telefon tebranishi (yumshoqroq)
    t = t_(0.5)
    y = lowpass(np.sign(np.sin(2 * np.pi * 160 * t)), 700) * (np.sin(2 * np.pi * 22 * t) > -0.3)
    return y * np.exp(-t * 3.5) * 0.7


def success():         # qabul qilindi / tasdiq: arpejjio
    return seq(['C6', 'E6', 'G6', 'C7'], 0.07, marimba, 0.6)


def coin():            # chegirma: yorqin ikki nota + uchqun
    base = place(0.9, [(0, glock(N['D7'], 0.5), 0.8), (0.07, glock(N['G6'] * 2, 0.8), 1.0)])
    return base + 0.25 * sparkle(0.9, 6, 0.05)


def sparkle(total, count, start=0.0):
    parts = []
    notes = ['C7', 'D7', 'E7', 'G6', 'A6']
    for i in range(count):
        parts.append((start + i * 0.06 + rng.uniform(0, 0.02), glock(N[notes[i % len(notes)]] * 1.0, 0.3), 0.6 - i * 0.05))
    return place(total, parts)


def star(n):           # yulduzlar: pentatonika bo'yicha ko'tariladi
    return marimba(N[['C6', 'D6', 'E6', 'G6', 'C7'][n]], 0.5)


def lock():            # eng yaqin kuryer tanlandi
    return seq(['G6', 'C7'], 0.07, kalimba, 0.35)


def rolldown():        # narx tushishi: pastga tushuvchi yumshoq glissando
    return seq(['C7', 'A6', 'G6', 'E6', 'D6', 'C6', 'A5', 'G5'], 0.06, marimba, 0.3, decay=0.93)


def sweep_up():        # yo'l chizilishi: yuqoriga pentatonik yugurish
    return seq(['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'], 0.085, kalimba, 0.35, decay=0.97)


def doorbell():        # yetib keldi: do'stona "ding-dong" (vibrafon)
    return place(1.6, [(0, vibes(N['E6'], 0.9), 1.0), (0.38, vibes(N['C6'], 1.2), 1.0)])


def confetti():         # konfetti: "puf" + pufakcha + uchqunlar
    t = t_(0.9)
    poof = lowpass(rng.standard_normal(len(t)), 1400) * np.exp(-t * 35) * 0.7
    return poof + place(0.9, [(0, bubble(300, 900, 0.12), 0.8)]) + 0.6 * sparkle(0.9, 7, 0.06)


def engine():          # skuter: past, yumshoq g'uvullash
    t = t_(1.6)
    f = 85 + 18 * np.sin(2 * np.pi * 2.2 * t)
    saw = ((np.cumsum(f) / SR) % 1.0) * 2 - 1
    y = lowpass(saw, 300) * (0.65 + 0.35 * np.sin(2 * np.pi * 14 * t))
    return y * np.sin(np.pi * np.clip(t / 1.6, 0, 1)) ** 0.8


SOUNDS = {
    'click': click, 'tap': tap, 'tick': tick, 'tick_hi': lambda: tick(1.19),
    'pop': pop, 'pop_hi': lambda: bubble(600, 1500, 0.09), 'pop_low': lambda: place(0.35, [(0, bubble(240, 620, 0.15), 1.0), (0.02, marimba(N['C5'], 0.3, 0.4), 0.35)]),
    'whoosh': whoosh, 'whoosh_up': lambda: whoosh(0.32, 3800),
    'thud': thud, 'blip': blip, 'chime': chime, 'buzz': buzz, 'success': success, 'coin': coin,
    'star1': lambda: star(0), 'star2': lambda: star(1), 'star3': lambda: star(2), 'star4': lambda: star(3), 'star5': lambda: star(4),
    'lock': lock, 'rolldown': rolldown, 'sweep_up': sweep_up, 'doorbell': doorbell, 'confetti': confetti, 'engine': engine,
}

if __name__ == '__main__':
    # Toza tonli qisqa tovushlar baland eshitiladi: ularning cho'qqisi pastroq qilinadi.
    PEAK = {'pop': 0.55, 'pop_hi': 0.45, 'tick': 0.5, 'tick_hi': 0.5, 'tap': 0.6, 'blip': 0.6, 'buzz': 0.6, 'engine': 0.7}
    for name, fn in SOUNDS.items():
        save(name, fn(), PEAK.get(name, 0.9))
