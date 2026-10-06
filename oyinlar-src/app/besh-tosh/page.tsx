import BeshTosh from "@/components/games/besh-tosh/BeshTosh";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/besh-tosh";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "besh-tosh",
  "Besh tosh — beshta tosh bilan o'ynaladigan milliy o'yin: birlik, ikkilik, uchlik, to'rtlik bosqichlari. Toshni ot, yerdagisini ol va tut!",
);

export default function Page() {
  return (
    <GameShell slug="besh-tosh" content={content}>
      <BeshTosh />
    </GameShell>
  );
}
