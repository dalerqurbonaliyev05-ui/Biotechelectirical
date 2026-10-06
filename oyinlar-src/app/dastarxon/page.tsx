import Dastarxon from "@/components/games/dastarxon/Dastarxon";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/dastarxon";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "dastarxon",
  "Dastarxon — somsa, palov, non, choy va mevalar: juft kartalarni toping. Uch qiyinlik darajasi.",
);

export default function Page() {
  return (
    <GameShell slug="dastarxon" content={content}>
      <Dastarxon />
    </GameShell>
  );
}
