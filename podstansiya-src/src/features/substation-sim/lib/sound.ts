// Ovoz effektlari: WebAudio sintezi (fayllarsiz). Sozlamalarda "Ovoz" yoqilgan bo'lsagina chalinadi.

import { useSettings } from "../store/settings";

export type SoundName = "switch" | "ok" | "error" | "critical" | "alarm" | "success" | "fail" | "unlock";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.07, slideTo?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  const t0 = a.currentTime + start;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** Qisqa shovqin (apparat "chiq" etishi) */
function clunk(a: AudioContext) {
  const len = Math.floor(a.sampleRate * 0.06);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = 0.25;
  src.buffer = buf;
  src.connect(g).connect(a.destination);
  src.start();
  tone(a, 90, 0, 0.12, "triangle", 0.12, 50);
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined" || !useSettings.getState().sound) return;
  const a = audio();
  if (!a) return;
  switch (name) {
    case "switch":
      clunk(a);
      break;
    case "ok":
      tone(a, 880, 0, 0.09, "sine", 0.05);
      break;
    case "error":
      tone(a, 220, 0, 0.18, "square", 0.04);
      tone(a, 180, 0.12, 0.2, "square", 0.04);
      break;
    case "critical":
      tone(a, 160, 0, 0.5, "sawtooth", 0.06, 60);
      break;
    case "alarm":
      for (let i = 0; i < 3; i++) tone(a, 1046, i * 0.22, 0.12, "square", 0.035);
      break;
    case "success":
      [523, 659, 784, 1046].forEach((f, i) => tone(a, f, i * 0.1, 0.18, "triangle", 0.06));
      break;
    case "fail":
      [392, 330, 262].forEach((f, i) => tone(a, f, i * 0.16, 0.25, "sawtooth", 0.04));
      break;
    case "unlock":
      [784, 988, 1318].forEach((f, i) => tone(a, f, i * 0.08, 0.22, "sine", 0.06));
      break;
  }
}
