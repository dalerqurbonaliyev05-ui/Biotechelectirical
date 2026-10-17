"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function NotFoundView() {
  const t = useT();
  return (
    <div className="ft-wrap ft-nf">
      <h1>{t("nf.title")}</h1>
      <p>{t("nf.text")}</p>
      <Link className="ft-btn primary" href="/">
        {t("nf.home")}
      </Link>
    </div>
  );
}
