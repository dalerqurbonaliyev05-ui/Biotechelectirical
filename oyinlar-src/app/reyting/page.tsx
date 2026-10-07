import LeaderboardView from "@/components/views/LeaderboardView";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/reyting/",
  "Reyting — mahalliy rekordlar",
  "Har bir milliy o'yin bo'yicha eng yaxshi 10 natija: bugun, hafta va barcha vaqt. Natijalar shu qurilmada saqlanadi.",
);

export default function Page() {
  return <LeaderboardView />;
}
