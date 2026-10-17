// Topologiya va sxema chizmasi variantlari (stsenariydagi `topology` maydoni bo'yicha).
import type { Topology } from "../engine/types";
import { TOPOLOGY } from "./equipment";
import { TOPOLOGY_35 } from "./equipment35";
import { SLD, type SldLayout } from "./layout";
import { SLD_35 } from "./layout35";

export type TopologyKey = "yangiobod" | "ps35";

export const TOPOLOGIES: Record<TopologyKey, { topology: Topology; layout: SldLayout; title: string; hasPlan: boolean }> = {
  yangiobod: { topology: TOPOLOGY, layout: SLD, title: "«Yangiobod» 110/35/10 kV", hasPlan: true },
  ps35: { topology: TOPOLOGY_35, layout: SLD_35, title: "«Yangi hayot» 35/10 kV", hasPlan: false },
};

export function topologyFor(key: TopologyKey | undefined) {
  return TOPOLOGIES[key ?? "yangiobod"];
}
