"use client";
import Link from "next/link";
import { useState } from "react";
import { BRANCHES } from "@/data/branches";
import { EVENTS } from "@/data/events";
import { EXPERIMENT_BY_SLUG } from "@/data/experiments";
import { SCIENTIST_BY_SLUG } from "@/data/scientists";
import type { BranchId } from "@/data/types";
import { usePick, useT } from "@/lib/i18n";
import { BranchChip, PageHead } from "./bits";

export default function TimelineView() {
  const t = useT();
  const pick = usePick();
  const [branch, setBranch] = useState<BranchId | "all">("all");
  const list = EVENTS.filter((e) => branch === "all" || e.branch === branch);

  return (
    <>
      <PageHead kicker={t("nav.timeline")} title={t("timeline.title")} lead={t("timeline.lead")} />
      <section className="ft-section" style={{ paddingTop: "clamp(32px, 6vw, 56px)" }}>
        <div className="ft-wrap">
          <div className="ft-filters" role="group" aria-label={t("timeline.title")}>
            <button type="button" className="ft-filter" aria-pressed={branch === "all"} onClick={() => setBranch("all")}>
              {t("common.all")}
            </button>
            {BRANCHES.map((b) => (
              <button key={b.id} type="button" className="ft-filter" aria-pressed={branch === b.id} onClick={() => setBranch(b.id)}>
                {pick(b.title)}
              </button>
            ))}
          </div>
          <ol className="ft-tl">
            {list.map((e) => {
              const sci = e.scientist ? SCIENTIST_BY_SLUG[e.scientist] : undefined;
              const exp = e.experiment ? EXPERIMENT_BY_SLUG[e.experiment] : undefined;
              return (
                <li key={e.id} id={e.id} className="ft-tl-item" style={{ scrollMarginTop: 88 }}>
                  <div className="ft-tl-card">
                    <span className="ft-tl-year">{pick(e.year)}</span>
                    <div className="ft-tl-body">
                      <h3>{pick(e.title)}</h3>
                      <p>{pick(e.text)}</p>
                      <div className="ft-tl-links">
                        <BranchChip id={e.branch} />
                        {sci ? <Link href={`/olimlar/${sci.slug}/`}>{pick(sci.name)} →</Link> : null}
                        {exp ? (
                          <Link href={`/tajribalar/${exp.slug}/`}>
                            {t("timeline.experiment")}: {pick(exp.title)} →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
