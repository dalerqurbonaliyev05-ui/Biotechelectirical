"use client";
// 4-qadam: aloqa texnologiyalarini taqqoslash (Wi-Fi/MQTT, RS-485, LoRa) — taxminiy yo'l yo'qotishi modeli.
import { useState } from "react";
import { useReducedMotion } from "@/components/template/hooks";
import { LabPanel, LiveFormula, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { linkMarginDb, pathLossDb, qualityFromMargin, type Quality } from "@/lib/physics/comm";

/* ---------------- Animatsiya ---------------- */

const ROUTE = "M95 150 C 180 60 240 60 300 150 S 430 240 520 150";

export function Visual() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="Ma’lumot paketi hisoblagichdan serverga boradi">
      <g className="am-pop">
        <rect x="40" y="110" width="60" height="80" rx="10" className="am-chip" />
        <text x="70" y="140" textAnchor="middle" className="am-t w sm">
          Hisob-
        </text>
        <text x="70" y="156" textAnchor="middle" className="am-t w sm">
          lagich
        </text>
        <circle cx="70" cy="175" r="5" className="am-led" />
      </g>
      {[0, 1, 2].map((k) => (
        <path key={k} className="am-wave" style={{ animationDelay: `${k * 0.5}s` }} d={`M${108 + k * 14} 128 a 24 24 0 0 1 0 44`} />
      ))}
      <path d={ROUTE} className="am-route am-draw" style={{ animationDelay: ".3s" }} />
      <g className="am-pop" style={{ animationDelay: ".8s" }}>
        <rect x="270" y="125" width="60" height="50" rx="10" className="am-chip" />
        <text x="300" y="155" textAnchor="middle" className="am-t w sm">
          Shlyuz
        </text>
      </g>
      <g className="am-pop" style={{ animationDelay: "1.2s" }}>
        <path d="M510 160a26 26 0 0 1 6-51 34 34 0 0 1 64 8 22 22 0 0 1 2 43Z" fill="#fff" stroke="var(--line)" />
        <text x="548" y="146" textAnchor="middle" className="am-t sm">
          MQTT broker
        </text>
      </g>
      <g className="am-fade" style={{ animationDelay: "1.6s" }}>
        <rect x="490" y="200" width="110" height="60" rx="8" className="am-db" />
        <text x="545" y="235" textAnchor="middle" className="am-t w sm">
          Baza
        </text>
        <path className="am-wire thin" d="M545 162 V200" />
      </g>
      {reduced
        ? null
        : [0, 1].map((k) => (
            <g key={k}>
              <rect x="-17" y="-10" width="34" height="20" rx="5" className="am-packet" />
              <text x="0" y="4" textAnchor="middle" className="am-t mono xs">
                JSON
              </text>
              <animateMotion dur="3.2s" begin={`${1.4 + k * 1.6}s`} repeatCount="indefinite" path={ROUTE} />
            </g>
          ))}
      <text x="40" y="285" className="am-t mut sm">
        topic: energyvibe/meter/001/telemetry · QoS 1 · TLS
      </text>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

const DIST = [5, 10, 20, 50, 100, 200, 500, 800, 1200, 2000, 3000, 5000, 8000, 10000, 15000];
const OBST = [
  { value: "ochiq", label: "Ochiq joy" },
  { value: "devor", label: "G‘isht devor" },
  { value: "beton", label: "Beton bino" },
  { value: "podval", label: "Yerto‘la / metall shchit" },
] as const;
type Obst = (typeof OBST)[number]["value"];

// Taxminiy parametrlar (o'quv model): to'siq yo'qotishi chastotaga bog'liq — 2,4 GHz da kattaroq.
const LOSS: Record<Obst, { wifi: number; lora: number; n: number }> = {
  ochiq: { wifi: 0, lora: 0, n: 2.2 },
  devor: { wifi: 8, lora: 5, n: 2.8 },
  beton: { wifi: 20, lora: 12, n: 3.0 },
  podval: { wifi: 30, lora: 20, n: 3.2 },
};

const Q_LABEL: Record<Quality, string> = { alo: "A’lo", yaxshi: "Yaxshi", zaif: "Zaif", yoq: "Aloqa yo‘q" };
const Q_TONE: Record<Quality, string> = { alo: "ok", yaxshi: "ok", zaif: "warn", yoq: "bad" };

interface Tech {
  id: string;
  name: string;
  margin: number;
  q: Quality;
  rate: string;
  note: string;
}

export function Sim() {
  const [dIdx, setDIdx] = useState(DIST.indexOf(50));
  const [obst, setObst] = useState<Obst>("devor");
  const d = DIST[dIdx] ?? 50;
  const L = LOSS[obst];

  const plWifi = pathLossDb(d, 2400, L.n, L.wifi);
  const plLora = pathLossDb(d, 868, L.n, L.lora);
  const mWifi = linkMarginDb(20, -82, plWifi);
  const mLora = linkMarginDb(14, -132, plLora);
  const mRs = d <= 1200 ? 30 - (d / 1200) * 15 : -10; // simli: faqat masofaga bog'liq (≤ 1200 m, 9600 bit/s)

  const techs: Tech[] = [
    { id: "wifi", name: "Wi-Fi + MQTT", margin: mWifi, q: qualityFromMargin(mWifi), rate: "1–50 Mbit/s", note: "Uy routeri bor joyda eng oson; to‘siqlarga sezgir." },
    { id: "rs485", name: "RS-485 (Modbus)", margin: mRs, q: qualityFromMargin(mRs), rate: "9,6–115 kbit/s", note: "Simli: devor va beton xalaqit bermaydi, 1200 m gacha." },
    { id: "lora", name: "LoRa 868 MHz", margin: mLora, q: qualityFromMargin(mLora), rate: "0,3–11 kbit/s", note: "Kilometrlab masofa, kam energiya, lekin kichik paketlar." },
  ];

  let pick = "Hech qaysi to‘g‘ridan-to‘g‘ri yetmaydi: takrorlagich, GSM/NB-IoT yoki qo‘shimcha shlyuz kerak.";
  const ok = (t: Tech) => t.q !== "yoq";
  const wifi = techs[0];
  const rs = techs[1];
  const lora = techs[2];
  if (d <= 100 && (wifi.q === "alo" || wifi.q === "yaxshi")) pick = "Wi-Fi + MQTT: masofa kichik va signal kuchli — eng arzon va tez yechim.";
  else if (ok(rs) && (obst === "beton" || obst === "podval")) pick = "RS-485: beton/metall to‘siqlar radioni so‘ndiradi, simli shina esa ishonchli.";
  else if (ok(lora) && d > 100) pick = "LoRa: uzoq masofa uchun eng mos, ma’lumotni kam-kam va ixcham yuboring.";
  else if (ok(rs)) pick = "RS-485: radio zaif, lekin kabel tortish mumkin bo‘lsa — ishonchli variant.";
  else if (ok(wifi)) pick = "Wi-Fi zaif ishlaydi — antennani tashqariga chiqaring yoki takrorlagich qo‘ying.";

  const payload = `{"id":"001","ts":"2026-10-24T09:15:00Z","U":229.8,"I":4.12,"P":902,"pf":0.95,"kWh":1284.37}`;

  return (
    <div className="lab">
      <div className="lab-cols">
        <LabPanel title="Sharoit">
          <Slider label="Masofa (hisoblagich → shlyuz)" value={dIdx} min={0} max={DIST.length - 1} step={1} unit={d >= 1000 ? "km" : "m"} display={d >= 1000 ? fmt(d / 1000, d % 1000 ? 1 : 0) : String(d)} onChange={setDIdx} />
          <Segmented label="To‘siq" value={obst} options={OBST.map((o) => ({ value: o.value, label: o.label }))} onChange={setObst} />
          <p className="lab-note">Taxminiy model: n = {fmt(L.n, 1)}, Wi-Fi to‘sig‘i {L.wifi} dB, LoRa to‘sig‘i {L.lora} dB. Real natija antenna, balandlik va shovqinga bog‘liq.</p>
          <LiveFormula>
            PL(Wi-Fi) = {fmt(plWifi, 1)} dB → zaxira = 20 − {fmt(plWifi, 1)} + 82 = <b>{fmt(mWifi, 1)} dB</b>
          </LiveFormula>
        </LabPanel>
        <div className="lab-screen">
          <div className="lab-techs">
            {techs.map((t) => {
              const pct = Math.max(0, Math.min(100, ((t.margin + 10) / 50) * 100));
              return (
                <article key={t.id} className={`lab-tech t-${Q_TONE[t.q]}`}>
                  <header>
                    <h5>{t.name}</h5>
                    <span className="lab-pill">{Q_LABEL[t.q]}</span>
                  </header>
                  <div className="lab-sig" aria-hidden="true">
                    {[0, 1, 2, 3].map((k) => (
                      <i key={k} className={pct > 15 + k * 22 ? "on" : undefined} style={{ height: `${30 + k * 22}%` }} />
                    ))}
                  </div>
                  <p>
                    Zaxira: <b>{fmt(t.margin, 0)} dB</b> · {t.rate}
                  </p>
                  <small>{t.note}</small>
                </article>
              );
            })}
          </div>
          <p className="lab-alert t-ok">
            <b>Tavsiya:</b> {pick}
          </p>
          <div className="lab-mqtt">
            <span>MQTT paket (topic: energyvibe/meter/001/telemetry)</span>
            <code>{payload}</code>
            <small>
              {payload.length} bayt. LoRa da xuddi shu ma’lumotni ~16 baytli binar ko‘rinishda yuborish ma’qul.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
