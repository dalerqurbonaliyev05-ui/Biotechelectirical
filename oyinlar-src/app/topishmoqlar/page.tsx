import Topishmoqlar from "@/components/games/topishmoqlar/Topishmoqlar";
import GameShell from "@/components/games/GameShell";
import { content } from "@/data/content/topishmoqlar";
import { gameMeta } from "@/lib/seo";

export const metadata = gameMeta(
  "topishmoqlar",
  "40 dan ortiq o'zbek xalq topishmoqlari: variant tanlang yoki javobni yozing, yordamdan foydalaning.",
);

export default function Page() {
  return (
    <GameShell slug="topishmoqlar" content={content}>
      <Topishmoqlar />
    </GameShell>
  );
}
