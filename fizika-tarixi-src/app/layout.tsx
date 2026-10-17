import type { Metadata, Viewport } from "next";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import Providers from "@/components/site/Providers";
import { BASE, SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fizika tarixi",
    template: "%s — Fizika tarixi | EnergyVibe",
  },
  description:
    "Fizika fanining 2500 yillik tarixi: buyuk olimlar, kashfiyotlar xronologiyasi va brauzerda ishlaydigan interaktiv tajribalar.",
  icons: { icon: `${BASE}/icon.svg` },
  openGraph: {
    type: "website",
    siteName: "EnergyVibe — Fizika tarixi",
    locale: "uz_UZ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1426" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1426" },
  ],
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
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
        />
      </head>
      <body>
        <a className="ft-skip" href="#main">
          Asosiy mazmunga o‘tish
        </a>
        <Header />
        <main id="main" className="ft-main">
          {children}
        </main>
        <Footer />
        <Providers />
      </body>
    </html>
  );
}
