"use client";
import Link from "next/link";
import { BRANCHES } from "@/data/branches";
import { EXPERIMENTS } from "@/data/experiments";
import { SCIENTIST_BY_SLUG } from "@/data/scientists";
import { usePick, useT } from "@/lib/i18n";
import { PageHead } from "./bits";

export default function ExperimentsView() {
  const t = useT();
  const pick = usePick();
  return (
    <>
      <PageHead kicker={t("nav.experiments")} title={t("exp.title")} lead={t("exp.lead")} />
      <section className="ft-section" style={{ paddingTop: "clamp(32px, 6vw, 56px)" }}>
        <div className="ft-wrap" style={{ display: "flex", flexDirection: "column", gap: "clamp(36px, 6vw, 56px)" }}>
          {BRANCHES.map((b) => {
            const list = EXPERIMENTS.filter((x) => x.branch === b.id);
            if (list.length === 0) return null;
            return (
              <div key={b.id} id={b.id} style={{ scrollMarginTop: 88 }}>
                <h2 className="ft-h2" style={{ fontSize: "1.8rem", marginBottom: 20 }}>
                  {pick(b.title)}
                </h2>
                <div className="ft-grid three">
                  {list.map((x) => (
                    <Link key={x.slug} className="ft-card" href={`/tajribalar/${x.slug}/`}>
                      <h3>{pick(x.title)}</h3>
                      <p>{pick(x.lead)}</p>
                      <span className="ft-chip">{pick(SCIENTIST_BY_SLUG[x.scientist].name)}</span>
                      <span className="ft-link">{t("exp.open")} →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
