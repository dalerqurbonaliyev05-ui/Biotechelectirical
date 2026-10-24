"use client";
// 5-qadam: ma'lumotlar bazasi — har soniyalik o'lchovlar, daqiqa/soat agregatsiyasi va yillik hajm hisobi.
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "@/components/template/hooks";
import { LabPanel, LiveFormula, Readout, Segmented, Slider } from "@/components/template/lab";
import { fmt } from "@/lib/fmt";
import { formatBytes, storageBytesPerYear } from "@/lib/physics/comm";
import { energyKWh } from "@/lib/physics/meter";

/* ---------------- Animatsiya ---------------- */

export function Visual() {
  return (
    <svg viewBox="0 0 640 300" className="am-svg" role="img" aria-label="O‘lchovlar jadvalga tushadi va agregatsiya qilinadi">
      {/* Xom qatorlar */}
      <text x="30" y="34" className="am-t">Xom ma’lumot (1 s)</text>
      {Array.from({ length: 8 }, (_, k) => (
        <g key={k} className="am-row" style={{ animationDelay: `${k * 0.28}s` }}>
          <rect x="30" y={50 + k * 28} width="230" height="22" rx="5" className="am-cell" />
          <text x="40" y={65 + k * 28} className="am-t mono xs">
            09:15:{String(k).padStart(2, "0")} · {900 + ((k * 37) % 60)} W
          </text>
        </g>
      ))}
      {/* Siqish o'qi */}
      <g className="am-fade" style={{ animationDelay: "2.5s" }}>
        <path className="am-wire thin" d="M275 160 H360" />
        <path d="M352 152 L364 160 L352 168" fill="none" stroke="var(--accent)" strokeWidth="3" />
        <text x="318" y="148" textAnchor="middle" className="am-t sm acc">
          AVG, SUM
        </text>
      </g>
      <g className="am-pop" style={{ animationDelay: "2.9s" }}>
        <text x="380" y="34" className="am-t">Agregat</text>
        <rect x="380" y="120" width="230" height="30" rx="6" className="am-cell acc" />
        <text x="392" y="140" className="am-t mono xs">
          09:15 · P̄ = 926 W · 15,4 Wh
        </text>
        <rect x="380" y="170" width="230" height="30" rx="6" className="am-cell" />
        <text x="392" y="190" className="am-t mono xs">
          09:00 · P̄ = 880 W · 0,88 kVt·soat
        </text>
      </g>
      <g className="am-fade" style={{ animationDelay: "3.4s" }}>
        <ellipse cx="495" cy="248" rx="70" ry="12" className="am-db" />
        <path d="M425 248 V272 a70 12 0 0 0 140 0 V248" className="am-db" />
        <text x="495" y="268" textAnchor="middle" className="am-t w xs">
          TimescaleDB
        </text>
      </g>
    </svg>
  );
}

/* ---------------- Simulyator ---------------- */

// Takrorlanadigan "tasodifiy" sonlar (mulberry32) — server va mijozda bir xil.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Row {
  ts: number; // virtual soniya (kun boshidan)
  p: number; // W
  wh: number; // Wh
  n: number; // qatorlar soni (agregatda)
}

const SPEEDS = [
  { value: 1, label: "×1" },
  { value: 60, label: "×60" },
  { value: 600, label: "×600" },
];
const LEVELS = [
  { value: "raw", label: "Xom (1 s)" },
  { value: "min", label: "Daqiqa" },
  { value: "hour", label: "Soat" },
] as const;
type Level = (typeof LEVELS)[number]["value"];

const START = 9 * 3600 + 15 * 60; // 09:15:00

function clock(s: number): string {
  const d = ((Math.floor(s) % 86400) + 86400) % 86400;
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const sec = d % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface Store {
  t: number;
  raw: Row[];
  min: Row[];
  hour: Row[];
  curMin: Row;
  curHour: Row;
  total: number;
  kettle: number;
}

function newStore(): Store {
  return {
    t: START,
    raw: [],
    min: [],
    hour: [],
    curMin: { ts: START - (START % 60), p: 0, wh: 0, n: 0 },
    curHour: { ts: START - (START % 3600), p: 0, wh: 0, n: 0 },
    total: 0,
    kettle: 0,
  };
}

const KEEP = 7;

type Snapshot = Pick<Store, "t" | "raw" | "min" | "hour" | "curMin" | "curHour" | "total">;

/** Render uchun nusxa: ref ichidagi o'zgaruvchan holat to'g'ridan-to'g'ri renderda o'qilmaydi. */
function view(s: Store): Snapshot {
  return { t: s.t, raw: [...s.raw], min: [...s.min], hour: [...s.hour], curMin: { ...s.curMin }, curHour: { ...s.curHour }, total: s.total };
}

export function Sim() {
  const box = useRef<HTMLDivElement>(null);
  const visible = useInView(box, { rootMargin: "0px" });
  const reduced = useReducedMotion();
  const [speed, setSpeed] = useState(60);
  const [level, setLevel] = useState<Level>("raw");
  const store = useRef<Store | null>(null);
  const [snap, setSnap] = useState<Snapshot>(() => view(newStore()));
  const rand = useRef(rng(42));

  // Har 250 ms da virtual vaqt `speed × 0,25 s` ga suriladi va shu soniyalar uchun o'lchovlar yaratiladi.
  useEffect(() => {
    if (!visible || reduced) return;
    const id = window.setInterval(() => {
      store.current ??= newStore();
      const s = store.current;
      const r = rand.current;
      const steps = Math.max(1, Math.round(speed * 0.25));
      for (let k = 0; k < steps; k++) {
        s.t += 1;
        if (s.kettle <= 0 && r() < 0.0015) s.kettle = 180; // vaqti-vaqti bilan choynak (3 daqiqa)
        const base = 650 + 250 * Math.sin((2 * Math.PI * s.t) / 5400);
        const p = Math.max(80, base + (r() - 0.5) * 120 + (s.kettle > 0 ? 2000 : 0));
        if (s.kettle > 0) s.kettle--;
        const wh = energyKWh(p, 1) * 1000;
        s.total++;
        s.raw.push({ ts: s.t, p, wh, n: 1 });
        if (s.raw.length > KEEP) s.raw.shift();
        const roll = (key: "curMin" | "curHour", list: Row[], size: number) => {
          const c = s[key];
          if (s.t - c.ts >= size) {
            list.push({ ...c, p: c.p / Math.max(1, c.n) });
            if (list.length > KEEP) list.shift();
            s[key] = { ts: s.t - (s.t % size), p: 0, wh: 0, n: 0 };
          }
          s[key].p += p;
          s[key].wh += wh;
          s[key].n += 1;
        };
        roll("curMin", s.min, 60);
        roll("curHour", s.hour, 3600);
      }
      setSnap(view(s));
    }, 250);
    return () => window.clearInterval(id);
  }, [visible, reduced, speed]);

  const s = snap;
  const rows = level === "raw" ? s.raw : level === "min" ? s.min : s.hour;
  const live = level === "min" ? s.curMin : level === "hour" ? s.curHour : null;
  const aggCount = s.min.length + s.hour.length;

  // Hajm kalkulyatori
  const [mIdx, setMIdx] = useState(3);
  const METERS = [1, 10, 100, 1000, 10_000, 100_000, 1_000_000];
  const meters = METERS[mIdx] ?? 1000;
  const [intv, setIntv] = useState(1);
  const BYTES = 48;
  const size = storageBytesPerYear(intv, meters, BYTES);

  return (
    <div className="lab" ref={box}>
      <div className="lab-cols">
        <LabPanel title="Jonli jadval: meter_readings">
          <Segmented label="Ko‘rinish" value={level} options={LEVELS.map((l) => ({ value: l.value, label: l.label }))} onChange={setLevel} />
          <Segmented label="Vaqt tezligi" value={speed} options={SPEEDS} onChange={setSpeed} />
          <div className="lab-readouts">
            <Readout label="Virtual vaqt" value={clock(s.t)} />
            <Readout label="Kelgan qatorlar" value={fmt(s.total, 0)} />
            <Readout label="Agregat qatorlar" value={fmt(aggCount, 0)} tone="ok" />
          </div>
          {reduced ? <p className="lab-note">Harakat kamaytirilgan rejimda jadval avtomatik yangilanmaydi.</p> : null}
        </LabPanel>
        <div className="lab-screen">
          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>{level === "raw" ? "ts" : "bucket"}</th>
                  <th>{level === "raw" ? "P, W" : "P̄, W"}</th>
                  <th>{level === "hour" ? "W, kVt·soat" : "W, Wh"}</th>
                  <th>qatorlar</th>
                </tr>
              </thead>
              <tbody>
                {live ? (
                  <tr className="live">
                    <td>{clock(live.ts).slice(0, 5)} …</td>
                    <td>{fmt(live.p / Math.max(1, live.n), 0)}</td>
                    <td>{level === "hour" ? fmt(live.wh / 1000, 3) : fmt(live.wh, 1)}</td>
                    <td>{live.n}</td>
                  </tr>
                ) : null}
                {[...rows].reverse().map((r) => (
                  <tr key={`${level}-${r.ts}`} className="row-in">
                    <td>{level === "raw" ? clock(r.ts) : clock(r.ts).slice(0, 5)}</td>
                    <td>{fmt(r.p, 0)}</td>
                    <td>{level === "hour" ? fmt(r.wh / 1000, 3) : fmt(r.wh, level === "raw" ? 3 : 1)}</td>
                    <td>{r.n}</td>
                  </tr>
                ))}
                {rows.length === 0 && !live ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      Ma’lumot kutilmoqda…
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <pre className="lab-code sm">
            <code>{`SELECT time_bucket('1 minute', ts) AS bucket,
       avg(p_w) AS p_avg, sum(p_w)/3600 AS wh
FROM meter_readings
WHERE meter_id = '001' AND ts > now() - interval '1 day'
GROUP BY bucket ORDER BY bucket DESC;`}</code>
          </pre>
        </div>
      </div>

      <div className="lab-cols">
        <LabPanel title="Yillik hajm kalkulyatori">
          <Slider label="Hisoblagichlar soni M" value={mIdx} min={0} max={METERS.length - 1} step={1} display={fmt(meters, 0)} onChange={setMIdx} />
          <Segmented
            label="Yozuv oralig‘i Δt"
            value={intv}
            options={[
              { value: 1, label: "1 s" },
              { value: 10, label: "10 s" },
              { value: 60, label: "1 daq" },
              { value: 900, label: "15 daq" },
              { value: 3600, label: "1 soat" },
            ]}
            onChange={setIntv}
          />
        </LabPanel>
        <div className="lab-screen">
          <div className="lab-readouts">
            <Readout label="Yiliga qatorlar" value={fmt((365 * 86400 * meters) / intv, 0)} />
            <Readout label="Yillik hajm" value={formatBytes(size)} tone={size > 1024 ** 4 ? "bad" : size > 50 * 1024 ** 3 ? "warn" : "ok"} big />
          </div>
          <LiveFormula>
            Hajm = (31 536 000 / {intv}) · {fmt(meters, 0)} · {BYTES} B = <b>{formatBytes(size)}</b>
          </LiveFormula>
          <p className="lab-note">Amalda: xom ma’lumot 7–30 kun saqlanadi, daqiqalik agregat 1–2 yil, soatlik va kunlik — doimiy.</p>
        </div>
      </div>
    </div>
  );
}
