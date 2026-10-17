import TimelineView from "@/components/views/TimelineView";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/xronologiya/",
  "Xronologiya",
  "Fizika tarixidagi muhim voqealar: qadimgi dunyodan Xiggs bozonigacha, sohalar bo‘yicha saralash bilan.",
);

export default function Page() {
  return <TimelineView />;
}
