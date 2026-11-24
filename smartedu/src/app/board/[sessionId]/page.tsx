import { notFound } from 'next/navigation'
import { publicEnv } from '@/lib/env'
import { buildSessionState, findControlledSession, signedPdfUrl } from '@/lib/server/sessions'
import { requireRole } from '@/lib/server/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { BoardView } from './board-view'

export const metadata = { title: 'Doska' }

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Elektron doska: faqat sessiya egasi (yoki admin) ochadi — auditoriya kompyuterida o'z hisobi bilan. */
export default async function BoardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const me = await requireRole('teacher', 'admin')
  const { sessionId } = await params
  if (!GUID.test(sessionId)) notFound()
  const session = await findControlledSession(await createClient(), me, sessionId)
  if (!session) notFound()
  const admin = createAdminClient()
  const [state, pdfUrl] = await Promise.all([
    buildSessionState(admin, session),
    signedPdfUrl(admin, session.lecture_id),
  ])
  return <BoardView initial={state} pdfUrl={pdfUrl ?? ''} siteUrl={publicEnv().siteUrl} />
}
