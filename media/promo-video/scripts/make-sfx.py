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


# ---------- Tugma va teginish ----------
def click():
    t = t_(0.08)
    noise = highpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 520)
    tone = np.sin(2 * np.pi * (2300 - 9000 * t) * t) * np.exp(-t * 90)
    return 0.55 * noise + 0.8 * tone


def tap():
    t = t_(0.09)
    thump = np.sin(2 * np.pi * (700 - 3500 * t) * t) * np.exp(-t * 70)
    noise = lowpass(rng.standard_normal(len(t)), 4000) * np.exp(-t * 400)
    return 0.9 * thump + 0.35 * noise


def tick(pitch=1.0):
    t = t_(0.05)
    return (np.sin(2 * np.pi * 3600 * pitch * t) * np.exp(-t * 160) * 0.8
            + highpass(rng.standard_normal(len(t)), 5000) * np.exp(-t * 700) * 0.4)


# ---------- Pop va o'tishlar ----------
def pop(f0=950, f1=210, dur=0.16):
    t = t_(dur)
    body = sine_sweep(f0, f1, dur, 0.5) * np.exp(-t * 26)
    snap = highpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 600) * 0.35
    return body + snap


def whoosh(dur=0.5, up=True, bright=3800):
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sweep = np.sin(np.pi * t / dur) ** 2          # tepaga ko'tarilib tushuvchi shakl
    cut = 350 + (bright - 350) * (sweep if up else sweep[::-1] * 0 + sweep)
    y = lowpass(noise, cut)
    y = highpass(y, 180)
    return y * sweep ** 1.2


def thud():
    t = t_(0.35)
    body = np.sin(2 * np.pi * (130 - 190 * t) * t) * np.exp(-t * 11)
    click_ = lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 90) * 0.5
    return body + click_


def blip():
    t = t_(0.09)
    return np.sin(2 * np.pi * 980 * t) * np.sin(np.pi * t / 0.09) ** 1.5


# ---------- Bildirishnoma, muvaffaqiyat ----------
def chime():
    a = bell(1318.5, 0.9)
    b = bell(1760.0, 0.9)
    return place(1.0, [(0.0, a, 1.0), (0.13, b, 0.9)])


def buzz():
    t = t_(0.55)
    carrier = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.6 + np.sin(2 * np.pi * 150 * t) * 0.4
    am = (np.sin(2 * np.pi * 26 * t) > -0.2).astype(float)
    return lowpass(carrier * am, 1200) * np.exp(-t * 3.2)


def success():
    notes = [1046.5, 1318.5, 1568.0, 2093.0]
    return place(0.9, [(i * 0.065, bell(f, 0.6, decay=6.0), 1.0 - i * 0.08) for i, f in enumerate(notes)])


def coin():
    a = bell(1975.5, 0.5, partials=((1, 1.0, 1.0), (2.76, 0.6, 1.3), (5.4, 0.3, 2.0)), decay=7.0)
    b = bell(2637.0, 0.7, partials=((1, 1.0, 1.0), (2.76, 0.6, 1.3), (5.4, 0.3, 2.0)), decay=6.0)
    return place(0.8, [(0.0, a, 0.8), (0.085, b, 1.0)])


def star(n):
    freq = [1046.5, 1174.7, 1318.5, 1568.0, 2093.0][n]
    return bell(freq, 0.5, decay=6.5)


def lock():
    t = t_(0.2)
    a = sine_sweep(1300, 1900, 0.09) * np.sin(np.pi * t_(0.09) / 0.09)
    b = sine_sweep(1900, 2500, 0.1) * np.sin(np.pi * t_(0.1) / 0.1)
    return place(0.25, [(0.0, a, 0.8), (0.1, b, 1.0)])


def rolldown():
    parts = []
    pos = 0.0
    for i in range(11):
        parts.append((pos, tick(1.25 - i * 0.06), 0.9 - i * 0.03))
        pos += 0.045 + i * 0.012
    return place(1.0, parts)


def sweep_up():
    t = t_(0.95)
    tone = sine_sweep(320, 1500, 0.95, 2.2) * (t / 0.95) ** 0.8 * np.sin(np.pi * np.clip(t / 0.95, 0, 1) ** 0.5)
    air = highpass(rng.standard_normal(len(t)), 2000) * 0.08 * (t / 0.95)
    return tone * 0.7 + air


def doorbell():
    a = bell(659.3, 0.7, decay=3.5)
    b = bell(523.3, 1.0, decay=3.0)
    return place(1.4, [(0.0, a, 1.0), (0.42, b, 1.0)])


def confetti():
    t = t_(0.7)
    boom = lowpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 28)
    thump = np.sin(2 * np.pi * (180 - 200 * t) * t) * np.exp(-t * 30)
    sparkle = np.zeros(len(t))
    for _ in range(14):
        s = rng.uniform(0.03, 0.55)
        f = rng.uniform(2600, 5200)
        i = int(s * SR)
        seg = np.sin(2 * np.pi * f * t_(0.05)) * np.exp(-t_(0.05) * 70)
        sparkle[i:i + len(seg)] += seg[:len(sparkle) - i] * rng.uniform(0.15, 0.35)
    return boom * 0.9 + thump * 0.8 + sparkle


def engine():
    t = t_(1.6)
    f = 70 + 25 * np.sin(2 * np.pi * 3 * t)
    saw = ((np.cumsum(f) / SR) % 1.0) * 2 - 1
    y = lowpass(saw, 420) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * t))
    env = np.sin(np.pi * np.clip(t / 1.6, 0, 1)) ** 0.7
    return y * env


SOUNDS = {
    'click': click, 'tap': tap, 'tick': tick, 'tick_hi': lambda: tick(1.3),
    'pop': pop, 'pop_hi': lambda: pop(1250, 320, 0.13), 'pop_low': lambda: pop(520, 140, 0.2),
    'whoosh': whoosh, 'whoosh_up': lambda: whoosh(0.45, True, 5200),
    'thud': thud, 'blip': blip, 'chime': chime, 'buzz': buzz, 'success': success, 'coin': coin,
    'star1': lambda: star(0), 'star2': lambda: star(1), 'star3': lambda: star(2), 'star4': lambda: star(3), 'star5': lambda: star(4),
    'lock': lock, 'rolldown': rolldown, 'sweep_up': sweep_up, 'doorbell': doorbell, 'confetti': confetti, 'engine': engine,
}

if __name__ == '__main__':
    for name, fn in SOUNDS.items():
        save(name, fn())
