import type { Metadata, Viewport } from "next";
import AchievementToast from "@/features/substation-sim/ui/AchievementToast";
import AppHeader from "@/features/substation-sim/ui/AppHeader";
import Disclaimer from "@/features/substation-sim/ui/Disclaimer";
import { uz } from "@/features/substation-sim/i18n/uz";
import "./globals.css";

const BASE = "/podstansiya-simulyatori";

export const metadata: Metadata = {
  metadataBase: new URL("https://energyvibe.uz"),
  title: { default: uz.app.title, template: `%s — ${uz.app.shortTitle} | EnergyVibe` },
  description: uz.app.description,
  icons: { icon: `${BASE}/icon.svg` },
  openGraph: { type: "website", siteName: "EnergyVibe", locale: "uz_UZ", title: uz.app.title },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081430",
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
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap"
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a className="skip-link" href="#main">
          {uz.app.skipLink}
        </a>
        <AppHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Disclaimer />
        <AchievementToast />
      </body>
    </html>
  );
}
