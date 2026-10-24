import { aqlliHisoblagich } from "./aqlli-hisoblagich";
import { simsizEnergiya } from "./simsiz-energiya";
import { vodorodMotori } from "./vodorod-motori";
import type { Project, ProjectCard } from "./types";

// Tayyor loyihalar. Yangi loyiha: content/future/<slug>.ts yozib, shu ro'yxatga qo'shing
// (va ixtiyoriy ravishda components/projects/registry.tsx ga vizual/simulyatorlarini).
export const PROJECTS: Project[] = [aqlliHisoblagich, simsizEnergiya, vodorodMotori];

export const PROJECT_BY_SLUG: Record<string, Project> = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]));

/** Ro'yxat sahifasi va "Keyingi loyiha" tugmasi uchun — tartib shu yerda. */
export const CARDS: ProjectCard[] = [
  { slug: "aqlli-hisoblagich", title: "Aqlli hisoblagich", short: aqlliHisoblagich.short, accent: "#9bc53d", ready: true },
  {
    slug: "simsiz-energiya",
    title: "Simsiz elektr energiya uzatish",
    short: simsizEnergiya.short,
    accent: simsizEnergiya.accent,
    ready: true,
  },
  {
    slug: "vodorod-motori",
    title: "Vodorod motori",
    short: vodorodMotori.short,
    accent: vodorodMotori.accent,
    ready: true,
  },
].map((c) => ({ ...c, ready: c.ready && c.slug in PROJECT_BY_SLUG }));

export function nextCard(slug: string): ProjectCard | undefined {
  const k = CARDS.findIndex((c) => c.slug === slug);
  return k < 0 ? undefined : CARDS[(k + 1) % CARDS.length];
}
