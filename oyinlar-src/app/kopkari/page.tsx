import KopkariView from "@/components/games/kopkari/KopkariView";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/kopkari";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "kopkari",
  "Ko'pkari (uloq) — tarixi, qoidalari, Qorabayir otlari, viloyatlar bo'yicha sxematik xarita va viktorina.",
);

export default function Page() {
  return (
    <GameShell slug="kopkari" content={content}>
      <KopkariView />
    </GameShell>
  );
}
