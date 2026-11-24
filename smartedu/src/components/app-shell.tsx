import Link from 'next/link'
import { t } from '@/lib/i18n'
import type { SessionProfile } from '@/lib/types'

export interface NavItem {
  href: string
  label: string
}

/** Rol layout'lari uchun umumiy qobiq: yuqorida sarlavha + gorizontal (mobilda aylanadigan) navigatsiya. */
export function AppShell({
  profile,
  nav,
  children,
}: {
  profile: SessionProfile
  nav: readonly NavItem[]
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-brand-600 text-sm font-bold">{t.app.name}</p>
            <p className="truncate text-xs text-slate-500">
              {profile.full_name} · {t.roles[profile.role]}
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="btn-secondary" type="submit">
              {t.auth.logout}
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Asosiy">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-brand-50 hover:text-brand-700 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
