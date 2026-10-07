"use client";
import { useT } from "@/lib/i18n";
import { MAIN_SITE_HREF } from "@/lib/seo";
import s from "./SiteFooter.module.css";

export default function SiteFooter() {
  const t = useT();
  return (
    <footer className={s.footer}>
      <div className="ikat-band" aria-hidden="true" />
      <div className={`container ${s.inner}`}>
        <p className={s.word} aria-hidden="true">
          ENERGY<b>VIBE</b>
        </p>
        <p>{t("footer.note")}</p>
        <a href={MAIN_SITE_HREF}>{t("footer.back")}</a>
      </div>
    </footer>
  );
}
