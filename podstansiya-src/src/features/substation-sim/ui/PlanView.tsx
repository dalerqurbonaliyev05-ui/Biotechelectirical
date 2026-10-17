"use client";

// Podstansiya hududining soddalashtirilgan rejasi. Belgini bosish — sxemadagi uskunaga o'tish.

import { uz } from "../i18n/uz";

interface Area {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  markers: Array<{ id: string; label: string; x: number; y: number }>;
}

const AREAS: Area[] = [
  {
    id: "oru",
    title: "ORU-110 kV (ochiq taqsimlash qurilmasi)",
    x: 40,
    y: 40,
    w: 720,
    h: 150,
    fill: "#38bdf812",
    markers: [
      { id: "W1", label: "W1", x: 110, y: 80 },
      { id: "Q-W1", label: "Q-W1", x: 170, y: 130 },
      { id: "B110-1", label: "110 kV I s.", x: 300, y: 165 },
      { id: "Q-SV110", label: "SV-110", x: 400, y: 130 },
      { id: "B110-2", label: "110 kV II s.", x: 500, y: 165 },
      { id: "Q-W2", label: "Q-W2", x: 630, y: 130 },
      { id: "W2", label: "W2", x: 690, y: 80 },
    ],
  },
  {
    id: "tr",
    title: "Transformatorlar maydoni",
    x: 160,
    y: 215,
    w: 480,
    h: 120,
    fill: "#eab30810",
    markers: [
      { id: "T-1", label: "T-1", x: 260, y: 275 },
      { id: "T-2", label: "T-2", x: 540, y: 275 },
    ],
  },
  {
    id: "zru35",
    title: "ZRU-35 kV",
    x: 40,
    y: 360,
    w: 230,
    h: 110,
    fill: "#eab30812",
    markers: [
      { id: "B35-1", label: "35 kV I s.", x: 100, y: 420 },
      { id: "B35-2", label: "35 kV II s.", x: 210, y: 420 },
    ],
  },
  {
    id: "kru10",
    title: "KRU-10 kV",
    x: 290,
    y: 360,
    w: 250,
    h: 110,
    fill: "#c084fc12",
    markers: [
      { id: "B10-1", label: "10 kV I s.", x: 350, y: 420 },
      { id: "Q-SV10", label: "SV-10", x: 415, y: 445 },
      { id: "B10-2", label: "10 kV II s.", x: 480, y: 420 },
    ],
  },
  { id: "opu", title: "Boshqaruv xonasi (OPU)", x: 560, y: 360, w: 200, h: 110, fill: "#2f9bff18", markers: [] },
  { id: "store", title: "Omborxona", x: 660, y: 215, w: 100, h: 120, fill: "#94a8d012", markers: [] },
];

export default function PlanView({ onGo }: { onGo: (id: string) => void }) {
  return (
    <div className="h-full w-full overflow-auto">
      <svg viewBox="0 0 800 530" className="h-full min-h-[320px] w-full" role="group" aria-label={uz.game.tabs.plan} fontFamily="var(--font-sans)">
        <rect x={20} y={20} width={760} height={470} rx={10} fill="none" stroke="var(--color-muted)" strokeDasharray="6 6" />
        <text x={400} y={512} textAnchor="middle" fontSize={12} fill="var(--color-muted)">
          ⇩ Kirish darvozasi · to&apos;siq (ogohlantirish plakatlari bilan)
        </text>
        {AREAS.map((a) => (
          <g key={a.id}>
            <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={10} fill={a.fill} stroke="var(--color-line)" />
            <text x={a.x + 10} y={a.y + 18} fontSize={12} fontWeight={700} fill="var(--color-text)">
              {a.title}
            </text>
            {a.id === "tr" && <line x1={400} y1={a.y + 25} x2={400} y2={a.y + a.h - 10} stroke="var(--color-muted)" strokeWidth={4} />}
            {a.id === "opu" && (
              <text x={a.x + 10} y={a.y + 50} fontSize={11} fill="var(--color-muted)">
                🧑‍🔧 Siz shu yerdasiz: telefon, jurnal, naryadlar
              </text>
            )}
            {a.markers.map((m) => (
              <g
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={`${m.label} — sxemada ko'rsatish`}
                className="cursor-pointer"
                onClick={() => onGo(m.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onGo(m.id);
                  }
                }}
              >
                <circle cx={m.x} cy={m.y} r={m.id.startsWith("T-") ? 26 : 9} fill="var(--color-ink-800)" stroke="var(--color-accent)" strokeWidth={2} />
                <text x={m.x} y={m.y + (m.id.startsWith("T-") ? 5 : 24)} textAnchor="middle" fontSize={m.id.startsWith("T-") ? 14 : 10.5} fontWeight={700} fill="var(--color-text)">
                  {m.label}
                </text>
              </g>
            ))}
          </g>
        ))}
        <text x={400} y={350} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
          (yong&apos;inga qarshi devor, moy qabul qilgich chuqurlari)
        </text>
      </svg>
    </div>
  );
}
