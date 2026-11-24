import 'server-only'
import { ApiError } from '@/lib/server/api'

const MAP: Record<string, [number, string]> = {
  not_found: [404, 'not_found'],
  session_not_found: [404, 'session_not_found'],
  not_your_group: [403, 'forbidden'],
  not_open: [409, 'not_open'],
  closed: [409, 'closed'],
  time_over: [409, 'time_over'],
  already_submitted: [409, 'already_submitted'],
  attempt_in_progress: [409, 'attempt_in_progress'],
  pending_review: [409, 'pending_review'],
  reason_required: [400, 'reason_required'],
  score_out_of_range: [400, 'score_out_of_range'],
  question_in_use: [409, 'question_in_use'],
  session_ended: [409, 'session_ended'],
  slide_out_of_range: [400, 'slide_out_of_range'],
  code_exhausted: [503, 'internal'],
}

/** DB funksiyalarining RAISE EXCEPTION xabarlarini ApiError'ga aylantiradi (boshqasini o'zgartirmaydi). */
export function mapDbError(err: { message?: string; code?: string } | null | undefined): never {
  const msg = err?.message ?? ''
  for (const [key, [status, code]] of Object.entries(MAP)) {
    if (msg.includes(key)) throw new ApiError(status, code)
  }
  if (err?.code === '23505') throw new ApiError(409, 'duplicate')
  if (err?.code === '23503') throw new ApiError(409, 'in_use')
  throw err ?? new Error('db_error')
}
