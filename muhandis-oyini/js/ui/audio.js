// Oddiy WebAudio signallari (tashqi fayl yo'q). Standart: o'chiq.
let ctx = null;
let enabled = false;
export function setSound(on) {
  enabled = !!on;
}
export function beep(kind = 'click') {
  if (!enabled) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const seq = {
      click: [[660, 0.04]],
      ok: [[660, 0.07], [880, 0.1]],
      error: [[220, 0.18]],
      alarm: [[880, 0.12], [660, 0.12], [880, 0.12]],
      accident: [[180, 0.3], [140, 0.4]]
    }[kind] || [[500, 0.05]];
    let t = ctx.currentTime;
    for (const [f, d] of seq) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'square';
      g.gain.value = 0.04;
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d);
      t += d + 0.02;
    }
  } catch {
    /* ovoz mavjud emas */
  }
}
