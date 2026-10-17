import ExperimentsView from "@/components/views/ExperimentsView";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/tajribalar/",
  "Tajribalar",
  "Arximed, Galiley, Nyuton, Faradey va boshqalarning tarixiy tajribalarini brauzerda takrorlang.",
);

export default function Page() {
  return <ExperimentsView />;
}
