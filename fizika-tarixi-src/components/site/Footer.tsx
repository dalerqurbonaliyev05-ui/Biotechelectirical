"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { MAIN_SITE_HREF } from "@/lib/seo";

export default function Footer() {
  const t = useT();
  return (
    <footer className="ft-footer">
      <div className="ft-wrap ft-footer-in">
        <strong className="ft-footer-logo">Fizika Tarixi</strong>
        <nav className="ft-footer-links" aria-label={t("nav.menu")}>
          <Link href="/xronologiya/">{t("nav.timeline")}</Link>
          <Link href="/olimlar/">{t("nav.scientists")}</Link>
          <Link href="/tajribalar/">{t("nav.experiments")}</Link>
          <a href={MAIN_SITE_HREF}>{t("footer.back")}</a>
        </nav>
        <p className="ft-footer-note">{t("footer.note")}</p>
      </div>
    </footer>
  );
}
