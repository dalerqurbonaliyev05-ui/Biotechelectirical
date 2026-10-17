import HomeView from "@/components/views/HomeView";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/",
  "Fizika tarixi",
  "Arximeddan Eynshteyngacha: fizika tarixi xronologiyasi, buyuk olimlar va brauzerda takrorlanadigan interaktiv tajribalar.",
);

export default function Page() {
  return <HomeView />;
}
