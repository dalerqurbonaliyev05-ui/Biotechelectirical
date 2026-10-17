import type { Metadata } from "next";
import SettingsScreen from "@/features/substation-sim/ui/SettingsScreen";
import { uz } from "@/features/substation-sim/i18n/uz";

export const metadata: Metadata = { title: uz.settings.title };

export default function SettingsPage() {
  return <SettingsScreen />;
}
