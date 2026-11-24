/**
 * Kitob havolasi. Kutubxona (`/kutubxona/`) chuqur havolasi: `#/kitob/<id>/<bet>`,
 * `id` = kitob fayl nomi (books.json dagi id). Boshqa kutubxona uchun faqat shu funksiya o'zgaradi.
 */
export function bookUrl(base: string, slug: string, page?: number | null): string {
  const root = base.replace(/\/$/, '')
  const id = encodeURIComponent(slug)
  return `${root}/#/kitob/${id}${page && page > 0 ? `/${page}` : ''}`
}
