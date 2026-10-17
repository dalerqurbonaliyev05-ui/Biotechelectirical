"use client";

// Mini-o'yinlar reyestri: har biri alohida bo'lak sifatida kechiktirib yuklanadi (next/dynamic).

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { INSPECTION_CASES } from "../../data/minigames";
import type { MeasurementDef } from "../../engine/scenario";
import { uz } from "../../i18n/uz";
import type { MiniGameProps } from "./common";

const loading = () => <p className="p-6 text-center text-muted">{uz.mini.loading}</p>;

export type MiniGameKind = "inspection" | "megger" | "oilSample" | "gasSample" | "thermo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- har o'yinning qo'shimcha xususiyatlari bor
export const MINI_GAMES: Record<MiniGameKind, ComponentType<MiniGameProps & Record<string, any>>> = {
  inspection: dynamic(() => import("./InspectionGame"), { ssr: false, loading }),
  megger: dynamic(() => import("./MeggerGame"), { ssr: false, loading }),
  oilSample: dynamic(() => import("./OilTestGame"), { ssr: false, loading }),
  gasSample: dynamic(() => import("./GasRelayGame"), { ssr: false, loading }),
  thermo: dynamic(() => import("./ThermometerGame"), { ssr: false, loading }),
};

export const MINI_GAME_ORDER: MiniGameKind[] = ["inspection", "megger", "oilSample", "gasSample", "thermo"];

/** Stsenariy o'lchovi uchun mini-o'yin bormi (ko'rik — faqat ma'lum transformator holatlari uchun). */
export function miniGameFor(def: MeasurementDef, category?: string): MiniGameKind | null {
  if (def.kind === "oilSample" || def.kind === "gasSample") return def.kind;
  if (def.kind === "inspection" && category && INSPECTION_CASES[category]) return "inspection";
  return null;
}
