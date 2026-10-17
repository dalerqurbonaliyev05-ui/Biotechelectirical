"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { setLang, useLang, useT, type Key } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/types";
import { MAIN_SITE_HREF } from "@/lib/seo";

const LINKS: { href: string; key: Key }[] = [
  { href: "/xronologiya/", key: "nav.timeline" },
  { href: "/olimlar/", key: "nav.scientists" },
  { href: "/tajribalar/", key: "nav.experiments" },
];

function Atom() {
  return (
    <svg className="ft-mark" viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="18" cy="18" rx="11" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".7" />
      <circle cx="18" cy="18" r="3.4" fill="currentColor" />
    </svg>
  );
}

export default function Header() {
  const t = useT();
  const lang = useLang();
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(path);
  // Sahifa almashsa mobil menyu yopiladi (render paytida holatni moslash — effektsiz).
  if (openedAt !== path) {
    setOpenedAt(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const norm = (p: string) => (p.endsWith("/") ? p : p + "/");
  const isActive = (href: string) => norm(path).startsWith(href);

  return (
    <header className="ft-header">
      <div className="ft-header-in">
        <Link className="ft-logo" href="/" aria-label={t("nav.home")}>
          <Atom />
          <span>Fizika Tarixi</span>
        </Link>

        <nav id="ft-nav" className={`ft-nav${open ? " open" : ""}`} aria-label={t("nav.menu")}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : undefined}
              aria-current={isActive(l.href) ? "page" : undefined}
            >
              {t(l.key)}
            </Link>
          ))}
          <a className="ft-nav-site" href={MAIN_SITE_HREF}>
            {t("nav.site")}
          </a>
        </nav>

        <div className="ft-right">
          <div className="ft-lang" role="group" aria-label="Til / Язык / Language">
            {LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ft-burger"
            aria-label={t("nav.menu")}
            aria-expanded={open}
            aria-controls="ft-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
