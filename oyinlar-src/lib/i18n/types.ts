export type Lang = "uz" | "ru" | "en";
export const LANGS: readonly Lang[] = ["uz", "ru", "en"];
/** Uch tildagi qiymat */
export type L<T = string> = Record<Lang, T>;

export function isLang(v: unknown): v is Lang {
  return v === "uz" || v === "ru" || v === "en";
}
