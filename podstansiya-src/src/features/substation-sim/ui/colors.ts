// Sxema ranglari (CSS o'zgaruvchilari — globals.css dagi dizayn tokenlari).
export const KV_COLOR: Record<number, string> = {
  110: "var(--color-v110)",
  35: "var(--color-v35)",
  10: "var(--color-v10)",
};
export const DEAD = "var(--color-dead)";
export const EARTH = "var(--color-earth)";

export function kvColor(kv: number): string {
  return KV_COLOR[kv] ?? "var(--color-accent)";
}
