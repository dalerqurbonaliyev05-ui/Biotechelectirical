// Sinov protokoli (izolyatsiya qarshiligi): absorbsiya koeffitsienti R60/R15 va zavod qiymati bilan
// solishtirish. Me'yorlar data/norms.ts da (verify).

import { NORMS } from "../data/norms";
import type { ProtocolSpec } from "./scenario";
import type { InsulationProtocolForm } from "./types";

export interface ProtocolIssue {
  code: "protocolIncomplete" | "protocolValues" | "protocolConclusion";
  params?: Record<string, string>;
}

export function absorption(r15: number, r60: number): number {
  return r15 > 0 ? r60 / r15 : 0;
}

/** O'ram izolyatsiyasi yaroqlimi (absorbsiya va zavod qiymatiga nisbat bo'yicha). */
export function windingFit(r: { r15: number; r60: number; factoryR60: number }): boolean {
  return absorption(r.r15, r.r60) >= NORMS.absorptionMin.value && r.r60 >= NORMS.insulationFactoryRatioMin.value * r.factoryR60;
}

export function expectedConclusion(spec: ProtocolSpec): "fit" | "unfit" {
  return spec.readings.every(windingFit) ? "fit" : "unfit";
}

const close = (a: number, b: number) => Math.abs(a - b) <= (Math.abs(b) * NORMS.protocolValueTolerancePct.value) / 100;

export function checkProtocol(form: InsulationProtocolForm, spec: ProtocolSpec): ProtocolIssue[] {
  const issues: ProtocolIssue[] = [];
  const missing = spec.readings.filter((r) => !form.rows.some((x) => x.winding === r.winding));
  if (missing.length) issues.push({ code: "protocolIncomplete", params: { items: missing.map((m) => m.label).join(", ") } });
  const wrong = spec.readings.filter((r) => {
    const row = form.rows.find((x) => x.winding === r.winding);
    return row && (!close(row.r15, r.r15) || !close(row.r60, r.r60));
  });
  if (wrong.length || !close(form.tempC, spec.tempC)) {
    issues.push({ code: "protocolValues", params: { items: [...wrong.map((w) => w.label), ...(close(form.tempC, spec.tempC) ? [] : ["harorat"])].join(", ") } });
  }
  if (form.conclusion !== expectedConclusion(spec)) issues.push({ code: "protocolConclusion" });
  return issues;
}
