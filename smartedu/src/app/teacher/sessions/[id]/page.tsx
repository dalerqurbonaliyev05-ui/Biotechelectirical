import { notFound } from 'next/navigation'
import { publicEnv } from '@/lib/env'
import { buildSessionState, findControlledSession, signedPdfUrl } from '@/lib/server/sessions'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SessionControl } from './session-control'

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('teacher', 'admin')
  const { id } = await params
  if (!GUID.test(id)) notFound()
  const session = await findControlledSession(await createClient(), me, id)
  if (!session) notFound()
  const admin = createAdminClient()
  const [state, pdfUrl] = await Promise.all([
    buildSessionState(admin, session),
    signedPdfUrl(admin, session.lecture_id),
  ])
  return <SessionControl initial={state} pdfUrl={pdfUrl ?? ''} siteUrl={publicEnv().siteUrl} />
}
