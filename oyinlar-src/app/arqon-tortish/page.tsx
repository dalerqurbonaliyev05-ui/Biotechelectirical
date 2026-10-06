import Arqon from "@/components/games/arqon/Arqon";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/arqon-tortish";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "arqon-tortish",
  "Arqon tortish — kompyuterga (oson, o'rta, qiyin) yoki do'stingizga qarshi tez-tez bosing. Uch raunddan ikkitasini yuting.",
);

export default function Page() {
  return (
    <GameShell slug="arqon-tortish" content={content}>
      <Arqon />
    </GameShell>
  );
}
