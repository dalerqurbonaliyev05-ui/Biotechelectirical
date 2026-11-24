import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { pollTally, rankAsks, type PollOption, type PollOptionResult } from '@/lib/extras'

export interface PollView {
  id: string
  body: string
  status: 'open' | 'closed'
  options: PollOptionResult[]
  total: number
}

/** Joriy (ochiq, bo'lmasa oxirgi yopilgan) tezkor so'rov va natijasi. Ovoz beruvchilar KO'RSATILMAYDI (faqat sonlar). */
export async function currentPoll(
  admin: SupabaseClient,
  sessionId: string,
): Promise<PollView | null> {
  const { data: p } = await admin
    .from('session_polls')
    .select('id, body, options, closed_at')
    .eq('session_id', sessionId)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!p) return null
  const { data: votes } = await admin
    .from('session_poll_votes')
    .select('option_id')
    .eq('poll_id', p.id as string)
    .limit(5000)
  const t = pollTally(
    p.options as PollOption[],
    (votes ?? []).map((v) => v.option_id as string),
  )
  return {
    id: p.id as string,
    body: p.body as string,
    status: p.closed_at ? 'closed' : 'open',
    options: t.results,
    total: t.total,
  }
}

/** Doskaga o'qituvchi tanlagan savol (muallifsiz). */
export async function pinnedAsk(
  admin: SupabaseClient,
  sessionId: string,
): Promise<{ id: string; body: string } | null> {
  const { data } = await admin
    .from('session_asks')
    .select('id, body')
    .eq('session_id', sessionId)
    .eq('on_board', true)
    .maybeSingle()
  return data ? { id: data.id as string, body: data.body as string } : null
}

export interface AskView {
  id: string
  body: string
  votes: number
  answered: boolean
  onBoard: boolean
  createdAt: string
  /** Faqat so'rayotgan talabaning o'z savoli/ovozi uchun (boshqalarniki hech qachon) */
  mine?: boolean
  iVoted?: boolean
}

/**
 * Savollar ro'yxati. MUALLIF identifikatori hech qachon qaytarilmaydi: o'qituvchi ham, boshqa talabalar ham faqat matn va
 * ovoz sonini ko'radi (anonimlik). `viewerId` berilsa — o'z savollari va ovozlari belgilanadi.
 */
export async function loadAsks(
  admin: SupabaseClient,
  sessionId: string,
  viewerId?: string,
): Promise<AskView[]> {
  const { data: asks } = await admin
    .from('session_asks')
    .select('id, body, author_id, answered, hidden, on_board, created_at')
    .eq('session_id', sessionId)
    .order('created_at')
    .limit(500)
  const ids = (asks ?? []).map((a) => a.id as string)
  const votes: { ask_id: string; voter_id: string }[] = []
  for (let i = 0; i < ids.length; i += 80) {
    const { data } = await admin
      .from('session_ask_votes')
      .select('ask_id, voter_id')
      .in('ask_id', ids.slice(i, i + 80))
    votes.push(...((data ?? []) as { ask_id: string; voter_id: string }[]))
  }
  const count = new Map<string, number>()
  const mineVotes = new Set<string>()
  for (const v of votes) {
    count.set(v.ask_id, (count.get(v.ask_id) ?? 0) + 1)
    if (viewerId && v.voter_id === viewerId) mineVotes.add(v.ask_id)
  }
  const ranked = rankAsks(
    (asks ?? []).map((a) => ({
      id: a.id as string,
      body: a.body as string,
      votes: count.get(a.id as string) ?? 0,
      createdAt: a.created_at as string,
      hidden: Boolean(a.hidden),
      answered: Boolean(a.answered),
      authorId: a.author_id as string,
      onBoard: Boolean(a.on_board),
    })),
  )
  return ranked.map((a) => ({
    id: a.id,
    body: a.body,
    votes: a.votes,
    answered: a.answered,
    onBoard: a.onBoard,
    createdAt: a.createdAt,
    ...(viewerId ? { mine: a.authorId === viewerId, iVoted: mineVotes.has(a.id) } : {}),
  }))
}
