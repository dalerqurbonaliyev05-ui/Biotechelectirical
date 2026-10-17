// Avtomatika sozlamalari: ABR — seksiyada kuchlanish (avtomatik o'chish natijasida) yo'qolsa,
// kirish o'chirgichini o'chirib, seksiya o'chirgichini ulaydi.

export interface AbrConfig {
  sv: string;
  /** Seksiya shinasi → uning kirish o'chirgichlari */
  inputs: Record<string, string[]>;
}

export const ABR_CONFIG: AbrConfig[] = [
  { sv: "Q-SV110", inputs: { "B110-1": ["Q-W1"], "B110-2": ["Q-W2"] } },
  { sv: "Q-SV35", inputs: { "B35-1": ["Q-T1-35"], "B35-2": ["Q-T2-35"] } },
  { sv: "Q-SV10", inputs: { "B10-1": ["Q-T1-10"], "B10-2": ["Q-T2-10"] } },
];
