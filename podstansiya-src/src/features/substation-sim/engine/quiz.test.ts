import { describe, expect, it } from "vitest";
import { NORMS } from "../data/norms";
import { TRANSFORMER_MODELS } from "../data/transformers";
import { makeQuiz } from "./quiz";

describe("markalar viktorinasi", () => {
  it("bir xil urug' — bir xil savollar; turlar aralash", () => {
    const a = makeQuiz(7);
    expect(makeQuiz(7)).toEqual(a);
    expect(a).toHaveLength(10);
    expect(new Set(a.map((q) => q.kind))).toEqual(new Set(["letter", "describe", "power", "select"]));
    expect(makeQuiz(8).map((q) => q.prompt)).not.toEqual(a.map((q) => q.prompt));
  });
  it("har savolda variantlar takrorlanmaydi va to'g'ri javob bor", () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const q of makeQuiz(seed)) {
        const texts = q.options.map((o) => o.text);
        expect(new Set(texts).size, q.prompt).toBe(texts.length);
        expect(texts.length, q.prompt).toBeGreaterThanOrEqual(2);
        expect(q.options.some((o) => o.id === q.correctId), q.prompt).toBe(true);
      }
    }
  });
  it("tanlash savoli: to'g'ri javob yetadi, kichigi yetmaydi", () => {
    const k = NORMS.transformerSelectionOverload.value;
    for (let seed = 1; seed <= 40; seed++) {
      for (const q of makeQuiz(seed).filter((x) => x.kind === "select")) {
        const load = Number(q.prompt.match(/yuklama ([\d,]+) MVA/)![1].replace(",", "."));
        const right = q.options.find((o) => o.id === q.correctId)!.text.replace("2 × ", "");
        const model = Object.values(TRANSFORMER_MODELS).find((m) => m.markCyr === right)!;
        expect(model.ratedMva.value * k).toBeGreaterThanOrEqual(load);
        for (const o of q.options.filter((x) => x.id !== q.correctId)) {
          const m = Object.values(TRANSFORMER_MODELS).find((x) => x.markCyr === o.text.replace("2 × ", ""))!;
          // Noto'g'ri variant: yo yetmaydi, yo kattaroq (ortiqcha zaxira)
          expect(m.ratedMva.value * k < load || m.ratedMva.value > model.ratedMva.value).toBe(true);
        }
      }
    }
  });
});
