import type { Metadata, Viewport } from "next";
import Providers from "@/components/site/Providers";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { BASE, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Milliy o'zbek o'yinlari",
    template: "%s — Milliy o'yinlar | EnergyVibe",
  },
  description:
    "Milliy o'zbek o'yinlari brauzerda: besh tosh, oshiq, chillak, lanka, arqon tortish, kurash, ko'pkari, bekinmachoq, topishmoqlar va maqollar.",
  icons: { icon: `${BASE}/icon.svg` },
  openGraph: {
    type: "website",
    siteName: "EnergyVibe — Milliy o'yinlar",
    locale: "uz_UZ",
    images: [{ url: `${BASE}/og.jpg`, width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1aa6a6" },
    { media: "(prefers-color-scheme: dark)", color: "#121527" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- asosiy sayt bilan bir xil shriftlar */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Asosiy mazmunga o&apos;tish
        </a>
        <SiteHeader />
        <main id="main" style={{ flex: 1 }}>
          {children}
        </main>
        <SiteFooter />
        <Providers />
      </body>
    </html>
  );
}
