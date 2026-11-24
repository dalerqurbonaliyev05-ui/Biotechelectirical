import { AppShell } from '@/components/app-shell'
import { t } from '@/lib/i18n'
import { getSessionProfile } from '@/lib/server/session'

/** /live: ro'yxatdagi talaba (navigatsiya bilan) ham, mehmon (faqat shu sahifa) ham. */
export default async function LiveLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (profile?.role === 'student' && !profile.must_change_password) {
    return (
      <AppShell profile={profile} nav={t.nav.student}>
        {children}
      </AppShell>
    )
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3 text-sm font-bold text-brand-600">
        {t.app.name}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
