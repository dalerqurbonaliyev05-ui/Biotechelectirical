'use client'

import { t } from '@/lib/i18n'
import type { LiveQuestionView } from '@/lib/live-question'
import type { RatingRow } from '@/lib/live-rating'
import type { QuestionStats } from '@/lib/server/live-questions'
import { secondsLeft } from '@/lib/use-countdown'

const L = t.live
const LETTERS = 'ABCDEFGH'

/** Elektron doska: savol, taymer, jonli javoblar statistikasi; yopilgach — to'g'ri javob va reyting. Katta shrift. */
export function BoardQuestion({
  question,
  stats,
  left,
  top,
  bonusNames,
}: {
  question: LiveQuestionView
  stats: QuestionStats | null
  left: number | null
  top: RatingRow[] | null
  /** Bonus savol: eng faol talabalar ismlari (faqat o'qituvchi yoqqan bo'lsa) */
  bonusNames?: string[]
}) {
  const closed = question.status === 'closed'
  const answered = stats?.answered ?? 0
  const participants = stats?.participants ?? 0
  const maxCount = Math.max(1, ...Object.values(stats?.counts ?? {}))
  const correctIds = new Set(stats?.correct?.ids ?? [])
  const secs = secondsLeft(left)
  const timeUp = !closed && left !== null && left <= 0

  return (
    <div className="flex h-full gap-8 bg-slate-900 p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <p className="text-2xl text-slate-400">
            {question.targeted ? (
              <span className="text-amber-300">
                ⭐ {t.reactions.bonusFor} · {t.reactions.mostActive}
                {bonusNames && bonusNames.length > 0 ? `: ${bonusNames.join(', ')}` : ''}
              </span>
            ) : (
              L.question
            )}
          </p>
          {!closed && (
            <p
              className={`rounded-2xl px-6 py-2 font-mono text-7xl leading-none font-bold tabular-nums ${secs <= 5 ? 'bg-red-600' : 'bg-white/10'}`}
              aria-live="off"
            >
              {timeUp ? L.timeUp : secs}
            </p>
          )}
        </div>
        <p className="text-5xl leading-tight font-semibold whitespace-pre-wrap">{question.text}</p>

        {question.type === 'mcq' ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {question.options?.map((o, i) => {
              const n = stats?.counts?.[o.id] ?? 0
              const isCorrect = closed && correctIds.has(o.id)
              return (
                <li
                  key={o.id}
                  className={`relative overflow-hidden rounded-2xl border-4 p-5 ${isCorrect ? 'border-green-500 bg-green-900/40' : closed ? 'border-transparent bg-white/5 opacity-60' : 'border-transparent bg-white/10'}`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-white/10"
                    style={{ width: `${(n / maxCount) * 100}%` }}
                  />
                  <div className="relative flex items-center gap-4 text-3xl">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold">
                      {LETTERS[i]}
                    </span>
                    <span className="min-w-0 flex-1">{o.text}</span>
                    <span className="font-mono text-4xl font-bold tabular-nums">{n}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          closed &&
          stats?.correct && (
            <p className="rounded-2xl bg-green-900/40 p-6 text-5xl">
              {L.correctAnswer}: <b>{stats.correct.text}</b>
            </p>
          )
        )}

        <p className="mt-auto text-3xl text-slate-300">
          <b className="text-white tabular-nums">{answered}</b> {L.ofTotal}{' '}
          <b className="text-white tabular-nums">{participants}</b> {L.answered}
          {closed && stats?.correct && (
            <>
              {' · '}
              <b className="text-green-400 tabular-nums">{stats.correct.count}</b> {L.correctShare}
            </>
          )}
        </p>
      </div>

      {closed && top && top.length > 0 && (
        <aside className="w-[28rem] shrink-0 rounded-2xl bg-white/5 p-6">
          <p className="mb-4 text-3xl font-semibold">{L.rating}</p>
          <ol className="space-y-3">
            {top.slice(0, 5).map((r) => (
              <li key={r.studentId} className="flex items-center gap-4 text-3xl">
                <span className="w-12 text-center">{r.medal ? L.medals[r.medal] : r.rank}</span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="font-mono font-bold tabular-nums">{r.points}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  )
}

/** Dars tugaganda: oltin/kumush/bronza va eng yaxshi 10 ta. */
export function BoardPodium({ top }: { top: RatingRow[] }) {
  const podium = top.filter((r) => r.medal)
  const rest = top.filter((r) => !r.medal).slice(0, 7)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/90 p-10">
      <p className="text-6xl font-bold">{L.finalRating}</p>
      {top.length === 0 ? (
        <p className="text-3xl text-slate-300">{L.ended}</p>
      ) : (
        <>
          <ul className="flex flex-wrap items-end justify-center gap-6">
            {podium.map((r) => (
              <li
                key={r.studentId}
                className={`rounded-3xl px-10 py-6 text-center ${r.medal === 'gold' ? 'bg-yellow-500/30 pb-10' : r.medal === 'silver' ? 'bg-slate-300/20' : 'bg-orange-700/30'}`}
              >
                <p className="text-8xl">{L.medals[r.medal as string]}</p>
                <p className="mt-2 text-5xl font-bold">{r.name}</p>
                <p className="font-mono text-4xl tabular-nums">
                  {r.points} {L.pointsShort}
                </p>
              </li>
            ))}
          </ul>
          {rest.length > 0 && (
            <ol start={4} className="grid grid-cols-2 gap-x-16 gap-y-2 text-3xl text-slate-200">
              {rest.map((r) => (
                <li key={r.studentId} className="flex gap-4">
                  <span className="w-10 text-right text-slate-400">{r.rank}.</span>
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="font-mono tabular-nums">{r.points}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
