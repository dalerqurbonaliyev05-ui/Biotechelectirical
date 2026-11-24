import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n'
import { getSessionProfile } from '@/lib/server/session'
import { ROLE_HOME } from '@/lib/types'
import { ChangePasswordForm } from './change-password-form'

export const metadata = { title: t.auth.changeTitle }

export default async function ChangePasswordPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (!profile.must_change_password) redirect(ROLE_HOME[profile.role])
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">{t.auth.changeTitle}</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">{t.auth.changeLead}</p>
      <ChangePasswordForm />
    </main>
  )
}
