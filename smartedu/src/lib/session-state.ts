/** Doska/talaba/o'qituvchi o'rtasida almashiladigan holat (maxfiy ma'lumot YO'Q). */
export interface SessionState {
  id: string
  rev: number
  slide: number
  pageCount: number
  status: 'active' | 'ended'
  code: string
  participants: number
  title: string
}

/** Realtime orqali kelgan (ishonchsiz) hodisa: faqat tur va oraliqni tekshiramiz. */
export function parseStateEvent(
  payload: unknown,
): Pick<SessionState, 'rev' | 'slide' | 'status'> | null {
  const p = payload as Partial<SessionState> | null
  if (!p || typeof p !== 'object') return null
  if (
    !Number.isInteger(p.rev) ||
    !Number.isInteger(p.slide) ||
    (p.slide as number) < 1 ||
    (p.slide as number) > 5000
  )
    return null
  if (p.status !== 'active' && p.status !== 'ended') return null
  return { rev: p.rev as number, slide: p.slide as number, status: p.status }
}

export const sessionChannel = (sessionId: string) => `session:${sessionId}`
