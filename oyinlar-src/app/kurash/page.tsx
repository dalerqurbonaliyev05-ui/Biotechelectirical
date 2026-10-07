import KurashView from "@/components/games/kurash/KurashView";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/kurash";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "kurash",
  "Kurash — o'zbek milliy kurashi: halol, yonbosh, chala baholari, jarimalar, vazn toifalari, usullar va 10 savollik viktorina.",
);

export default function Page() {
  return (
    <GameShell slug="kurash" content={content}>
      <KurashView />
    </GameShell>
  );
}
