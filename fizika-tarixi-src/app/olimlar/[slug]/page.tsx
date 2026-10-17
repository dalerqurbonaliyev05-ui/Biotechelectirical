import { notFound } from "next/navigation";
import ScientistView from "@/components/views/ScientistView";
import { SCIENTIST_BY_SLUG, SCIENTISTS } from "@/data/scientists";
import { meta } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return SCIENTISTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SCIENTIST_BY_SLUG[slug];
  if (!s) return {};
  return meta(`/olimlar/${slug}/`, s.name.uz, s.summary.uz);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SCIENTIST_BY_SLUG[slug]) notFound();
  return <ScientistView slug={slug} />;
}
