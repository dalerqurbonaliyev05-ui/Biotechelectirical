'use client'

import { t } from '@/lib/i18n'
import type { SlideBook } from '@/lib/session-state'

/**
 * Doskada slayd ostida (pastki ~60%) ochiladigan kitob qatlami. Kitob `iframe` ichida (sandbox) ko'rsatiladi;
 * kutubxona ramkada ochilishiga ruxsat bermasa — "Yangi oynada ochish" havolasi har doim ko'rinib turadi
 * (iframe bloklanganini brauzer sahifaga bildirmaydi). Havola faqat http(s) bo'lsa ko'rsatiladi.
 */
export function BookOverlay({ book, onClose }: { book: SlideBook; onClose: () => void }) {
  const safe = /^https?:\/\//i.test(book.url)
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex h-[62%] flex-col border-t-4 border-brand-600 bg-white text-slate-900 shadow-2xl"
      data-testid="book-overlay"
    >
      <div className="flex items-center justify-between gap-3 bg-slate-100 px-4 py-2 text-lg">
        <span className="truncate font-semibold">📖 {book.title}</span>
        <span className="flex shrink-0 items-center gap-3">
          {safe && (
            <a
              href={book.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 underline"
            >
              {t.books.openTab}
            </a>
          )}
          <button className="rounded bg-slate-300 px-3 py-1" onClick={onClose}>
            {t.books.close}
          </button>
        </span>
      </div>
      {safe ? (
        <iframe
          key={book.url}
          src={book.url}
          title={book.title}
          className="min-h-0 w-full flex-1 border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
          referrerPolicy="no-referrer"
          loading="lazy"
          allow="fullscreen"
        />
      ) : (
        <p className="p-6">{t.books.blocked}</p>
      )}
    </div>
  )
}
