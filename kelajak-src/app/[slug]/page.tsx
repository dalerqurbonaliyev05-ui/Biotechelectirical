import { notFound } from "next/navigation";
import ProjectView from "@/components/template/ProjectView";
import { nextCard, PROJECT_BY_SLUG, PROJECTS } from "@/content/future";
import { meta } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PROJECT_BY_SLUG[slug];
  if (!p) return {};
  return meta(`/${slug}/`, p.title, p.promise);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECT_BY_SLUG[slug];
  if (!project) notFound();
  return <ProjectView project={project} next={nextCard(slug)} />;
}
