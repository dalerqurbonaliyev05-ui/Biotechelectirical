import Chillak from "@/components/games/chillak/Chillak";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/chillak";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "chillak",
  "Chillak — tayoq bilan chillakni uzoqqa uchiring: burchak va kuchni tanlang, shamolni hisobga oling. 5 urinish, eng uzoq masofa.",
);

export default function Page() {
  return (
    <GameShell slug="chillak" content={content}>
      <Chillak />
    </GameShell>
  );
}
