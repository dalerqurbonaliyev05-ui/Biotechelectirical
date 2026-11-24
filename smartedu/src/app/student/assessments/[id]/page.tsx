import { notFound } from 'next/navigation'
import { serverEnv } from '@/lib/env'
import { loadAttemptState } from '@/lib/server/assessments'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { AttemptRunner } from './attempt-runner'

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('student')
  const { id } = await params
  // RLS: faqat o'z guruhining e'lon qilingan nazorati ko'rinadi
  const { data: a } = await (
    await createClient()
  )
    .from('assessments')
    .select('id, title, description, duration_minutes, opens_at, closes_at')
    .eq('id', id)
    .maybeSingle()
  if (!a) notFound()

  const admin = createAdminClient()
  const { data: attempt } = await admin
    .from('attempts')
    .select('id')
    .eq('assessment_id', id)
    .eq('student_id', me.id)
    .maybeSingle()
  const state = attempt ? await loadAttemptState(admin, me.id, attempt.id as string) : null

  return (
    <AttemptRunner
      assessment={a}
      initialState={state}
      labBaseUrl={serverEnv().labBaseUrl}
      studentCode={me.student_code}
    />
  )
}
