import { uz } from "../i18n/uz";

/** "{device} ..." shablonini parametrlar bilan to'ldiradi. */
export function fmt(template: string | undefined, params?: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, k: string) => params?.[k] ?? "");
}

export function codeText(code: string, params?: Record<string, string>) {
  const c = uz.codes[code] ?? { title: code };
  return {
    title: fmt(c.title, params),
    why: fmt(c.why, params),
    consequence: fmt(c.consequence, params),
    correct: fmt(c.correct, params),
  };
}
