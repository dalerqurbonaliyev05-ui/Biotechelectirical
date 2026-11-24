import { AppShell } from '@/components/app-shell'
import { t } from '@/lib/i18n'
import { requireRole } from '@/lib/server/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('admin')
  return (
    <AppShell profile={profile} nav={t.nav.admin}>
      {children}
    </AppShell>
  )
}
