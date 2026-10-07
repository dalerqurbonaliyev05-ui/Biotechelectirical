import Bekinmachoq from "@/components/games/bekinmachoq/Bekinmachoq";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/bekinmachoq";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "bekinmachoq",
  "Bekinmachoq — hovli, bog' va bozorda yashiringan bolalar va buyumlarni vaqt tugaguncha toping.",
);

export default function Page() {
  return (
    <GameShell slug="bekinmachoq" content={content}>
      <Bekinmachoq />
    </GameShell>
  );
}
