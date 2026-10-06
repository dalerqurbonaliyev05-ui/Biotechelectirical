import Oshiq from "@/components/games/oshiq/Oshiq";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/oshiq";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "oshiq",
  "Oshiq tashlash: pukka, chikka, tavka va olchi tomonlari, yakka va 2 kishilik rejim. Oshig'ingiz olchi bo'lsin!",
);

export default function Page() {
  return (
    <GameShell slug="oshiq" content={content}>
      <Oshiq />
    </GameShell>
  );
}
