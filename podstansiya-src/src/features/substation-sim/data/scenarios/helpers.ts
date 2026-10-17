// Stsenariy yozishni qisqartiruvchi yordamchilar (buyruq, qaytarib o'qish, hisobot, jurnal qadamlari).
import type { DispatcherMessage, StepDef } from "../../engine/scenario";

export const DISPATCHER = "Dispetcher";

/** Dispetcher buyrug'i: to'g'ri qaytarib o'qish varianti + noto'g'rilar. */
export function order(
  id: string,
  text: string,
  ok: string,
  wrong: Array<[string, string]>,
  opts: { trigger?: DispatcherMessage["trigger"]; report?: { afterStep: string; text: string; requireGoals?: boolean }; at?: string; from?: string } = {},
): DispatcherMessage {
  return {
    id,
    trigger: opts.trigger ?? "start",
    at: opts.at,
    from: opts.from ?? DISPATCHER,
    text,
    isOrder: true,
    readback: {
      prompt: "Buyruqni qaytarib o'qing:",
      options: [{ id: "ok", text: ok, correct: true }, ...wrong.map(([t, why], i) => ({ id: `w${i + 1}`, text: t, correct: false, why }))],
    },
    expectsReport: opts.report,
  };
}

/** Faqat xabar (buyruqsiz), hisobot kutiladi. */
export function notice(
  id: string,
  text: string,
  opts: { trigger?: DispatcherMessage["trigger"]; report?: { afterStep: string; text: string; requireGoals?: boolean }; from?: string } = {},
): DispatcherMessage {
  return { id, trigger: opts.trigger ?? "start", from: opts.from ?? DISPATCHER, text, expectsReport: opts.report };
}

export const readbackStep = (id: string, messageId: string, label = "Buyruqni qaytarib o'qish va qabul qilish", after?: string[]): StepDef => ({
  id,
  label,
  match: { type: "readback", messageId },
  after,
  explain: "Buyruq so'zma-so'z, uskuna nomlari bilan qaytarib o'qiladi.",
});

export const reportStep = (id: string, messageId: string, after: string[], label = "Dispetcherga hisobot berish"): StepDef => ({
  id,
  label,
  match: { type: "report", messageId },
  after,
  explain: "Bajarilgani (yoki vaziyat) darhol dispetcherga xabar qilinadi.",
});

export const journalStep = (id: string, after: string[], label = "Operativ jurnalga yozish"): StepDef => ({
  id,
  label,
  match: { type: "journal" },
  after,
  explain: "Barcha kommutatsiyalar, signallar va qarorlar vaqti bilan jurnalga yoziladi.",
});

export const switchStep = (id: string, deviceId: string, to: "open" | "closed", label: string, after: string[], explain: string, extra: Partial<StepDef> = {}): StepDef => ({
  id,
  label,
  match: { type: "switch", deviceId, to },
  after,
  explain,
  ...extra,
});

export const ALL_LOADS = ["L-F35-1", "L-F35-2", "L-F10-1", "L-F10-2", "L-F10-3", "L-F10-4"];

/** T-2 ta'mirda (barcha yacheykalar o'chirilgan), yuklama SV orqali T-1 da. */
export const T2_OUT = {
  "Q-T2-110": "open",
  "Q-T2-35": "open",
  "Q-T2-10": "open",
  "QS-T2-110T": "open",
  "QS-T2-110B": "open",
  "QS-T2-35T": "open",
  "QS-T2-35B": "open",
  "QS-T2-10T": "open",
  "QS-T2-10B": "open",
  "Q-SV10": "closed",
  "Q-SV35": "closed",
} as const;
