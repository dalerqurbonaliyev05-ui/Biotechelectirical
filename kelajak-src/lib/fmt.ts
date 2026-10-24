// Sonlarni o'zbekcha ko'rinishda chiqarish: o'nlik vergul, minglar bo'sh joy bilan (1 234,5).

/** `digits` ta kasr xonasi bilan; NaN/Infinity bo'lsa "—". */
export function fmt(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return "—";
  const fixed = Math.abs(v) < 0.5 * 10 ** -digits ? (0).toFixed(digits) : v.toFixed(digits);
  const [int, frac] = fixed.split(".");
  const sign = int.startsWith("-") ? "−" : "";
  const grouped = int.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped}${frac ? `,${frac}` : ""}`;
}

/** Kattalikka qarab kasr xonalari soni avtomatik tanlanadi (3 ta muhim raqam atrofida). */
export function fmtAuto(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 100) return fmt(v, 0);
  if (a >= 10) return fmt(v, 1);
  if (a >= 1) return fmt(v, 2);
  if (a >= 0.01) return fmt(v, 3);
  return fmt(v, 4);
}

/** SI prefiks bilan: 0,0015 A → "1,5 mA". */
export function fmtSi(v: number, unit: string): string {
  if (!Number.isFinite(v)) return `— ${unit}`;
  const a = Math.abs(v);
  const table: [number, string][] = [
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "k"],
    [1, ""],
    [1e-3, "m"],
    [1e-6, "µ"],
    [1e-9, "n"],
  ];
  if (a === 0) return `0 ${unit}`;
  for (const [k, p] of table) {
    if (a >= k) return `${fmtAuto(v / k)} ${p}${unit}`;
  }
  return `${fmtAuto(v / 1e-9)} n${unit}`;
}
