import OqTerak from "@/components/games/oq-terak/OqTerak";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/oq-terak-kok-terak";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "oq-terak-kok-terak",
  "Oq terakmi, ko'k terak — “Oq terak!”da yur, “Ko'k terak!”da to'xta. Yakka va 2 kishilik rejim.",
);

export default function Page() {
  return (
    <GameShell slug="oq-terak-kok-terak" content={content}>
      <OqTerak />
    </GameShell>
  );
}
