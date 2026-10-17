// Kommutatsiya blankasi: talaba oldindan tuzgan amallar ketma-ketligini stsenariy qadamlari DAG'i
// bo'yicha tekshirish va bajarish paytida blankadan chetga chiqishni aniqlash.

import type { BlankSpec, StepDef } from "./scenario";

export interface BlankIssue {
  code: "blankExtra" | "blankMissing" | "blankOrder";
  params?: Record<string, string>;
}

/** Har bir qadamning barcha (tranzitiv) oldingi qadamlari. */
export function ancestors(steps: StepDef[]): Map<string, Set<string>> {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const memo = new Map<string, Set<string>>();
  const visit = (id: string, stack: Set<string>): Set<string> => {
    const cached = memo.get(id);
    if (cached) return cached;
    const out = new Set<string>();
    if (stack.has(id)) return out;
    stack.add(id);
    for (const p of byId.get(id)?.after ?? []) {
      out.add(p);
      for (const a of visit(p, stack)) out.add(a);
    }
    stack.delete(id);
    memo.set(id, out);
    return out;
  };
  for (const s of steps) visit(s.id, new Set());
  return memo;
}

export function checkBlank(order: readonly string[], spec: BlankSpec, steps: StepDef[]): BlankIssue[] {
  const issues: BlankIssue[] = [];
  const label = (id: string) => steps.find((s) => s.id === id)?.label ?? spec.distractors.find((d) => d.id === id)?.label ?? id;

  const extra = order.filter((id) => !spec.stepIds.includes(id));
  if (extra.length) issues.push({ code: "blankExtra", params: { items: extra.map(label).join("; ") } });

  const missing = spec.stepIds.filter((id) => !order.includes(id));
  if (missing.length) issues.push({ code: "blankMissing", params: { items: missing.map(label).join("; ") } });

  const anc = ancestors(steps);
  const optional = new Set(steps.filter((s) => s.optional).map((s) => s.id));
  const pos = new Map(order.map((id, i) => [id, i]));
  const wrong: string[] = [];
  for (const id of order) {
    for (const a of anc.get(id) ?? []) {
      if (optional.has(a)) continue;
      const pa = pos.get(a);
      if (pa !== undefined && pa > pos.get(id)!) wrong.push(`«${label(a)}» → «${label(id)}»`);
    }
  }
  if (wrong.length) issues.push({ code: "blankOrder", params: { pairs: wrong.slice(0, 4).join("; ") } });
  return issues;
}

/** Blanka bo'yicha keyingi bajarilishi kerak bo'lgan qadam. */
export function nextBlankStep(order: readonly string[], done: readonly string[], spec: BlankSpec): string | undefined {
  return order.find((id) => spec.stepIds.includes(id) && !done.includes(id));
}

/** Chalg'ituvchilar bilan aralashtirilgan kartalar (seed bo'yicha barqaror tartib). */
export function blankCards(spec: BlankSpec, steps: StepDef[], seed: number): Array<{ id: string; label: string }> {
  const cards = [
    ...spec.stepIds.map((id) => ({ id, label: steps.find((s) => s.id === id)?.label ?? id })),
    ...spec.distractors,
  ];
  let a = seed >>> 0;
  const rnd = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
