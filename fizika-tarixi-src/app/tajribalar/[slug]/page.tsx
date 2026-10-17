import { notFound } from "next/navigation";
import ExperimentView from "@/components/views/ExperimentView";
import { EXPERIMENT_BY_SLUG, EXPERIMENTS } from "@/data/experiments";
import { meta } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return EXPERIMENTS.map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const x = EXPERIMENT_BY_SLUG[slug];
  if (!x) return {};
  return meta(`/tajribalar/${slug}/`, x.title.uz, x.lead.uz);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!EXPERIMENT_BY_SLUG[slug]) notFound();
  return <ExperimentView slug={slug} />;
}
