import type { Metadata } from "next";

export const SITE_URL = "https://www.energyvibe.uz";
export const BASE = "/fizika-tarixi";
/** Asosiy sayt (basePath'dan tashqarida) — shuning uchun next/link emas, oddiy <a> bilan ochiladi. */
export const MAIN_SITE_HREF = "/";

export function meta(path: string, title: string, description: string): Metadata {
  const url = `${BASE}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "EnergyVibe — Fizika tarixi",
      locale: "uz_UZ",
      url,
      title: `${title} — Fizika tarixi`,
      description,
    },
  };
}
