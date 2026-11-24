import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/env'
import { t } from '@/lib/i18n'
import { getSessionProfile } from '@/lib/server/session'
import { ROLE_HOME } from '@/lib/types'

export default async function HomePage() {
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile()
    if (profile)
      redirect(profile.must_change_password ? '/change-password' : ROLE_HOME[profile.role])
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-4 py-12">
      <div>
        <p className="text-brand-600 text-sm font-semibold tracking-wide uppercase">{t.app.name}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{t.home.title}</h1>
        <p className="mt-3 text-lg text-slate-600">{t.home.lead}</p>
        <Link href="/login" className="btn-primary mt-6">
          {t.home.login}
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {t.home.features.map((f) => (
          <li key={f.title} className="card">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{f.text}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
