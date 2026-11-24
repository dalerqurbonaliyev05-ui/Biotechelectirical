import 'server-only'

/**
 * Supabase (PostgREST) bir so'rovda standart bo'yicha eng ko'pi 1000 qator qaytaradi (`max_rows`) va ORTIG'INI
 * JIMGINA KESIB tashlaydi. Katta natijalar (eksport, tahlil, semestr) shu yordamchi bilan sahifalab o'qiladi.
 * `page` har safar BIR XIL tartibli (`.order(...)`) so'rov qaytarishi shart.
 */
export async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  opts: { pageSize?: number; max?: number } = {},
): Promise<T[]> {
  const size = opts.pageSize ?? 1000
  const max = opts.max ?? 200_000
  const out: T[] = []
  for (let from = 0; from < max; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) throw error
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < size) break
  }
  return out
}
