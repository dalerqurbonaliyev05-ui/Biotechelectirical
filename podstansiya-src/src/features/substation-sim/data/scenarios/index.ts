// O'ynaladigan stsenariylar reyestri. Yangi stsenariy qo'shish: shu papkada SXX.ts yarating,
// shu yerga qo'shing va catalog.ts dagi `playable` ni true qiling.
import type { ScenarioDef } from "../../engine/scenario";
import { S01 } from "./S01";
import { S02 } from "./S02";
import { S03 } from "./S03";
import { S04 } from "./S04";
import { S05 } from "./S05";

export const SCENARIOS: Record<string, ScenarioDef> = { S01, S02, S03, S04, S05 };

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS[id];
}
