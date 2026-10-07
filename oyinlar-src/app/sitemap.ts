import type { MetadataRoute } from "next";
import { CATALOG } from "@/data/catalog";
import { BASE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...CATALOG.map((c) => `/${c.slug}/`), "/yutuqlar/", "/reyting/"];
  return paths.map((p) => ({
    url: `${SITE_URL}${BASE}${p}`,
    changeFrequency: "monthly",
    priority: p === "/" ? 0.8 : 0.6,
  }));
}
