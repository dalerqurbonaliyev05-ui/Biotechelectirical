import type { Metadata } from "next";
import EncyclopediaScreen from "@/features/substation-sim/ui/EncyclopediaScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.enc.title };

export default function EncyclopediaPage() {
  return <EncyclopediaScreen />;
}
