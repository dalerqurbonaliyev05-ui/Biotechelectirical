import type { Metadata } from "next";

export const SITE_URL = "https://www.energyvibe.uz";
export const BASE = "/kelajak";
/** Asosiy sayt (basePath'dan tashqarida) — shuning uchun next/link emas, oddiy <a> bilan ochiladi. */
export const MAIN_SITE_HREF = "/";

export function meta(path: string, title: string, description: string): Metadata {
  const url = `${BASE}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "EnergyVibe — Kelajak loyihalari",
      locale: "uz_UZ",
      url,
      title: `${title} — Kelajak loyihalari`,
      description,
    },
  };
}
