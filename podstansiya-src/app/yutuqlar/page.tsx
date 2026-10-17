import type { Metadata } from "next";
import AchievementsScreen from "@/features/substation-sim/ui/AchievementsScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.ach.title };

export default function AchievementsPage() {
  return <AchievementsScreen />;
}
