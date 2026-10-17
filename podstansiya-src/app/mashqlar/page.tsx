import type { Metadata } from "next";
import MiniGamesScreen from "@/features/substation-sim/ui/MiniGamesScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.mini.title };

export default function MiniGamesPage() {
  return <MiniGamesScreen />;
}
