"use client";
// Kutubxonasiz yengil i18n. Til tanlovi asosiy sayt bilan umumiy kalitda saqlanadi
// ("energyvibe-lang"), shuning uchun saytning boshqa sahifalarida tanlangan til bu yerda ham ishlaydi.
import { useCallback } from "react";
import { useRawStored, writeRaw } from "@/lib/games/storage";
import { en } from "./en";
import { ru } from "./ru";
import { uz, type Dict, type Key } from "./uz";
import { isLang, type L, type Lang } from "./types";

export type { Lang, L, Key };
export const LANG_KEY = "energyvibe-lang";
const DICTS: Record<Lang, Dict> = { uz, ru, en };

export function useLang(): Lang {
  const raw = useRawStored(LANG_KEY, "uz");
  return isLang(raw) ? raw : "uz";
}

export function setLang(lang: Lang): void {
  writeRaw(LANG_KEY, lang);
}

export type TFn = (key: Key, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? uz[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** t("kalit", { n: 3 }) — matnni joriy tilda qaytaradi. */
export function useT(): TFn {
  const lang = useLang();
  return useCallback<TFn>((key, vars) => translate(lang, key, vars), [lang]);
}

/** Uch tilli obyektdan joriy tildagisini tanlash: pick(info.title) */
export function usePick(): <T>(v: L<T>) => T {
  const lang = useLang();
  return useCallback(<T,>(v: L<T>) => v[lang] ?? v.uz, [lang]);
}
