/**
 * Talabalar ma'lumoti sezgir: logga ism, kod, parol, javob matni CHIQARILMAYDI.
 * Faqat kontekst nomi va xato kodi/turi yoziladi.
 */
export function logError(context: string, err: unknown): void {
  const info =
    err && typeof err === 'object'
      ? {
          name: (err as { name?: string }).name,
          code: (err as { code?: string }).code,
          status: (err as { status?: number }).status,
        }
      : { name: typeof err }
  console.error(`[smartedu] ${context}`, JSON.stringify(info))
}
