// Tekshiruv ro'yxati va data/ fayllari sinxronligi.
// `npm run docs:tekshiruv` (TEKSHIRUV_WRITE=1) — 1–3-bo'lim jadvallarini data/ dan qayta yozadi,
// "Holat" ustunidagi belgilar (☐ ☑ ✎) kalit bo'yicha saqlanadi. Oddiy `npm test` faqat tekshiradi.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOAD_CURVES } from "./loadCurves";
import { listNorms, type Norm } from "./norms";
import { TRANSFORMER_MODELS } from "./transformers";

const DOC = fileURLToPath(new URL("../../../../docs/TEKSHIRUV-RO'YXATI.md", import.meta.url));
const SRC = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");

function sourceFiles(dir: string, base = dir): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) Object.assign(out, sourceFiles(p, base));
    else if (/\.(ts|tsx)$/.test(f) && !f.includes(".test.")) out[p.slice(base.length + 1)] = readFileSync(p, "utf8");
  }
  return out;
}

function val(v: unknown): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(", ");
  return String(v);
}

function usedIn(key: string, files: Record<string, string>): string {
  if (!key.startsWith("NORMS.")) return "`engine/thermal.ts`";
  const k = key.split(".")[1];
  const re = new RegExp(`NORMS\\.${k}\\b`);
  const list = Object.entries(files)
    .filter(([f, t]) => f !== "data/norms.ts" && re.test(t))
    .map(([f]) => `\`${f}\``)
    .sort();
  return list.join(", ") || "—";
}

/** Mavjud jadvaldan kalit → Holat belgisi. */
function statusMap(doc: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of doc.split("\n")) {
    const km = /^\| `([^`]+)` \|/.exec(line);
    const st = /\| ([☐☑✎]) \|\s*$/.exec(line);
    if (km && st) m.set(km[1], st[1]);
  }
  return m;
}

function buildTables(doc: string): Record<string, string> {
  const files = sourceFiles(SRC);
  const st = statusMap(doc);
  const status = (k: string) => st.get(k) ?? "☐";
  const norms = listNorms().map(({ key, norm }) => {
    const n = norm as Norm<unknown>;
    return `| \`${key}\` | ${val(n.value)} | ${n.unit} | ${n.kind} | ${n.verify ? "✅" : "—"} | ${n.note} | ${usedIn(key, files)} | ${status(key)} |`;
  });
  const fields = ["ratedMva", "hvKv", "mvKv", "lvKv", "vectorGroup", "ukPct", "noLoadLossKw", "loadLossKw", "noLoadCurrentPct", "cooling", "rpn", "regulation"] as const;
  const tr: string[] = [];
  for (const [k, m] of Object.entries(TRANSFORMER_MODELS)) {
    for (const f of fields) {
      const n = (m as unknown as Record<string, Norm<unknown> | undefined>)[f];
      if (n) tr.push(`| \`${k}.${f}\` | ${val(n.value)} | ${n.unit} | ${n.verify ? "✅" : "—"} | ${n.note} | ${status(`${k}.${f}`)} |`);
    }
  }
  const curves = Object.entries(LOAD_CURVES).map(
    ([k, c]) => `| \`LOAD_CURVES.${k}\` | ${val(c.value)} | ${c.unit} | ${c.verify ? "✅" : "—"} | ${c.note} | ${status(`LOAD_CURVES.${k}`)} |`,
  );
  return {
    NORMS: ["| Kalit | Qiymat | Birlik | Tur | verify | Izoh / manba | Qayerda ishlatiladi | Holat |", "|---|---|---|---|---|---|---|---|", ...norms].join("\n"),
    TRANSFORMERS: ["| Kalit | Qiymat | Birlik | verify | Izoh | Holat |", "|---|---|---|---|---|---|", ...tr].join("\n"),
    CURVES: ["| Kalit | Qiymat | Birlik | verify | Izoh | Holat |", "|---|---|---|---|---|---|", ...curves].join("\n"),
  };
}

function regenerate(doc: string): string {
  let out = doc;
  for (const [tag, table] of Object.entries(buildTables(doc))) {
    const re = new RegExp(`(<!-- AUTO:${tag}:START -->\\n)[\\s\\S]*?(\\n<!-- AUTO:${tag}:END -->)`);
    out = out.replace(re, `$1${table}$2`);
  }
  return out;
}

describe("docs/TEKSHIRUV-RO'YXATI.md", () => {
  it("jadvallar data/ fayllariga mos (kerak bo'lsa: npm run docs:tekshiruv)", () => {
    const doc = readFileSync(DOC, "utf8");
    const next = regenerate(doc);
    if (process.env.TEKSHIRUV_WRITE === "1") writeFileSync(DOC, next);
    else expect(next, "Jadvallar eskirgan — `npm run docs:tekshiruv` ni ishga tushiring").toBe(doc);
  });
});
