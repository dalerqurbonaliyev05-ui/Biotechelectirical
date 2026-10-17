"use client";
import Link from "next/link";
import { BRANCHES } from "@/data/branches";
import { EVENTS } from "@/data/events";
import { EXPERIMENTS } from "@/data/experiments";
import { SCIENTIST_BY_SLUG, SCIENTISTS } from "@/data/scientists";
import { usePick, useT } from "@/lib/i18n";
import { BranchChip, Orbits, SectionHead, branchHref } from "./bits";

const HOME_EVENTS = [
  "arximed-suzish",
  "optika-kitobi",
  "beruniy-yer",
  "galiley-1610",
  "nyuton-1687",
  "faradey-1831",
  "maksvell-1865",
  "eynshteyn-1905",
];
const HOME_SCIENTISTS = ["ulugbek", "beruniy", "nyuton", "kyuri"];

export default function HomeView() {
  const t = useT();
  const pick = usePick();
  const events = HOME_EVENTS.map((id) => EVENTS.find((e) => e.id === id)).filter((e) => e !== undefined);
  const scientists = HOME_SCIENTISTS.map((s) => SCIENTIST_BY_SLUG[s]);

  return (
    <>
      <section className="ft-hero">
        <Orbits />
        <div className="ft-wrap">
          <div className="ft-hero-in">
            <span className="ft-pill">{t("home.kicker")}</span>
            <h1>
              {t("home.title1")}
              <em>{t("home.title2")}</em>
            </h1>
            <p className="ft-hero-lead">{t("home.lead")}</p>
            <div className="ft-cta">
              <Link className="ft-btn primary" href="/xronologiya/">
                {t("home.ctaTimeline")}
              </Link>
              <Link className="ft-btn onnight" href="/olimlar/">
                {t("home.ctaScientists")}
              </Link>
            </div>
            <div className="ft-stats">
              <div className="ft-stat">
                <strong>{SCIENTISTS.length}</strong>
                <span>{t("stat.scientists")}</span>
              </div>
              <div className="ft-stat">
                <strong>{EVENTS.length}</strong>
                <span>{t("stat.events")}</span>
              </div>
              <div className="ft-stat">
                <strong>{EXPERIMENTS.length}</strong>
                <span>{t("stat.experiments")}</span>
              </div>
              <div className="ft-stat">
                <strong>{BRANCHES.length}</strong>
                <span>{t("stat.branches")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ft-section" id="xronologiya">
        <div className="ft-wrap">
          <SectionHead kicker={t("home.timelineKicker")} title={t("home.timelineTitle")} lead={t("home.timelineLead")} />
          <div className="ft-grid">
            {events.map((e) => (
              <Link key={e.id} className="ft-card" href={`/xronologiya/#${e.id}`}>
                <span className="ft-year">{pick(e.year)}</span>
                <span className="ft-rule" />
                <h3>{pick(e.title)}</h3>
                <p>{pick(e.text)}</p>
                <BranchChip id={e.branch} />
              </Link>
            ))}
          </div>
          <div className="ft-more">
            <Link className="ft-btn" href="/xronologiya/">
              {t("common.seeAll")}
            </Link>
          </div>
        </div>
      </section>

      <section className="ft-section dark" id="olimlar">
        <div className="ft-wrap">
          <SectionHead kicker={t("home.scientistsKicker")} title={t("home.scientistsTitle")} lead={t("home.scientistsLead")} />
          <div className="ft-grid">
            {scientists.map((s) => (
              <Link key={s.slug} className="ft-card" href={`/olimlar/${s.slug}/`}>
                <span className="ft-avatar" aria-hidden="true">
                  {s.initials}
                </span>
                <h3>{pick(s.name)}</h3>
                <span className="ft-years">{pick(s.years)}</span>
                <p>{pick(s.summary)}</p>
                <span className="ft-chip line">{pick(s.field)}</span>
              </Link>
            ))}
          </div>
          <div className="ft-more">
            <Link className="ft-btn onnight" href="/olimlar/">
              {t("common.seeAll")}
            </Link>
          </div>
        </div>
      </section>

      <section className="ft-section" id="bolimlar">
        <div className="ft-wrap">
          <SectionHead kicker={t("home.branchesKicker")} title={t("home.branchesTitle")} lead={t("home.branchesLead")} />
          <div className="ft-grid three">
            {BRANCHES.map((b) => (
              <Link key={b.id} className="ft-card" href={branchHref(b.id)}>
                <span className="ft-num">{b.num}</span>
                <h3>{pick(b.title)}</h3>
                <p>{pick(b.desc)}</p>
                <span className="ft-link">{t("common.more")} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ft-section" style={{ paddingTop: 0 }}>
        <div className="ft-wrap">
          <div className="ft-banner">
            <h2>{t("home.expTitle")}</h2>
            <p>{t("home.expLead")}</p>
            <Link className="ft-btn primary" href="/tajribalar/">
              {t("home.expCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
