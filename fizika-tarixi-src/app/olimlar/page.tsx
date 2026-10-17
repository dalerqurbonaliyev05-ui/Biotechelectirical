import ScientistsView from "@/components/views/ScientistsView";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/olimlar/",
  "Olimlar",
  "Arximed, Beruniy, Ulug‘bek, Galiley, Nyuton, Faradey, Eynshteyn va boshqa fizika tarixini yaratgan olimlar.",
);

export default function Page() {
  return <ScientistsView />;
}
