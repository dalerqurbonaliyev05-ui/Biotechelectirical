"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { setLang, useLang, useT, type Key } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/types";
import { MAIN_SITE_HREF } from "@/lib/seo";
import SoundToggle from "./SoundToggle";
import s from "./SiteHeader.module.css";

const LINKS: { href: string; key: Key }[] = [
  { href: "/", key: "nav.games" },
  { href: "/yutuqlar/", key: "nav.achievements" },
  { href: "/reyting/", key: "nav.leaderboard" },
];

export default function SiteHeader() {
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
  const isActive = (href: string) => (href === "/" ? norm(path) === "/" : norm(path).startsWith(href));

  return (
    <header className={s.navbar}>
      <div className={s.pill}>
        <a className={s.logo} href={MAIN_SITE_HREF} aria-label="EnergyVibe — bosh sahifa">
          <svg className={s.mark} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M13.5 2 5 13.5h5.5L9.5 22 19 9.8h-5.6L13.5 2Z" fill="currentColor" />
          </svg>
          <span>
            ENERGY<b>VIBE</b>
          </span>
        </a>

        <nav id="games-nav" className={`${s.menu} ${open ? s.open : ""}`} aria-label={t("nav.menu")}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? s.active : undefined}
              aria-current={isActive(l.href) ? "page" : undefined}
            >
              {t(l.key)}
            </Link>
          ))}
          <a href={MAIN_SITE_HREF}>{t("nav.site")}</a>
        </nav>

        <div className={s.right}>
          <div className={s.lang} role="group" aria-label="Til / Язык / Language">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className={s.langBtn}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <SoundToggle className={s.sound} />
          <button
            type="button"
            className={s.burger}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            aria-controls="games-nav"
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
