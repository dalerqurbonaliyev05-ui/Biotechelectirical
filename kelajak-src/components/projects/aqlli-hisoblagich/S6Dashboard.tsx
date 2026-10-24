"use client";
// 6-qadam: dashboard — xonadon asboblari, 24 soatlik yuklama grafigi, bir/ikki zonali tarif va ogohlantirishlar.
import { useState } from "react";
import { LabPanel, Readout, Slider, Toggle } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { isNightHour, loadProfile, tariffCost, type Appliance } from "@/lib/physics/meter";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  const bars = [22, 18, 16, 15, 17, 30, 62, 80, 54, 40, 46, 58, 70, 88, 92, 76, 60, 72, 96, 100, 84, 66, 44, 30];
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Dashboard: grafik, quvvat ko‘rsatkichi va ogohlantirish">
      <rect x="20" y="20" width="600" height="260" rx="18" className="am-screen" />
      <g className="am-on-dark">
        <text x="44" y="54" className="am-t w">Mening uyim · bugun</text>
        <g className="am-fade" style={{ animationDelay: ".3s" }}>
          <text x="44" y="92" className="am-t mut sm">Hozirgi quvvat</text>
          <text x="44" y="126" className="am-t big acc">1,84 kW</text>
          <text x="44" y="160" className="am-t mut sm">Bugun: 9,6 kVt·soat · 5 760 so‘m</text>
        </g>
        {bars.map((b, k) => (
          <rect key={k} x={250 + k * 14.5} y={250 - b * 1.6} width="10" height={b * 1.6} rx="2" className="am-bar" style={{ animationDelay: `${0.4 + k * 0.05}s` }} />
        ))}
        <line x1="245" x2="600" y1={250 - 90 * 1.6} y2={250 - 90 * 1.6} className="am-limit" />
        <g className="am-toast" style={{ animationDelay: "2.2s" }}>
          <rect x="44" y="196" width="180" height="56" rx="12" />
          <text x="58" y="220" className="am-t w sm">⚠ Limitga 90%</text>
          <text x="58" y="240" className="am-t mut xs fix">Konditsionerni kamaytiring</text>
        </g>
      </g>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const DEFAULTS: Appliance[] = [
  { id: "chiroq", name: "LED chiroqlar", power: 10, count: 8, hours: 6, start: 18, duty: 1 },
  { id: "choynak", name: "Elektr choynak", power: 2000, count: 1, hours: 0.5, start: 7, duty: 1 },
  { id: "konditsioner", name: "Konditsioner", power: 1500, count: 1, hours: 6, start: 13, duty: 0.7 },
  { id: "muzlatgich", name: "Muzlatgich", power: 150, count: 1, hours: 24, start: 0, duty: 0.4 },
  { id: "tv", name: "Televizor", power: 100, count: 1, hours: 4, start: 19, duty: 1 },
  { id: "kir", name: "Kir yuvish mashinasi", power: 2000, count: 1, hours: 1.5, start: 10, duty: 0.4 },
];

const CATALOG: Omit<Appliance, "id">[] = [
  { name: "Dazmol", power: 2200, count: 1, hours: 0.5, start: 20, duty: 0.6 },
  { name: "Kompyuter", power: 200, count: 1, hours: 5, start: 15, duty: 1 },
  { name: "Suv isitgich", power: 2000, count: 1, hours: 2, start: 5, duty: 0.8 },
  { name: "Mikroto‘lqinli pech", power: 1000, count: 1, hours: 0.3, start: 13, duty: 1 },
  { name: "Elektr pech (duxovka)", power: 2500, count: 1, hours: 1, start: 17, duty: 0.6 },
  { name: "Changyutgich", power: 1600, count: 1, hours: 0.3, start: 11, duty: 1 },
  { name: "Wi-Fi router", power: 10, count: 1, hours: 24, start: 0, duty: 1 },
];

const num = (v: string, lo: number, hi: number, fallback: number) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function Sim() {
  const [apps, setApps] = useState<Appliance[]>(DEFAULTS);
  const [dayRate, setDayRate] = useState(600);
  const [twoZone, setTwoZone] = useState(false);
  const [nightRate, setNightRate] = useState(300);
  const [limitMonth, setLimitMonth] = useState(300);
  const [limitKw, setLimitKw] = useState(5);
  const [addIdx, setAddIdx] = useState(0);

  const prof = loadProfile(apps); // W, har soat o'rtacha
  const hourly = prof.map((w) => w / 1000); // kVt·soat har soatda
  const day = tariffCost(hourly, dayRate, nightRate, twoZone);
  const single = tariffCost(hourly, dayRate, dayRate, false);
  const monthKWh = day.totalKWh * 30;
  const monthCost = day.cost * 30;
  const saving = (single.cost - day.cost) * 30;
  // Oniy maksimal quvvat: shu soatda yoqilgan asboblar nominal quvvatlari yig'indisi
  const peakByHour = Array.from({ length: 24 }, (_, h) =>
    apps.reduce((sum, a) => {
      const on = loadProfile([{ ...a, duty: 1, count: 1, power: 1 }])[h] > 0;
      return sum + (on ? a.power * a.count : 0);
    }, 0),
  );
  const peak = Math.max(...peakByHour);
  const peakHour = peakByHour.indexOf(peak);

  const alerts: { tone: "bad" | "warn" | "ok"; text: string }[] = [];
  if (monthKWh > limitMonth) alerts.push({ tone: "bad", text: `Oylik limit oshdi: ${fmt(monthKWh, 0)} kVt·soat > ${fmt(limitMonth, 0)} kVt·soat (+${fmt(monthKWh - limitMonth, 0)}).` });
  else if (monthKWh > 0.85 * limitMonth) alerts.push({ tone: "warn", text: `Oylik limitga yaqin: ${fmt((monthKWh / limitMonth) * 100, 0)}%.` });
  if (peak / 1000 > limitKw) alerts.push({ tone: "bad", text: `${String(peakHour).padStart(2, "0")}:00 da bir vaqtda ${fmt(peak / 1000, 1)} kW yoqilishi mumkin — ${fmt(limitKw, 1)} kW avtomat uzib qo‘yishi mumkin.` });
  if (!alerts.length) alerts.push({ tone: "ok", text: "Hammasi me’yorda: limit va quvvat chegarasi oshmagan." });

  const update = (id: string, patch: Partial<Appliance>) => setApps((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const maxBar = Math.max(1, ...hourly, limitKw * 0.6);

  return (
    <div className="lab">
      <div className="lab-cols wide-right">
        <LabPanel title="Mening xonadonim">
          <ul className="lab-apps">
            {apps.map((a) => (
              <li key={a.id}>
                <div className="lab-app-top">
                  <b>{a.name}</b>
                  <button type="button" className="lab-x" aria-label={`${a.name} ni o‘chirish`} onClick={() => setApps((l) => l.filter((x) => x.id !== a.id))}>
                    ×
                  </button>
                </div>
                <div className="lab-app-row">
                  <label>
                    <span>Quvvat, W</span>
                    <input type="number" inputMode="numeric" min={1} max={10000} value={a.power} onChange={(e) => update(a.id, { power: num(e.target.value, 0, 10000, a.power) })} />
                  </label>
                  <label>
                    <span>Soni</span>
                    <input type="number" inputMode="numeric" min={0} max={50} value={a.count} onChange={(e) => update(a.id, { count: Math.round(num(e.target.value, 0, 50, a.count)) })} />
                  </label>
                  <label>
                    <span>Boshlanish</span>
                    <select value={a.start} onChange={(e) => update(a.id, { start: Number(e.target.value) })}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Slider label="Kuniga ishlash" value={a.hours} min={0} max={24} step={0.5} unit="soat" display={fmt(a.hours, 1)} onChange={(v) => update(a.id, { hours: v })} />
              </li>
            ))}
          </ul>
          <div className="lab-add">
            <select aria-label="Qo‘shiladigan asbob" value={addIdx} onChange={(e) => setAddIdx(Number(e.target.value))}>
              {CATALOG.map((c, k) => (
                <option key={c.name} value={k}>
                  {c.name} ({c.power} W)
                </option>
              ))}
            </select>
            <button
              type="button"
              className="lab-btn"
              onClick={() => {
                const c = CATALOG[addIdx];
                if (c) setApps((l) => [...l, { ...c, id: `${c.name}-${Date.now()}` }]);
              }}
            >
              + Qo‘shish
            </button>
          </div>
        </LabPanel>

        <div className="lab-screen">
          <div className="lab-chart">
            <div className="lab-chart-head">
              <b>Sutkalik yuklama grafigi</b>
              <small>har soatdagi sarf, kVt·soat {twoZone ? "· to‘q fon — tungi zona" : ""}</small>
            </div>
            <svg viewBox="0 0 480 220" className="lab-bars" role="img" aria-label={`24 soatlik yuklama grafigi, kunlik jami ${fmt(day.totalKWh, 2)} kVt·soat`}>
              {twoZone
                ? Array.from({ length: 24 }, (_, h) =>
                    isNightHour(h, 23, 7) ? <rect key={h} x={30 + h * 18.75} y="8" width="18.75" height="180" className="night" /> : null,
                  )
                : null}
              {[0, 0.5, 1].map((f) => (
                <g key={f}>
                  <line x1="30" x2="480" y1={188 - f * 170} y2={188 - f * 170} className="gl" />
                  <text x="26" y={192 - f * 170} textAnchor="end" className="ax">
                    {fmt(maxBar * f, maxBar < 2 ? 1 : 0)}
                  </text>
                </g>
              ))}
              {hourly.map((v, h) => {
                const bh = (v / maxBar) * 170;
                const over = peakByHour[h] / 1000 > limitKw;
                return (
                  <rect key={h} x={32 + h * 18.75} y={188 - bh} width="14.75" height={Math.max(0.5, bh)} rx="2" className={`bar${over ? " over" : ""}`} style={{ transitionDelay: `${h * 12}ms` }}>
                    <title>
                      {String(h).padStart(2, "0")}:00 — {fmt(v, 2)} kVt·soat
                    </title>
                  </rect>
                );
              })}
              {[0, 6, 12, 18, 23].map((h) => (
                <text key={h} x={39 + h * 18.75} y="206" textAnchor="middle" className="ax">
                  {String(h).padStart(2, "0")}
                </text>
              ))}
            </svg>
          </div>

          <div className="lab-readouts">
            <Readout label="Bir kunda" value={fmt(day.totalKWh, 2)} unit="kVt·soat" />
            <Readout label="Bir oyda (30 kun)" value={fmt(monthKWh, 0)} unit="kVt·soat" tone={monthKWh > limitMonth ? "bad" : "ok"} big />
            <Readout label="Oylik to‘lov" value={fmt(monthCost, 0)} unit="so‘m" tone="p" big />
            <Readout label="Maks. oniy quvvat" value={fmt(peak / 1000, 1)} unit="kW" tone={peak / 1000 > limitKw ? "bad" : undefined} />
            {twoZone ? <Readout label="Tejash (oyiga)" value={fmt(saving, 0)} unit="so‘m" tone={saving > 0 ? "ok" : undefined} /> : null}
            {twoZone ? <Readout label="Tungi ulush" value={fmt(day.totalKWh ? (day.nightKWh / day.totalKWh) * 100 : 0, 0)} unit="%" /> : null}
          </div>

          <ul className="lab-alerts" aria-live="polite">
            {alerts.map((a) => (
              <li key={a.text} className={`lab-alert t-${a.tone}`}>
                {a.tone === "ok" ? "✓ " : "⚠ "}
                {a.text}
              </li>
            ))}
          </ul>

          <div className="lab-tariff">
            <label>
              <span>Kunduzgi / yagona tarif, so‘m/kVt·soat</span>
              <input type="number" inputMode="numeric" min={0} max={100000} value={dayRate} onChange={(e) => setDayRate(num(e.target.value, 0, 100000, dayRate))} />
            </label>
            <Toggle label="Ikki zonali tarif (tun 23:00–07:00)" checked={twoZone} onChange={setTwoZone} />
            {twoZone ? (
              <label>
                <span>Tungi tarif, so‘m/kVt·soat</span>
                <input type="number" inputMode="numeric" min={0} max={100000} value={nightRate} onChange={(e) => setNightRate(num(e.target.value, 0, 100000, nightRate))} />
              </label>
            ) : null}
            <label>
              <span>Oylik limit, kVt·soat</span>
              <input type="number" inputMode="numeric" min={1} max={100000} value={limitMonth} onChange={(e) => setLimitMonth(num(e.target.value, 1, 100000, limitMonth))} />
            </label>
            <label>
              <span>Kirish avtomati chegarasi, kW</span>
              <input type="number" inputMode="decimal" min={0.5} max={100} step={0.5} value={limitKw} onChange={(e) => setLimitKw(num(e.target.value, 0.5, 100, limitKw))} />
            </label>
            <p className="lab-note">Tarif qiymatlari misol uchun. Amaldagi tarifni hududiy elektr ta’minoti korxonasidan aniqlab, o‘zingiz kiriting.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
