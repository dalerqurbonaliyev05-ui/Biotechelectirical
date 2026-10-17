"use client";
import Link from "next/link";
import { BRANCH_BY_ID } from "@/data/branches";
import { EVENTS } from "@/data/events";
import { EXPERIMENT_BY_SLUG } from "@/data/experiments";
import { SCIENTIST_BY_SLUG, SCIENTISTS } from "@/data/scientists";
import { usePick, useT } from "@/lib/i18n";
import { PageHead } from "./bits";

export default function ScientistView({ slug }: { slug: string }) {
  const t = useT();
  const pick = usePick();
  const s = SCIENTIST_BY_SLUG[slug];
  if (!s) return null;
  const events = EVENTS.filter((e) => e.scientist === s.slug);
  const exps = s.experiments.map((x) => EXPERIMENT_BY_SLUG[x]).filter((x) => x !== undefined);
  const others = SCIENTISTS.filter((o) => o.slug !== s.slug && o.branches.some((b) => s.branches.includes(b))).slice(0, 4);

  return (
    <>
      <PageHead
        crumb={
          <Link className="ft-crumb" href="/olimlar/">
            {t("sci.back")}
          </Link>
        }
        kicker={pick(s.years)}
        title={pick(s.name)}
        lead={pick(s.summary)}
      />
      <section className="ft-section" style={{ paddingTop: "clamp(32px, 6vw, 56px)" }}>
        <div className="ft-wrap">
          <div className="ft-detail">
            <div className="ft-prose">
              <h2>{t("sci.bio")}</h2>
              {pick(s.bio).map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <h2>{t("sci.achievements")}</h2>
              <ul className="ft-list">
                {pick(s.achievements).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>

              {events.length > 0 ? (
                <>
                  <h2>{t("sci.events")}</h2>
                  <ul className="ft-list">
                    {events.map((e) => (
                      <li key={e.id}>
                        <Link href={`/xronologiya/#${e.id}`}>
                          <strong>{pick(e.year)}</strong> — {pick(e.title)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {exps.length > 0 ? (
                <>
                  <h2>{t("sci.experiments")}</h2>
                  <div className="ft-grid two">
                    {exps.map((x) => (
                      <Link key={x.slug} className="ft-card" href={`/tajribalar/${x.slug}/`}>
                        <h3>{pick(x.title)}</h3>
                        <p>{pick(x.lead)}</p>
                        <span className="ft-link">{t("exp.open")} →</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <aside>
              <dl className="ft-facts">
                <div>
                  <dt>{t("sci.years")}</dt>
                  <dd>{pick(s.years)}</dd>
                </div>
                <div>
                  <dt>{t("sci.born")}</dt>
                  <dd>{pick(s.born)}</dd>
                </div>
                <div>
                  <dt>{t("sci.field")}</dt>
                  <dd>{pick(s.field)}</dd>
                </div>
                <div>
                  <dt>{t("nav.timeline")}</dt>
                  <dd>
                    <span className="ft-rel">
                      {s.branches.map((b) => (
                        <span key={b} className="ft-chip">
                          {pick(BRANCH_BY_ID[b].title)}
                        </span>
                      ))}
                    </span>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>

          {others.length > 0 ? (
            <div style={{ marginTop: "clamp(40px, 7vw, 72px)" }}>
              <h2 className="ft-h2" style={{ fontSize: "1.7rem", marginBottom: 18 }}>
                {t("sci.others")}
              </h2>
              <div className="ft-rel">
                {others.map((o) => (
                  <Link key={o.slug} className="ft-btn small" href={`/olimlar/${o.slug}/`}>
                    {pick(o.name)}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
