// Naryad-ruxsatnoma: to'ldirilgan formani tekshirish va ish joyi tayyorligini (dopusk oldidan) baholash.
// Guruh talablari va brigada soni data/norms.ts da (verify).

import { NORMS } from "../data/norms";
import { parseTime } from "./journal";
import type { PermitSpec } from "./scenario";
import type { PermitForm, PermitPerson, SimState } from "./types";

export interface PermitIssue {
  code:
    | "permitIncomplete"
    | "permitGroupLow"
    | "permitBrigadeSmall"
    | "permitSwitchingWrong"
    | "permitEarthingWrong"
    | "permitPostersMissing"
    | "permitLivePartsWrong"
    | "permitTimeInvalid";
  params?: Record<string, string>;
}

export const PERMIT_ROLES = ["issuer", "admitter", "leader", "producer"] as const;
export type PermitRole = (typeof PERMIT_ROLES)[number];

export function roleMinGroup(role: PermitRole | "member"): number {
  switch (role) {
    case "issuer":
      return NORMS.permitIssuerMinGroup.value;
    case "admitter":
      return NORMS.permitAdmitterMinGroup.value;
    case "leader":
      return NORMS.permitLeaderMinGroup.value;
    case "producer":
      return NORMS.permitProducerMinGroup.value;
    case "member":
      return NORMS.permitMemberMinGroup.value;
  }
}

const filled = (p: PermitPerson | undefined) => !!p && p.name.trim().length > 0;

/** Ikki ro'yxat farqi: [yetishmagan, ortiqcha] */
function diff(given: readonly string[], expected: readonly string[]): [string[], string[]] {
  return [expected.filter((x) => !given.includes(x)), given.filter((x) => !expected.includes(x))];
}

export function checkPermit(form: PermitForm, spec: PermitSpec): PermitIssue[] {
  const issues: PermitIssue[] = [];

  const missingFields: string[] = [];
  if (!form.number.trim()) missingFields.push("raqam");
  if (!form.workName.trim()) missingFields.push("ish nomi");
  if (form.place !== spec.place) missingFields.push("ish joyi");
  for (const r of PERMIT_ROLES) if (!filled(form[r])) missingFields.push(r);
  if (missingFields.length) issues.push({ code: "permitIncomplete", params: { missing: missingFields.join(", ") } });

  const low: string[] = [];
  for (const r of PERMIT_ROLES) if (filled(form[r]) && form[r].group < roleMinGroup(r)) low.push(r);
  form.members.forEach((m, i) => {
    if (filled(m) && m.group < roleMinGroup("member")) low.push(`a'zo ${i + 1}`);
  });
  if (low.length) issues.push({ code: "permitGroupLow", params: { roles: low.join(", ") } });

  const brigade = 1 + form.members.filter(filled).length;
  if (brigade < NORMS.permitBrigadeMinSize.value) issues.push({ code: "permitBrigadeSmall", params: { size: String(brigade) } });

  const start = parseTime(form.startTime);
  const end = parseTime(form.endTime);
  if (start === null || end === null || end <= start) issues.push({ code: "permitTimeInvalid" });

  const [offMissing, offExtra] = diff(form.switchedOff, spec.required.switchedOff);
  if (offMissing.length || offExtra.length) {
    issues.push({ code: "permitSwitchingWrong", params: { missing: offMissing.join(", "), extra: offExtra.join(", ") } });
  }
  const [eMissing, eExtra] = diff(form.earthing, spec.required.earthing);
  if (eMissing.length || eExtra.length) {
    issues.push({ code: "permitEarthingWrong", params: { missing: eMissing.join(", "), extra: eExtra.join(", ") } });
  }
  const posterTargets = spec.required.posters.filter((p) => p.poster === "doNotSwitch").map((p) => p.targetId);
  const pMissing = posterTargets.filter((t) => !form.posters.includes(t));
  if (pMissing.length) issues.push({ code: "permitPostersMissing", params: { missing: pMissing.join(", ") } });

  const [lMissing, lExtra] = diff(form.liveParts, spec.required.liveParts);
  if (lMissing.length || lExtra.length) issues.push({ code: "permitLivePartsWrong", params: { missing: lMissing.join(", "), extra: lExtra.join(", ") } });

  return issues;
}

/** Dopusk oldidan ish joyi tayyormi: naryaddagi apparatlar ochiq, yerlagichlar ulangan, talab qilingan plakatlar osilgan. */
export function workplaceGaps(state: SimState, permit: PermitForm, spec: PermitSpec | undefined): string[] {
  const gaps: string[] = [];
  for (const d of permit.switchedOff) if (state.devices[d] !== "open") gaps.push(d);
  for (const e of new Set([...permit.earthing, ...(spec?.required.earthing ?? [])])) if (state.devices[e] !== "closed") gaps.push(e);
  for (const p of spec?.required.posters ?? []) if (!(state.posters[p.targetId] ?? []).includes(p.poster)) gaps.push(`${p.targetId} (plakat)`);
  return gaps;
}

/** Simulyatsiya vaqti naryad muddati ichidami. */
export function withinPermitTime(permit: PermitForm, nowSec: number): boolean {
  const start = parseTime(permit.startTime);
  const end = parseTime(permit.endTime);
  if (start === null || end === null) return false;
  const t = ((nowSec % 86400) + 86400) % 86400;
  return t >= start && t <= end;
}
