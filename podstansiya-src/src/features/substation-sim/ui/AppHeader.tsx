import Link from "next/link";
import { uz } from "../i18n/uz";
import { MAIN_SITE_HREF } from "../lib/site";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 font-bold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
            </svg>
          </span>
          <span className="truncate text-sm sm:text-base">{uz.app.shortTitle}</span>
        </Link>
        <a href={MAIN_SITE_HREF} className="shrink-0 text-xs font-semibold text-muted hover:text-text">
          {uz.app.backToSite} ↗
        </a>
      </div>
    </header>
  );
}
