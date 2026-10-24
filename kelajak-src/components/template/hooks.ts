"use client";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

function subscribeReduced(cb: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Foydalanuvchi tizimda "harakatni kamaytirish" ni yoqqanmi (serverda — false). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Element ekranga (yoki `rootMargin` chegarasiga) kirganini kuzatadi.
 * `once` = true bo'lsa, bir marta ko'ringandan keyin true bo'lib qoladi (lazy mount uchun).
 */
export function useInView<T extends Element>(ref: RefObject<T | null>, { rootMargin = "0px", once = false } = {}): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Juda eski brauzer: kuzatuvchi yo'q — darhol ko'rsatamiz (asinxron, effekt ichida sinxron setState bo'lmasin).
      const id = window.setTimeout(() => setSeen(true));
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) {
          setSeen(false);
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return seen;
}
