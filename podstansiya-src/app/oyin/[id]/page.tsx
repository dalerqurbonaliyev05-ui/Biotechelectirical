import type { Metadata } from "next";
import { SCENARIOS } from "@/features/substation-sim/data/scenarios";
import GameScreen from "@/features/substation-sim/ui/GameScreen";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SCENARIOS).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sc = SCENARIOS[id];
  return { title: sc ? `${sc.id}: ${sc.title}` : id, description: sc?.objective };
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameScreen scenarioId={id} />;
}
