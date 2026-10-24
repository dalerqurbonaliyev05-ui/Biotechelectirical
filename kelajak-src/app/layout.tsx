import type { Metadata, Viewport } from "next";
import { BASE, MAIN_SITE_HREF, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kelajak loyihalari",
    template: "%s — Kelajak loyihalari | EnergyVibe",
  },
  description:
    "Aqlli hisoblagich, simsiz energiya uzatish va vodorod motori: animatsiya, jonli simulyator va mini-quiz bilan 7 qadamda o‘rganing.",
  icons: { icon: `${BASE}/icon.svg` },
  openGraph: {
    type: "website",
    siteName: "EnergyVibe — Kelajak loyihalari",
    locale: "uz_UZ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b1440",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- asosiy sayt bilan bir xil Google Fonts usuli */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap"
        />
      </head>
      <body>
        <a className="kl-skip" href="#main">
          Asosiy mazmunga o‘tish
        </a>
        <header className="kl-header">
          <div className="kl-wrap kl-header-in">
            <a className="kl-logo" href={MAIN_SITE_HREF} aria-label="EnergyVibe bosh sahifasi">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M13.5 2 5 13.5h5.5L9.5 22 19 9.8h-5.6L13.5 2Z" fill="currentColor" />
              </svg>
              <span>
                ENERGY<b>VIBE</b>
              </span>
            </a>
            <nav className="kl-header-nav" aria-label="Bo‘lim">
              <a href={`${BASE}/`}>Kelajak loyihalari</a>
              <a href={`${MAIN_SITE_HREF}#projects`}>Saytga qaytish</a>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="kl-footer">
          <div className="kl-wrap">
            <p>© 2026 Qurbonaliyev Daler · energyvibe.uz</p>
            <p>Real loyihalar, aniq hisob-kitoblar.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
