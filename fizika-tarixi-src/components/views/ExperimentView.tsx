"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ComponentType } from "react";
import { EXPERIMENT_BY_SLUG, EXPERIMENTS } from "@/data/experiments";
import { SCIENTIST_BY_SLUG } from "@/data/scientists";
import { usePick, useT } from "@/lib/i18n";
import { BranchChip, PageHead } from "./bits";

const SIMS: Record<string, ComponentType> = {
  "arximed-suzish": dynamic(() => import("../experiments/Archimedes")),
  "galiley-qiyalik": dynamic(() => import("../experiments/Incline")),
  mayatnik: dynamic(() => import("../experiments/Pendulum")),
  "nyuton-orbita": dynamic(() => import("../experiments/Orbit")),
  "faradey-induksiya": dynamic(() => import("../experiments/Induction")),
  "yorugliq-sinishi": dynamic(() => import("../experiments/Refraction")),
};

export default function ExperimentView({ slug }: { slug: string }) {
  const t = useT();
  const pick = usePick();
  const x = EXPERIMENT_BY_SLUG[slug];
  const Sim = SIMS[slug];
  if (!x || !Sim) return null;
  const sci = SCIENTIST_BY_SLUG[x.scientist];
  const more = EXPERIMENTS.filter((o) => o.slug !== x.slug).slice(0, 3);

  return (
    <>
      <PageHead
        crumb={
          <Link className="ft-crumb" href="/tajribalar/">
            {t("exp.back")}
          </Link>
        }
        title={pick(x.title)}
        lead={pick(x.lead)}
      >
        <div className="ft-rel" style={{ marginTop: 14 }}>
          <BranchChip id={x.branch} />
        </div>
      </PageHead>

      <section className="ft-section" style={{ paddingTop: "clamp(24px, 5vw, 44px)" }}>
        <div className="ft-wrap">
          <div className="ft-exp">
            <Sim />
          </div>

          <div className="ft-exp-extra">
            <div className="ft-panel">
              <h2>{t("exp.law")}</h2>
              <p>{pick(x.law)}</p>
              <h2>{t("exp.formula")}</h2>
              <div className="ft-formula">
                {pick(x.formula).map((f, i) => (
                  <div key={i}>{f}</div>
                ))}
              </div>
            </div>

            <div className="ft-panel">
              <h2>{t("exp.observe")}</h2>
              <ul className="ft-list">
                {pick(x.observe).map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>

            <div className="ft-panel">
              <h2>{t("exp.history")}</h2>
              <p>{pick(x.history)}</p>
            </div>

            <div className="ft-panel">
              {sci ? (
                <>
                  <h2>{t("exp.scientist")}</h2>
                  <Link className="ft-card" href={`/olimlar/${sci.slug}/`}>
                    <h3>{pick(sci.name)}</h3>
                    <p>{pick(sci.years)}</p>
                    <span className="ft-link">{t("common.more")} →</span>
                  </Link>
                </>
              ) : null}
              <h2>{t("exp.next")}</h2>
              <div className="ft-rel">
                {more.map((o) => (
                  <Link key={o.slug} className="ft-btn small" href={`/tajribalar/${o.slug}/`}>
                    {pick(o.title)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
