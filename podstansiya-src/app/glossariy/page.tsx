import type { Metadata } from "next";
import GlossaryScreen from "@/features/substation-sim/ui/GlossaryScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.gloss.title };

export default function GlossaryPage() {
  return <GlossaryScreen />;
}
