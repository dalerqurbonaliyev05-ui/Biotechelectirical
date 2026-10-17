import type { Metadata } from "next";
import ScenarioList from "@/features/substation-sim/ui/ScenarioList";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.scenarios.title };

export default function ScenariosPage() {
  return <ScenarioList />;
}
