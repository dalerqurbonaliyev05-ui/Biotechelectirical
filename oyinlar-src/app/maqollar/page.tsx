import Maqollar from "@/components/games/maqollar/Maqollar";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/maqollar";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "maqollar",
  "Maqollar viktorinasi — 40 dan ortiq o'zbek xalq maqolining davomini toping.",
);

export default function Page() {
  return (
    <GameShell slug="maqollar" content={content}>
      <Maqollar />
    </GameShell>
  );
}
