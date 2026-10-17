// Transformator markasini o'qish: ТДТН-25000/110-У1 → harflar ma'nosi, quvvat, kuchlanish sinfi, iqlim.
// Kirill va lotin yozuvini qabul qiladi (ТМГ = TMG, ДЦ = DTs = DC).

import { CLIMATE, MARK_LETTERS, PLACEMENT, type MarkGroup, type MarkLetter } from "../data/markLetters";

export interface DecodedLetter {
  code: string;
  group: MarkGroup;
  meaning: string;
}

export interface DecodedMark {
  ok: boolean;
  /** Kirill yozuvidagi normallashgan marka */
  normalized: string;
  letters: DecodedLetter[];
  ratedKva?: number;
  hvClassKv?: number;
  climate?: string;
  errors: string[];
}

// Lotin → kirill (avval ikki harflilar)
const LAT: Array<[RegExp, string]> = [
  [/TS/g, "Ц"],
  [/KH|X/g, "Х"],
  [/C/g, "Ц"],
  [/A/g, "А"],
  [/O/g, "О"],
  [/T/g, "Т"],
  [/R/g, "Р"],
  [/D/g, "Д"],
  [/M/g, "М"],
  [/S/g, "С"],
  [/Z/g, "З"],
  [/G/g, "Г"],
  [/N/g, "Н"],
  [/U/g, "У"],
  [/L/g, "Л"],
];

export function toCyrillic(mark: string): string {
  let s = mark.trim().toUpperCase().replace(/\s+/g, "").replace(/[‐–—]/g, "-").replace(",", ".");
  for (const [re, c] of LAT) s = s.replace(re, c);
  return s;
}

/** Berilgan guruhdagi eng uzun mos belgini qidiradi. */
function take(s: string, pos: number, group: MarkGroup): MarkLetter | null {
  const cands = MARK_LETTERS.filter((l) => l.group === group && s.startsWith(l.cyr, pos)).sort((a, b) => b.cyr.length - a.cyr.length);
  return cands[0] ?? null;
}

const ORDER: MarkGroup[] = ["auto", "phases", "split", "cooling", "protection", "windings", "regulation"];

export function decodeMark(mark: string): DecodedMark {
  const normalized = toCyrillic(mark);
  const errors: string[] = [];
  const [head, ...rest] = normalized.split("-");
  const letters: DecodedLetter[] = [];
  let pos = 0;
  for (const g of ORDER) {
    const l = take(head, pos, g);
    // "А" faqat ortidan fazalar belgisi kelsa avtotransformator
    if (!l || (g === "auto" && !take(head, pos + 1, "phases"))) continue;
    letters.push({ code: l.cyr, group: g, meaning: l.meaning });
    pos += l.cyr.length;
  }
  if (pos < head.length) errors.push(`Noma'lum belgi: «${head.slice(pos)}»`);
  if (!letters.some((l) => l.group === "phases")) errors.push("Fazalar soni (Т yoki О) topilmadi");
  if (!letters.some((l) => l.group === "cooling")) errors.push("Sovutish turi topilmadi");

  let ratedKva: number | undefined;
  let hvClassKv: number | undefined;
  let climate: string | undefined;
  const nums = rest.find((x) => /^\d/.test(x));
  if (nums) {
    const m = nums.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) {
      ratedKva = Number(m[1]);
      hvClassKv = Number(m[2]);
    } else errors.push(`Quvvat/kuchlanish qismi noto'g'ri: «${nums}»`);
  } else errors.push("Quvvat va kuchlanish (masalan 25000/110) topilmadi");
  const cl = rest.find((x) => /^[А-ЯЁ]+\d?$/.test(x));
  if (cl) {
    const m = cl.match(/^([А-ЯЁ]+)(\d)?$/)!;
    const zone = CLIMATE[m[1]];
    if (zone) climate = [zone, m[2] ? PLACEMENT[m[2]] : undefined].filter(Boolean).join(", ");
    else errors.push(`Noma'lum iqlim belgisi: «${cl}»`);
  }
  return { ok: errors.length === 0, normalized, letters, ratedKva, hvClassKv, climate, errors };
}
