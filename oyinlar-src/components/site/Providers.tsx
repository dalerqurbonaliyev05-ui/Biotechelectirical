"use client";
import { useEffect } from "react";
import { unlockAudio } from "@/lib/games/audio";
import { useLang } from "@/lib/i18n";
import Toaster from "./Toaster";

/** Butun bo'lim uchun: html[lang] sinxronlash, ovozni birinchi harakatda yoqish, yutuq toastlari. */
export default function Providers() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const once = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
    window.addEventListener("pointerdown", once);
    window.addEventListener("keydown", once);
    return () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
  }, []);

  return <Toaster />;
}
