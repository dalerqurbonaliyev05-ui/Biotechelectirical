import type { Metadata } from "next";
import LeaderboardScreen from "@/features/substation-sim/ui/LeaderboardScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.lb.title };

export default function LeaderboardPage() {
  return <LeaderboardScreen />;
}
