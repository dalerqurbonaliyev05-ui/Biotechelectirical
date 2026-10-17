export type Lang = "uz" | "ru" | "en";
export const LANGS: readonly Lang[] = ["uz", "ru", "en"];
/** Uch tildagi qiymat */
export type L<T = string> = Record<Lang, T>;

export function isLang(v: unknown): v is Lang {
  return v === "uz" || v === "ru" || v === "en";
}

/** l("salom", "привет", "hi") — uch tilli qiymat yasash. */
export function l<T>(uz: T, ru: T, en: T): L<T> {
  return { uz, ru, en };
}
