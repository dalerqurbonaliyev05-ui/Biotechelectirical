import { isSupabaseConfigured } from '@/lib/env'
import { t } from '@/lib/i18n'
import { LoginForm } from './login-form'

export const metadata = { title: t.auth.loginTitle }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="text-brand-600 text-sm font-bold">{t.app.name}</p>
      <h1 className="mt-1 mb-6 text-2xl font-bold">{t.auth.loginTitle}</h1>
      {isSupabaseConfigured() ? (
        <LoginForm next={next} />
      ) : (
        <p className="card text-sm text-amber-700">{t.app.notConfigured}</p>
      )}
    </main>
  )
}
