import type { MetadataRoute } from "next";
import { EXPERIMENTS } from "@/data/experiments";
import { SCIENTISTS } from "@/data/scientists";
import { BASE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/xronologiya/",
    "/olimlar/",
    "/tajribalar/",
    ...SCIENTISTS.map((s) => `/olimlar/${s.slug}/`),
    ...EXPERIMENTS.map((x) => `/tajribalar/${x.slug}/`),
  ];
  return paths.map((p) => ({
    url: `${SITE_URL}${BASE}${p}`,
    changeFrequency: "monthly",
    priority: p === "/" ? 0.8 : 0.6,
  }));
}
