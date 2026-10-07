// Web Audio API bilan sintez qilingan ovozlar: tashqi audio fayl yuklanmaydi.
// AudioContext faqat birinchi foydalanuvchi harakatidan keyin yaratiladi (brauzer qoidasi).
import { readJSON, writeJSON } from "./storage";

export const MUTE_KEY = "sound-muted";

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

export function isMuted(): boolean {
  return readJSON<boolean>(MUTE_KEY, false);
}

export function setMuted(m: boolean): void {
  writeJSON(MUTE_KEY, m);
  if (!m) unlockAudio();
}

/** Birinchi pointerdown/keydown da chaqiriladi. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function ready(): AudioContext | null {
  if (!ctx || isMuted() || ctx.state !== "running") return null;
  return ctx;
}

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = Math.floor(c.sampleRate * 0.5);
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "triangle",
  vol = 0.25,
  endFreq?: number,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function burst(c: AudioContext, start: number, dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = "bandpass") {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(start);
  s.stop(start + dur + 0.02);
}

/** Doira: past "dum" + yengil "ka" shiqirlashi. */
function doira(c: AudioContext, t: number, strong = true) {
  if (strong) tone(c, 110, t, 0.28, "sine", 0.55, 48);
  burst(c, t, strong ? 0.09 : 0.06, strong ? 1800 : 3200, 1.2, strong ? 0.25 : 0.32);
}

// D-dorian ruhidagi kichik kuy uchun notalar (Hz)
const N = { D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, A5: 880 };

export const sfx = {
  /** Tugma / tanlash */
  click() {
    const c = ready();
    if (c) tone(c, 660, c.currentTime, 0.06, "square", 0.06);
  },
  /** Qisqa "tak" */
  tak() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    burst(c, t, 0.04, 2500, 2, 0.5, "highpass");
    tone(c, 900, t, 0.05, "triangle", 0.18, 500);
  },
  /** Doira zarbi (kuchli / kuchsiz) */
  doira(strong = true) {
    const c = ready();
    if (c) doira(c, c.currentTime, strong);
  },
  /** Doira ritmi: dum-tak-tak */
  rhythm() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    doira(c, t, true);
    doira(c, t + 0.18, false);
    doira(c, t + 0.3, false);
  },
  /** Sakrash / zarba */
  jump() {
    const c = ready();
    if (c) tone(c, 380, c.currentTime, 0.12, "triangle", 0.2, 760);
  },
  whoosh() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 3;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t);
    s.stop(t + 0.45);
  },
  correct() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, N.A4, t, 0.12, "triangle", 0.22);
    tone(c, N.D5, t + 0.1, 0.2, "triangle", 0.22);
  },
  wrong() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 220, t, 0.18, "sawtooth", 0.08, 180);
    tone(c, 165, t + 0.14, 0.24, "sawtooth", 0.08, 120);
  },
  /** G'alaba kuyi */
  win() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const seq = [N.D4, N.F4, N.A4, N.D5, N.C5, N.D5, N.E5, N.A5];
    seq.forEach((f, i) => tone(c, f, t + i * 0.11, i === seq.length - 1 ? 0.5 : 0.16, "triangle", 0.2));
    doira(c, t, true);
    doira(c, t + 0.44, true);
    doira(c, t + 0.77, true);
  },
  lose() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [N.A4, N.F4, N.D4].forEach((f, i) => tone(c, f, t + i * 0.16, 0.22, "triangle", 0.18));
  },
  /** Yutuq ochilganda */
  unlock() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    [N.D5, N.A5].forEach((f, i) => tone(c, f, t + i * 0.09, 0.3, "sine", 0.18));
    burst(c, t, 0.25, 6000, 0.7, 0.08, "highpass");
  },
  tick() {
    const c = ready();
    if (c) tone(c, 1200, c.currentTime, 0.03, "square", 0.05);
  },
};
