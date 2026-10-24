import type { MetadataRoute } from "next";
import { PROJECTS } from "@/content/future";
import { BASE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", ...PROJECTS.map((p) => `/${p.slug}/`)].map((p) => ({
    url: `${SITE_URL}${BASE}${p}`,
    changeFrequency: "monthly",
    priority: p === "/" ? 0.7 : 0.6,
  }));
}
