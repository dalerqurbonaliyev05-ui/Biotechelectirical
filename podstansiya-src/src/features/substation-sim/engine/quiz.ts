// Markalar viktorinasi: savollar transformator modellari va marka harflari ma'lumotidan urug' bo'yicha tuziladi.
// Savol turlari: harf ma'nosi, markani tanlash (tavsif bo'yicha), quvvatni o'qish, yuklamaga marka tanlash.

import { MARK_LETTERS } from "../data/markLetters";
import { NORMS } from "../data/norms";
import { TRANSFORMER_MODELS, type TransformerModel } from "../data/transformers";
import { createRng, type Rng } from "./events";
import { decodeMark } from "./markDecoder";

export type QuizKind = "letter" | "describe" | "power" | "select";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  kind: QuizKind;
  prompt: string;
  options: QuizOption[];
  correctId: string;
  explain: string;
}

const pick = <T,>(rng: Rng, a: readonly T[]): T => a[Math.floor(rng() * a.length)];

function shuffle<T>(rng: Rng, a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** To'g'ri javob + chalg'ituvchilar (takrorlanmas), aralashtirilgan. */
function options(rng: Rng, correct: string, wrong: string[], n = 4): { options: QuizOption[]; correctId: string } {
  const uniq = [...new Set(wrong.filter((w) => w !== correct))];
  const all = shuffle(rng, [correct, ...shuffle(rng, uniq).slice(0, n - 1)]);
  return { options: all.map((text, i) => ({ id: String.fromCharCode(97 + i), text })), correctId: String.fromCharCode(97 + all.indexOf(correct)) };
}

const models = () => Object.values(TRANSFORMER_MODELS);
const describe = (m: TransformerModel) =>
  decodeMark(m.markCyr)
    .letters.map((l) => l.meaning)
    .join("; ");
const mva = (kva: number) => `${String(kva / 1000).replace(".", ",")} MVA`;

function letterQ(rng: Rng): Omit<QuizQuestion, "id"> {
  const m = pick(rng, models());
  const d = decodeMark(m.markCyr);
  const l = pick(rng, d.letters);
  const wrong = MARK_LETTERS.map((x) => x.meaning).filter((x) => x !== l.meaning);
  return {
    kind: "letter",
    prompt: `«${m.markCyr}» markasidagi «${l.code}» nimani bildiradi?`,
    ...options(rng, l.meaning, wrong),
    explain: `${m.markCyr}: ${d.letters.map((x) => `${x.code} — ${x.meaning}`).join("; ")}.`,
  };
}

function describeQ(rng: Rng): Omit<QuizQuestion, "id"> {
  // Bir xil harf tarkibli markalar bir-biriga chalg'ituvchi bo'lmasligi uchun harf qismi bo'yicha guruhlanadi
  const byHead = new Map<string, TransformerModel>();
  for (const m of models()) byHead.set(m.markCyr.split("-")[0], m);
  const heads = [...byHead.keys()];
  const head = pick(rng, heads);
  const m = byHead.get(head)!;
  return {
    kind: "describe",
    prompt: `Qaysi turdagi transformator: ${describe(m)}?`,
    ...options(rng, head, heads),
    explain: `${head}: ${describe(m)}. Raqamlar — quvvat (kVA) va YK kuchlanish sinfi (kV).`,
  };
}

function powerQ(rng: Rng): Omit<QuizQuestion, "id"> {
  const m = pick(rng, models());
  const d = decodeMark(m.markCyr);
  const kva = d.ratedKva!;
  const kv = d.hvClassKv!;
  const wrong = [`${String(kv).replace(".", ",")} MVA`, mva(kva * 10), mva(kva / 10), ...models().map((x) => mva(x.ratedMva.value * 1000))];
  return {
    kind: "power",
    prompt: `«${m.markCyr}» transformatorining nominal quvvati qancha?`,
    ...options(rng, mva(kva), wrong),
    explain: `Chiziqcha va kasr chizig'i orasidagi son — nominal quvvat kVA da (${kva} kVA = ${mva(kva)}); kasrdan keyingisi — YK kuchlanish sinfi (${kv} kV).`,
  };
}

/** Ikki transformatorli podstansiya: biri o'chganda ikkinchisi avariyaviy ortiqcha yuklanish bilan butun yuklamani oladi. */
function selectQ(rng: Rng): Omit<QuizQuestion, "id"> | null {
  const k = NORMS.transformerSelectionOverload.value;
  const families = new Map<string, TransformerModel[]>();
  for (const m of models()) {
    if (m.mvKv) continue; // uch o'ramlilar alohida
    const key = `${m.hvKv.value}/${m.lvKv.value}`;
    families.set(key, [...(families.get(key) ?? []), m]);
  }
  const fams = [...families.values()].filter((f) => f.length >= 3).map((f) => [...f].sort((a, b) => a.ratedMva.value - b.ratedMva.value));
  if (!fams.length) return null;
  const fam = pick(rng, fams);
  const i = 1 + Math.floor(rng() * (fam.length - 1));
  const right = fam[i];
  // Yuklama: oldingi model yetmaydigan, tanlangani yetadigan oraliqning o'rtasi
  const load = Math.round(((fam[i - 1].ratedMva.value + right.ratedMva.value) / 2) * k * 10) / 10;
  const kStr = String(k).replace(".", ",");
  const loadStr = String(load).replace(".", ",");
  return {
    kind: "select",
    prompt: `Ikki transformatorli ${right.hvKv.value}/${right.lvKv.value} kV podstansiya, hisobiy yuklama ${loadStr} MVA. Biri o'chganda ikkinchisi ${kStr} marta ortiqcha yuklanishga ruxsat etiladi (tekshirilsin). Eng tejamli to'g'ri variant?`,
    ...options(
      rng,
      `2 × ${right.markCyr}`,
      fam.filter((m) => m !== right).map((m) => `2 × ${m.markCyr}`),
    ),
    explain: `Shart: Snom × ${kStr} ≥ ${loadStr} MVA → Sном ≥ ${String(Math.round((load / k) * 100) / 100).replace(".", ",")} MVA. Kichigi yetmaydi, kattasi — ortiqcha zaxira.`,
  };
}

const KINDS: QuizKind[] = ["letter", "describe", "power", "select"];

export function makeQuiz(seed: number, count = 10): QuizQuestion[] {
  const rng = createRng(seed);
  const out: QuizQuestion[] = [];
  const seen = new Set<string>();
  for (let guard = 0; out.length < count && guard < count * 20; guard++) {
    const kind = KINDS[out.length % KINDS.length];
    const q = kind === "letter" ? letterQ(rng) : kind === "describe" ? describeQ(rng) : kind === "power" ? powerQ(rng) : selectQ(rng);
    if (!q || seen.has(q.prompt)) continue;
    seen.add(q.prompt);
    out.push({ id: `q${out.length + 1}`, ...q });
  }
  return out;
}
