import Lanka from "@/components/games/lanka/Lanka";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/lanka";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "lanka",
  "Lanka — bosib lankani tepib turing, ustunlar orasidan o'ting. Cheksiz rejim va rekord.",
);

export default function Page() {
  return (
    <GameShell slug="lanka" content={content}>
      <Lanka />
    </GameShell>
  );
}
