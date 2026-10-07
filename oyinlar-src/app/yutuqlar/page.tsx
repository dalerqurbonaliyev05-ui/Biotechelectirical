import AchievementsView from "@/components/views/AchievementsView";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/yutuqlar/",
  "Yutuqlar va nishonlar",
  "Milliy o'yinlardagi nishonlaringiz: ochilgan va qulflangan yutuqlar hamma o'yinlar bo'yicha statistika bilan.",
);

export default function Page() {
  return <AchievementsView />;
}
