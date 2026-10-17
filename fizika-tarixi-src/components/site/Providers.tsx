"use client";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

/** Butun bo'lim uchun: html[lang] ni tanlangan til bilan sinxronlash. */
export default function Providers() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
