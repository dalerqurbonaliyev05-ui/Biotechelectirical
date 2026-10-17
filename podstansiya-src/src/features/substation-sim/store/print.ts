"use client";

import { create } from "zustand";

export type PrintDoc = "permit" | "blank" | "protocol" | "journal";

interface PrintStore {
  doc: PrintDoc | null;
  print: (doc: PrintDoc) => void;
  clear: () => void;
}

// Bitta hujjatni chop etish: PrintArea shu hujjatni oq fonli jadval ko'rinishida chizadi, so'ng window.print().
export const usePrint = create<PrintStore>()((set) => ({
  doc: null,
  print: (doc) => {
    set({ doc });
    window.setTimeout(() => window.print(), 50);
  },
  clear: () => set({ doc: null }),
}));
