"use client";
import Link from "next/link";
import { SCIENTISTS } from "@/data/scientists";
import { usePick, useT } from "@/lib/i18n";
import { PageHead } from "./bits";

export default function ScientistsView() {
  const t = useT();
  const pick = usePick();
  return (
    <>
      <PageHead kicker={t("nav.scientists")} title={t("sci.title")} lead={t("sci.lead")} />
      <section className="ft-section" style={{ paddingTop: "clamp(32px, 6vw, 56px)" }}>
        <div className="ft-wrap">
          <div className="ft-grid three">
            {SCIENTISTS.map((s) => (
              <Link key={s.slug} className="ft-card" href={`/olimlar/${s.slug}/`}>
                <span className="ft-avatar" aria-hidden="true">
                  {s.initials}
                </span>
                <h3>{pick(s.name)}</h3>
                <span className="ft-years">{pick(s.years)}</span>
                <p>{pick(s.summary)}</p>
                <span className="ft-link">{t("sci.open")} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
