import type { Metadata } from "next";
import { BY_SLUG, type Slug } from "@/data/catalog";

export const SITE_URL = "https://www.energyvibe.uz";
export const BASE = "/oyinlar";

export function meta(path: string, title: string, description: string): Metadata {
  const url = `${BASE}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "EnergyVibe — Milliy o'yinlar",
      locale: "uz_UZ",
      url,
      title: `${title} — Milliy o'yinlar`,
      description,
      images: [{ url: `${BASE}/og.jpg`, width: 1200, height: 630 }],
    },
  };
}

export function gameMeta(slug: Slug, description: string): Metadata {
  return meta(`/${slug}/`, BY_SLUG[slug].title.uz, description);
}

/** Asosiy sayt (basePath'dan tashqarida) — shuning uchun next/link emas, oddiy <a> bilan ochiladi. */
export const MAIN_SITE_HREF = "/";
