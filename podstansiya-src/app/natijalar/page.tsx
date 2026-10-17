import type { Metadata } from "next";
import ResultsScreen from "@/features/substation-sim/ui/ResultsScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.results.title };

export default function ResultsPage() {
  return <ResultsScreen />;
}
