import { AppShell } from '@/components/app-shell'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'

export default async function RatingLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('student')
  return (
    <AppShell profile={profile} nav={t.nav.student}>
      {children}
    </AppShell>
  )
}
