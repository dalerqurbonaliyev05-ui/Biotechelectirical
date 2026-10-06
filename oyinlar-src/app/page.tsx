import HomeView from "@/components/views/HomeView";
import { meta } from "@/lib/seo";

export const metadata = {
  ...meta(
    "/",
    "Milliy o'zbek o'yinlari",
    "Besh tosh, oshiq, chillak, lanka, oq terak, arqon tortish, kurash, ko'pkari va bekinmachoq — brauzerda, bepul va serversiz. Yutuqlar va reyting bilan.",
  ),
  title: { absolute: "Milliy o'zbek o'yinlari | EnergyVibe" },
};

export default function Page() {
  return <HomeView />;
}
