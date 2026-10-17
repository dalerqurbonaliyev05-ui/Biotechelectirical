"use client";
import type { ReactNode } from "react";
import { BRANCH_BY_ID } from "@/data/branches";
import { EXPERIMENTS } from "@/data/experiments";
import { SCIENTISTS } from "@/data/scientists";
import type { BranchId } from "@/data/types";
import { usePick } from "@/lib/i18n";

export function SectionHead({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <div className="ft-section-head">
      <span className="ft-kicker">{kicker}</span>
      <h2 className="ft-h2">{title}</h2>
      {lead ? <p className="ft-lead">{lead}</p> : null}
    </div>
  );
}

export function PageHead({ crumb, kicker, title, lead, children }: { crumb?: ReactNode; kicker?: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <section className="ft-page-head">
      <div className="ft-wrap">
        {crumb}
        {kicker ? <span className="ft-kicker">{kicker}</span> : null}
        <h1 className="ft-h2">{title}</h1>
        {lead ? <p className="ft-lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function BranchChip({ id }: { id: BranchId }) {
  const pick = usePick();
  return <span className="ft-chip">{pick(BRANCH_BY_ID[id].title)}</span>;
}

/** Bo'lim kartasi qayerga olib borishi: tajribasi bo'lsa — tajribalar, bo'lmasa — shu sohadagi olim sahifasi. */
export function branchHref(id: BranchId): string {
  if (EXPERIMENTS.some((e) => e.branch === id)) return `/tajribalar/#${id}`;
  const sci = SCIENTISTS.find((s) => s.branches.includes(id));
  return sci ? `/olimlar/${sci.slug}/` : "/olimlar/";
}

/** Hero fonidagi bezak: orbitalar va sayyoralar. */
export function Orbits() {
  const gold = "#c99a45";
  return (
    <svg className="ft-orbits" viewBox="0 0 560 560" aria-hidden="true" focusable="false">
      <circle cx="280" cy="280" r="278" fill="none" stroke={gold} strokeOpacity=".18" strokeWidth="1.5" strokeDasharray="2 10" />
      <circle cx="280" cy="280" r="200" fill="none" stroke={gold} strokeOpacity=".3" strokeWidth="1.5" />
      <circle cx="280" cy="280" r="120" fill="none" stroke={gold} strokeOpacity=".45" strokeWidth="1.5" />
      <circle cx="280" cy="280" r="60" fill={gold} fillOpacity=".12" />
      <circle cx="280" cy="280" r="24" fill={gold} />
      <circle cx="502" cy="108" r="8" fill="#f5eedf" />
      <circle cx="130" cy="420" r="6" fill={gold} />
      <circle cx="318" cy="162" r="5" fill="#f5eedf" />
      <circle cx="214" cy="84" r="4" fill="#7fa6e8" />
    </svg>
  );
}
