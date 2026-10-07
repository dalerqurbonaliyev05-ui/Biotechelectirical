import type { L } from "@/lib/i18n/types";

export interface Section {
  h?: string;
  p?: string[];
  ul?: string[];
}

/** O'yin sahifasining "Qoidalari" va "Tarixi va qiziq faktlar" tablari uchun matnlar. */
export interface GameContent {
  rules: L<Section[]>;
  history: L<Section[]>;
  facts: L<string[]>;
}
