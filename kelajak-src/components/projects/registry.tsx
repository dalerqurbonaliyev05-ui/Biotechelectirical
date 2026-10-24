"use client";
// Loyiha → qadam → {Visual, Sim} xaritasi. Har bir qadam alohida chunk sifatida lazy yuklanadi (next/dynamic, ssr: false),
// shuning uchun sahifa ochilganda faqat ekranga yaqin qadamlarning kodi yuklanadi.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export interface StepComponents {
  Visual?: ComponentType;
  Sim?: ComponentType;
}

export interface ProjectComponents {
  Hero?: ComponentType;
  steps: Record<string, StepComponents>;
}

const Loading = () => <div className="kl-ph" aria-hidden="true" />;

export const REGISTRY: Record<string, ProjectComponents> = {
  "aqlli-hisoblagich": {
    Hero: dynamic(() => import("./aqlli-hisoblagich/Hero"), { ssr: false, loading: Loading }),
    steps: {
      olchash: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S1Olchash").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S1Olchash").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
      adc: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S2Adc").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S2Adc").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
      esp32: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S3Esp32").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S3Esp32").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
      aloqa: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S4Aloqa").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S4Aloqa").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
      baza: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S5Baza").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S5Baza").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
      dashboard: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S6Dashboard").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S6Dashboard").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
      himoya: {
        Visual: dynamic(() => import("./aqlli-hisoblagich/S7Himoya").then((m) => m.Visual), { ssr: false, loading: Loading }),
        Sim: dynamic(() => import("./aqlli-hisoblagich/S7Himoya").then((m) => m.Sim), { ssr: false, loading: Loading }),
      },
    },
  },
};
