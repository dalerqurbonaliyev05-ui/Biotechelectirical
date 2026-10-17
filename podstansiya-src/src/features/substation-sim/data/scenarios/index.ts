// O'ynaladigan stsenariylar reyestri. Yangi stsenariy qo'shish: shu papkada SXX.ts yarating,
// shu yerga qo'shing va catalog.ts dagi `playable` ni true qiling.
import type { ScenarioDef } from "../../engine/scenario";
import { S01 } from "./S01";
import { S02 } from "./S02";
import { S03 } from "./S03";
import { S04 } from "./S04";
import { S05 } from "./S05";
import { S06 } from "./S06";
import { S07 } from "./S07";
import { S08 } from "./S08";
import { S09 } from "./S09";
import { S10 } from "./S10";
import { S11 } from "./S11";
import { S12 } from "./S12";
import { S13 } from "./S13";
import { S14 } from "./S14";
import { S15 } from "./S15";
import { S16 } from "./S16";
import { S17 } from "./S17";
import { S18 } from "./S18";
import { S19 } from "./S19";
import { S20 } from "./S20";
import { S21, buildShiftScenario } from "./S21";

export const SCENARIOS: Record<string, ScenarioDef> = {
  S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21,
};

/** Stsenariy; smena (S21) har safar urug' bo'yicha qayta quriladi. */
export function getScenario(id: string, seed = 1): ScenarioDef | undefined {
  if (id === "S21") return buildShiftScenario(seed);
  return SCENARIOS[id];
}
