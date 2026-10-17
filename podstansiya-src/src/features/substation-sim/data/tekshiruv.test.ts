// Tekshiruv ro'yxati va data/norms.ts sinxronligi: har bir me'yor hujjatda bo'lishi shart.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listNorms } from "./norms";
import { TRANSFORMER_MODELS } from "./transformers";

const doc = readFileSync(fileURLToPath(new URL("../../../../docs/TEKSHIRUV-RO'YXATI.md", import.meta.url)), "utf8");

describe("docs/TEKSHIRUV-RO'YXATI.md", () => {
  it("barcha NORMS va THERMAL kalitlari ro'yxatda", () => {
    for (const { key } of listNorms()) expect(doc, key).toContain(`\`${key}\``);
  });
  it("barcha transformator modellari ro'yxatda", () => {
    for (const k of Object.keys(TRANSFORMER_MODELS)) expect(doc).toContain(`\`${k}.ratedMva\``);
  });
});
