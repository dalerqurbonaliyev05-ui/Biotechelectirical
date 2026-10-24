"use client";
// 7-qadam: himoya qatlamlari — saqlagich, varistor, galvanik ajratish, TLS, tamper. Hodisalarni sinab ko'rish.
import { useRef, useState } from "react";
import { Canvas, type DrawFn, label, LabPanel, Readout, Toggle } from "@/components/template/lab";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Himoya qatlamlari sxemasi">
      <text x="20" y="40" className="am-t">L</text>
      <text x="20" y="250" className="am-t">N</text>
      <path className="am-wire am-draw" d="M36 36 H600" />
      <path className="am-wire am-draw" d="M36 246 H330" />
      <path className="am-spike" d="M36 36 h40 l8 -26 l8 26 h20" />
      <g className="am-pop" style={{ animationDelay: ".4s" }}>
        <rect x="110" y="24" width="56" height="24" rx="12" className="am-fuse" />
        <text x="138" y="76" textAnchor="middle" className="am-t sm">Saqlagich</text>
      </g>
      <g className="am-pop" style={{ animationDelay: ".8s" }}>
        <path className="am-wire" d="M210 36 V110" />
        <rect x="196" y="110" width="28" height="48" rx="5" className="am-mov" />
        <path d="M196 150 L224 118" stroke="#fff" strokeWidth="2" />
        <path className="am-wire" d="M210 158 V246" />
        <text x="236" y="140" className="am-t sm">Varistor</text>
        <circle cx="210" cy="134" r="26" className="am-flash" />
      </g>
      <g className="am-pop" style={{ animationDelay: "1.2s" }}>
        <rect x="300" y="60" width="90" height="120" rx="10" className="am-chip" />
        <text x="345" y="112" textAnchor="middle" className="am-t w sm">AC/DC</text>
        <text x="345" y="130" textAnchor="middle" className="am-t w sm">izol.</text>
        <path className="am-wire" d="M330 36 V60" />
        <path className="am-wire" d="M330 180 V246" />
        <line x1="420" x2="420" y1="20" y2="280" className="am-barrier" />
        <text x="426" y="276" className="am-t mut xs">galvanik ajratish</text>
      </g>
      <g className="am-pop" style={{ animationDelay: "1.6s" }}>
        <path className="am-wire thin" d="M390 120 H460" />
        <rect x="460" y="90" width="80" height="60" rx="10" className="am-cpu" />
        <text x="500" y="125" textAnchor="middle" className="am-t w sm">ESP32</text>
      </g>
      <g className="am-pop" style={{ animationDelay: "2s" }}>
        <path className="am-wire thin dash" d="M540 120 H600" />
        <rect x="560" y="160" width="44" height="34" rx="6" className="am-lock" />
        <path d="M570 160 v-10 a12 12 0 0 1 24 0 v10" fill="none" stroke="var(--accent)" strokeWidth="4" />
        <text x="582" y="215" textAnchor="middle" className="am-t sm acc">TLS</text>
      </g>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

type Ev = "surge" | "short" | "touch" | "sniff" | "tamper";

interface Prot {
  fuse: boolean;
  mov: boolean;
  iso: boolean;
  tls: boolean;
  tamper: boolean;
}

const EVENTS: { id: Ev; icon: string; label: string }[] = [
  { id: "surge", icon: "⚡", label: "Chaqmoq impulsi (6 kV)" },
  { id: "short", icon: "🔥", label: "Ichki qisqa tutashuv" },
  { id: "touch", icon: "🖐", label: "USB kabelini ulab, tegish" },
  { id: "sniff", icon: "📡", label: "Paketni tutib olish" },
  { id: "tamper", icon: "🧲", label: "Korpusni ochish / magnit" },
];

function outcome(ev: Ev, p: Prot): { ok: boolean; title: string; text: string } {
  switch (ev) {
    case "surge":
      return p.mov
        ? { ok: true, title: "Varistor impulsni chekladi", text: "Kuchlanish ~710 V da cheklandi, impuls energiyasi varistorda so‘ndi. Ta’minot bloki va ESP32 omon." }
        : { ok: false, title: "Qurilma kuydi", text: "6 kV impuls ta’minot bloki kondensatori va ESP32 ni teshib o‘tdi. Varistor (va kerak bo‘lsa razryadnik) kerak." };
    case "short":
      return p.fuse
        ? { ok: true, title: "Saqlagich uzdi", text: "Qisqa tutashuv toki ~2 ms ichida uzildi. Saqlagichni almashtirib, sababini topish kifoya." }
        : { ok: false, title: "Yong‘in xavfi!", text: "Tok yuqori darajada oqishda davom etdi: plata yo‘llari va simlar qizib ketdi. Ta’minot oldiga saqlagich qo‘ying." };
    case "touch":
      return p.iso
        ? { ok: true, title: "Xavfsiz", text: "USB va past kuchlanish tomoni tarmoqdan galvanik ajratilgan — tegishda tok urmaydi." }
        : { ok: false, title: "Elektr toki urishi xavfi!", text: "Rezistorli bo‘lgich sxemasida ESP32 ning “yer”i tarmoq potensialida. USB orqali kompyuter va odam tanasi zanjirga qo‘shiladi." };
    case "sniff":
      return p.tls
        ? { ok: true, title: "Shifrlangan", text: "Hujumchi faqat shifrlangan baytlarni ko‘radi va soxta paket yubora olmaydi (server sertifikati tekshiriladi)." }
        : { ok: false, title: "Ma’lumot ochiq!", text: "Hujumchi iste’molni o‘qidi va soxta kVt·soat qiymatini yuborishi mumkin. MQTT ni TLS (8883-port) bilan ishlating." };
    case "tamper":
      return p.tamper
        ? { ok: true, title: "Hodisa qayd etildi", text: "TAMPER hodisasi vaqt tamg‘asi bilan yozildi va serverga ogohlantirish yuborildi." }
        : { ok: false, title: "Hech kim bilmadi", text: "Korpus ochildi yoki magnit qo‘yildi, lekin qayd yo‘q — qalbakilashtirish sezilmaydi." };
  }
}

const PLAIN = `{"id":"001","kWh":1284.37,"P":902}`;
const CIPHER = "17 03 03 00 4a 9f e1 2c 7b d4 03 88 c1 5e a0 3b 61 f2 9d 0c 47 ee 18 b3 …";

export function Sim() {
  const [p, setP] = useState<Prot>({ fuse: true, mov: false, iso: true, tls: false, tamper: true });
  const [ev, setEv] = useState<Ev | null>(null);
  const [wave, setWave] = useState<"surge" | "short">("surge");
  const [log, setLog] = useState<{ id: number; ev: Ev; ok: boolean; title: string }[]>([]);
  // Har "o'q" (hodisa) grafikni boshidan chizadi; boshlanish vaqti draw ichida (render emas) belgilanadi.
  const [shot, setShot] = useState(0);
  const anim = useRef({ shot: 0, start: -1e9 });

  const score = Object.values(p).filter(Boolean).length;
  const res = ev ? outcome(ev, p) : null;

  const fire = (id: Ev) => {
    const r = outcome(id, p);
    setEv(id);
    if (id === "surge" || id === "short") {
      setWave(id);
      setShot((n) => n + 1);
    }
    setLog((l) => [{ id: (l[0]?.id ?? 0) + 1, ev: id, ok: r.ok, title: r.title }, ...l].slice(0, 5));
  };

  // Impuls/qisqa tutashuv grafigi: 0…20 ms oyna, vaqt masshtabi ko'rinishi uchun shartli.
  const draw: DrawFn = (ctx, w, h, _dt, _t, col) => {
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const cy = h / 2;
    const now = performance.now();
    if (anim.current.shot !== shot) anim.current = { shot, start: now };
    const prog = Math.min(1, (now - anim.current.start) / 1400); // grafik chapdan o'ngga "chiziladi"
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    const N = 500;
    ctx.lineWidth = 2.4;
    if (wave === "surge") {
      const scale = (h * 0.42) / 1000; // ±1000 V
      const yOf = (v: number) => cy - Math.max(-1150, Math.min(1150, v)) * scale;
      for (const lim of [710, -710]) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = col.ok;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yOf(lim));
        ctx.lineTo(w, yOf(lim));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      label(ctx, "varistor chegarasi ±710 V", w - 6, yOf(710) - 8, col.ok, 10, "right");
      ctx.strokeStyle = p.mov ? col.u : col.bad;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let peakX = 0;
      for (let k = 0; k <= N * prog; k++) {
        const tm = (k / N) * 20; // ms
        let v = 325 * Math.sin(2 * Math.PI * 0.05 * tm);
        if (tm > 6) {
          const x = tm - 6;
          v += 6000 * (Math.exp(-x / 0.45) - Math.exp(-x / 0.05));
        }
        if (p.mov) v = Math.max(-710, Math.min(710, v));
        if (tm > 6 && tm < 6.3) peakX = (k / N) * w;
        const y = yOf(v);
        if (k === 0) ctx.moveTo(0, y);
        else ctx.lineTo((k / N) * w, y);
      }
      ctx.stroke();
      if (!p.mov && prog > 0.32) label(ctx, "↑ 6 000 V (cheklanmadi)", peakX + 36, 14, col.bad, 12);
      label(ctx, "u(t), V · 20 ms", 6, h - 10, col.muted, 11);
    } else {
      const scale = (h * 0.42) / 220; // A
      ctx.strokeStyle = p.fuse ? col.i : col.bad;
      ctx.beginPath();
      for (let k = 0; k <= N * prog; k++) {
        const tm = (k / N) * 20;
        let i = 1.2 * Math.sin(2 * Math.PI * 0.05 * tm);
        if (tm > 6) i = 200 * Math.sin(2 * Math.PI * 0.05 * tm);
        if (p.fuse && tm > 8) i = 0;
        const y = cy - Math.max(-220, Math.min(220, i)) * scale;
        if (k === 0) ctx.moveTo(0, y);
        else ctx.lineTo((k / N) * w, y);
      }
      ctx.stroke();
      if (prog > 0.45) label(ctx, p.fuse ? "saqlagich uzdi (~2 ms)" : "tok to‘xtamayapti!", w * 0.42, 14, p.fuse ? col.ok : col.bad, 12);
      label(ctx, "i(t), A · 20 ms", 6, h - 10, col.muted, 11);
    }
  };

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Himoya qatlamlari">
          <Toggle label="Saqlagich (0,5 A)" checked={p.fuse} onChange={(v) => setP({ ...p, fuse: v })} />
          <Toggle label="Varistor (275 V)" checked={p.mov} onChange={(v) => setP({ ...p, mov: v })} />
          <Toggle label="Galvanik ajratish" checked={p.iso} onChange={(v) => setP({ ...p, iso: v })} />
          <Toggle label="TLS shifrlash" checked={p.tls} onChange={(v) => setP({ ...p, tls: v })} />
          <Toggle label="Tamper datchigi" checked={p.tamper} onChange={(v) => setP({ ...p, tamper: v })} />
          <div className="lab-readouts">
            <Readout label="Himoya darajasi" value={`${score} / 5`} tone={score === 5 ? "ok" : score >= 3 ? "warn" : "bad"} big />
          </div>
        </LabPanel>
        <div className="lab-screen">
          <div className="lab-events">
            {EVENTS.map((e) => (
              <button key={e.id} type="button" className={`lab-btn${ev === e.id ? " on" : ""}`} onClick={() => fire(e.id)}>
                <span aria-hidden="true">{e.icon}</span> {e.label}
              </button>
            ))}
          </div>
          <Canvas draw={draw} label="Impuls yoki qisqa tutashuv grafigi" ratio={16 / 7} />
          {res ? (
            <div className={`lab-alert ${res.ok ? "t-ok" : "t-bad"}`} role="status">
              <b>{/[.!?]$/.test(res.title) ? res.title : `${res.title}.`}</b> {res.text}
              {ev === "sniff" ? <code className="lab-packet">{p.tls ? CIPHER : PLAIN}</code> : null}
            </div>
          ) : (
            <p className="lab-note">Hodisani tanlang: grafik va natija shu yerda ko‘rinadi. Avval himoyalarni o‘chirib sinang, keyin yoqib solishtiring.</p>
          )}
          {log.length ? (
            <ol className="lab-log" aria-label="Hodisalar jurnali">
              {log.map((l) => (
                <li key={l.id} className={l.ok ? "ok" : "bad"}>
                  {l.ok ? "✓" : "✗"} {EVENTS.find((e) => e.id === l.ev)?.label} — {l.title}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  );
}
