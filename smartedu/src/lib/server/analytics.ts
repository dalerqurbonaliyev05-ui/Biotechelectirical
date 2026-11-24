import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  attendanceSummary,
  liveQuestionShare,
  reactionMap,
  topicBreakdown,
  type AttendanceSummary,
  type SlideReaction,
  type TopicFact,
  type TopicStat,
} from '@/lib/analytics'
import { shortName } from '@/lib/live-rating'
import { fetchAll } from '@/lib/server/paginate'
import {
  assessmentContribution,
  computeSemester,
  semesterRanks,
  type AttemptFact,
  type LiveRow,
  type SemesterTotals,
} from '@/lib/semester'

/* ───────── O'qituvchi tahlili (foydalanuvchi sessiyasi: RLS faqat o'z fanlari/sessiyalarini beradi) ───────── */

export interface SessionSummary {
  id: string
  title: string
  startedAt: string
  status: 'active' | 'ended'
  participants: number
  auditorium: number
  answers: number
  correctPct: number
}

export interface SubjectOverview {
  sessions: SessionSummary[]
  topics: TopicStat[]
  weak: TopicStat[]
  assessmentAnswers: number
  liveAnswers: number
}

export async function loadSubjectOverview(
  db: SupabaseClient,
  subjectId: string,
): Promise<SubjectOverview> {
  const { data: sessionRows } = await db
    .from('lecture_sessions')
    .select('id, status, started_at, lectures!inner(title, subject_id)')
    .eq('lectures.subject_id', subjectId)
    .order('started_at', { ascending: false })
    .limit(20)
  const sessions = (sessionRows ?? []) as unknown as {
    id: string
    status: 'active' | 'ended'
    started_at: string
    lectures: { title: string }
  }[]
  const ids = sessions.map((s) => s.id)

  const [participants, liveAnswers] = ids.length
    ? await Promise.all([
        fetchAll<{ session_id: string; mode: string }>((a, b) =>
          db
            .from('session_participants')
            .select('id, session_id, mode')
            .in('session_id', ids)
            .order('id')
            .range(a, b),
        ),
        fetchAll<{
          session_id: string
          is_correct: boolean
          session_questions: { questions: { topic: string | null } | null } | null
        }>((a, b) =>
          db
            .from('session_answers')
            .select('id, session_id, is_correct, session_questions(questions(topic))')
            .in('session_id', ids)
            .order('id')
            .range(a, b),
        ),
      ])
    : [[], []]

  const summaries: SessionSummary[] = sessions.map((s) => {
    const p = participants.filter((x) => x.session_id === s.id)
    const ans = liveAnswers.filter((x) => x.session_id === s.id)
    return {
      id: s.id,
      title: s.lectures.title,
      startedAt: s.started_at,
      status: s.status,
      participants: p.length,
      auditorium: p.filter((x) => x.mode === 'auditorium').length,
      answers: ans.length,
      correctPct: liveQuestionShare({
        answered: ans.length,
        correct: ans.filter((x) => x.is_correct).length,
        participants: p.length,
      }).correctPct,
    }
  })

  // Mavzu bo'yicha jamlama: jonli javoblar + shu fandagi nazoratlarning baholangan javoblari
  const facts: TopicFact[] = liveAnswers.map((a) => ({
    topic: a.session_questions?.questions?.topic ?? null,
    isCorrect: a.is_correct,
  }))
  const { data: assessments } = await db
    .from('assessments')
    .select('id')
    .eq('subject_id', subjectId)
  const aIds = (assessments ?? []).map((a) => a.id as string)
  let assessmentAnswers = 0
  if (aIds.length) {
    const rows = await fetchAll<{
      is_correct: boolean
      questions: { topic: string | null } | null
    }>((a, b) =>
      db
        .from('answers')
        .select('id, is_correct, questions(topic), attempts!inner(assessment_id)')
        .in('attempts.assessment_id', aIds)
        .not('is_correct', 'is', null)
        .order('id')
        .range(a, b),
    )
    assessmentAnswers = rows.length
    for (const r of rows) facts.push({ topic: r.questions?.topic ?? null, isCorrect: r.is_correct })
  }
  const { stats, weak } = topicBreakdown(facts)
  return {
    sessions: summaries,
    topics: stats,
    weak,
    assessmentAnswers,
    liveAnswers: liveAnswers.length,
  }
}

export interface QuestionAnalytics {
  id: string
  slide: number
  text: string
  topic: string | null
  answered: number
  correct: number
  correctPct: number
  answeredPct: number
}

export interface SessionAnalytics {
  title: string
  startedAt: string
  participants: number
  auditorium: number
  remote: number
  guests: number
  questions: QuestionAnalytics[]
  topics: TopicStat[]
  /** NB/qatnashdi jamlamasi (faqat dars tugagach hisoblanadi; mehmonlarsiz) */
  attendance: AttendanceSummary & { avgRatioPct: number | null }
  /** Slaydlar bo'yicha "tushundim/tushunmadim" xaritasi */
  reactions: SlideReaction[]
  breaks: number
  totalReactions: number
}

export async function loadSessionAnalytics(
  db: SupabaseClient,
  sessionId: string,
): Promise<SessionAnalytics | null> {
  const { data: s } = await db
    .from('lecture_sessions')
    .select('id, started_at, lectures(title)')
    .eq('id', sessionId)
    .maybeSingle()
  if (!s) return null
  const [participants, questions, answers, attRows, reactRows, { count: breakCount }] =
    await Promise.all([
      fetchAll<{ mode: string; is_guest: boolean }>((a, b) =>
        db
          .from('session_participants')
          .select('id, mode, is_guest')
          .eq('session_id', sessionId)
          .order('id')
          .range(a, b),
      ),
      db
        .from('session_questions')
        .select('id, slide_no, questions(body, topic)')
        .eq('session_id', sessionId)
        .order('opened_at'),
      fetchAll<{ session_question_id: string; is_correct: boolean }>((a, b) =>
        db
          .from('session_answers')
          .select('id, session_question_id, is_correct')
          .eq('session_id', sessionId)
          .order('id')
          .range(a, b),
      ),
      fetchAll<{
        student_id: string
        status: 'present' | 'nb'
        override_status: 'present' | 'nb' | null
        attendance_ratio: number | null
      }>((a, b) =>
        db
          .from('attendance')
          .select('student_id, status, override_status, attendance_ratio')
          .eq('session_id', sessionId)
          .order('student_id')
          .range(a, b),
      ),
      fetchAll<{
        student_id: string
        slide_no: number
        kind: 'understood' | 'confused'
        cnt: number
      }>((a, b) =>
        db
          .from('session_reactions')
          .select('student_id, slide_no, kind, cnt')
          .eq('session_id', sessionId)
          .order('student_id')
          .order('slide_no')
          .order('kind')
          .range(a, b),
      ),
      db
        .from('session_breaks')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId),
    ])
  const qs = (
    (questions.data ?? []) as unknown as {
      id: string
      slide_no: number
      questions: { body: { text?: string }; topic: string | null } | null
    }[]
  ).map((q) => {
    const mine = answers.filter((a) => a.session_question_id === q.id)
    const correct = mine.filter((a) => a.is_correct).length
    const share = liveQuestionShare({
      answered: mine.length,
      correct,
      participants: participants.length,
    })
    return {
      id: q.id,
      slide: q.slide_no,
      text: String(q.questions?.body.text ?? ''),
      topic: q.questions?.topic ?? null,
      answered: mine.length,
      correct,
      ...share,
    }
  })
  const facts: TopicFact[] = qs.flatMap((q) =>
    [...Array(q.correct).fill(true), ...Array(q.answered - q.correct).fill(false)].map(
      (isCorrect: boolean) => ({ topic: q.topic, isCorrect }),
    ),
  )
  return {
    title: String((s.lectures as unknown as { title: string } | null)?.title ?? ''),
    startedAt: s.started_at as string,
    participants: participants.length,
    auditorium: participants.filter((p) => p.mode === 'auditorium').length,
    remote: participants.filter((p) => p.mode !== 'auditorium').length,
    guests: participants.filter((p) => p.is_guest).length,
    questions: qs,
    topics: topicBreakdown(facts, { minSample: 3 }).stats,
    attendance: {
      ...attendanceSummary(attRows.map((r) => ({ status: r.status, override: r.override_status }))),
      avgRatioPct: (() => {
        const rs = attRows.filter((r) => r.attendance_ratio !== null)
        return rs.length
          ? Math.round(
              (rs.reduce((n, r) => n + Number(r.attendance_ratio), 0) / rs.length) * 1000,
            ) / 10
          : null
      })(),
    },
    reactions: reactionMap(
      reactRows.map((r) => ({ slide: r.slide_no, kind: r.kind, cnt: Number(r.cnt) })),
    ),
    breaks: breakCount ?? 0,
    totalReactions: reactRows.reduce((n, r) => n + Number(r.cnt), 0),
  }
}

/* ───────── Semestr reytingi (service role: talabaning boshqa guruhdoshlari ballari serverda yig'iladi) ───────── */

export interface SemesterRow {
  studentId: string
  name: string
  code: string | null
  totals: SemesterTotals
  rank: number
}

export async function loadGroupSemester(
  admin: SupabaseClient,
  groupId: string,
): Promise<SemesterRow[]> {
  const { data: students } = await admin
    .from('profiles')
    .select('id, full_name, student_code')
    .eq('role', 'student')
    .eq('is_active', true)
    .eq('group_id', groupId)
    .order('full_name')
    .limit(1000)
  const list = students ?? []
  const ids = list.map((s) => s.id as string)
  if (ids.length === 0) return []

  const [live, attempts] = await Promise.all([
    fetchAll<LiveRow>((a, b) =>
      admin
        .from('scores')
        .select('session_id, student_id, total_points')
        .in('student_id', ids)
        .order('session_id')
        .order('student_id')
        .range(a, b),
    ),
    fetchAll<{
      student_id: string
      total_score: number
      max_score: number
      assessments: { weight: number } | null
    }>((a, b) =>
      admin
        .from('attempts')
        .select('id, student_id, total_score, max_score, assessments(weight)')
        .in('student_id', ids)
        .eq('status', 'finalized')
        .order('id')
        .range(a, b),
    ),
  ])
  const facts: AttemptFact[] = attempts.map((t) => ({
    student_id: t.student_id,
    total_score: Number(t.total_score ?? 0),
    max_score: Number(t.max_score ?? 0),
    weight: Number(t.assessments?.weight ?? 100),
  }))
  const totals = computeSemester(
    ids,
    live.map((l) => ({ student_id: l.student_id, total_points: Number(l.total_points) })),
    facts,
  )
  const ranks = semesterRanks(totals)
  return list
    .map((s) => ({
      studentId: s.id as string,
      name: String(s.full_name),
      code: (s.student_code as string | null) ?? null,
      totals: totals.get(s.id as string) as SemesterTotals,
      rank: ranks.get(s.id as string) as number,
    }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
}

export interface StudentSemester {
  mine: SemesterRow | null
  groupSize: number
  top: { rank: number; name: string; total: number; mine: boolean }[]
  average: number
  sessions: {
    title: string
    startedAt: string
    points: number
    correct: number
    answered: number
  }[]
  assessments: { title: string; total: number; max: number; weight: number; contribution: number }[]
}

export async function loadStudentSemester(
  admin: SupabaseClient,
  studentId: string,
  groupId: string | null,
): Promise<StudentSemester> {
  const empty: StudentSemester = {
    mine: null,
    groupSize: 0,
    top: [],
    average: 0,
    sessions: [],
    assessments: [],
  }
  const [group, sess, atts] = await Promise.all([
    groupId ? loadGroupSemester(admin, groupId) : Promise.resolve([] as SemesterRow[]),
    fetchAll<{
      total_points: number
      correct_count: number
      answered_count: number
      lecture_sessions: { started_at: string; lectures: { title: string } | null } | null
    }>((a, b) =>
      admin
        .from('scores')
        .select(
          'session_id, total_points, correct_count, answered_count, lecture_sessions(started_at, lectures(title))',
        )
        .eq('student_id', studentId)
        .order('session_id')
        .range(a, b),
    ),
    fetchAll<{
      total_score: number
      max_score: number
      assessments: { title: string; weight: number } | null
    }>((a, b) =>
      admin
        .from('attempts')
        .select('id, total_score, max_score, assessments(title, weight)')
        .eq('student_id', studentId)
        .eq('status', 'finalized')
        .order('id')
        .range(a, b),
    ),
  ])
  if (!group.length && !sess.length && !atts.length) return empty

  const mine = group.find((g) => g.studentId === studentId) ?? null
  return {
    mine,
    groupSize: group.length,
    // Reytingda boshqalarning ismlari qisqartirilgan ko'rinishda (shaxsiy ma'lumot minimal)
    top: group.slice(0, 5).map((g) => ({
      rank: g.rank,
      name: shortName(g.name),
      total: g.totals.total,
      mine: g.studentId === studentId,
    })),
    average: group.length
      ? Math.round((group.reduce((s, g) => s + g.totals.total, 0) / group.length) * 10) / 10
      : 0,
    sessions: sess
      .map((r) => ({
        title: r.lecture_sessions?.lectures?.title ?? '—',
        startedAt: r.lecture_sessions?.started_at ?? '',
        points: Number(r.total_points),
        correct: Number(r.correct_count),
        answered: Number(r.answered_count),
      }))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    assessments: atts.map((t) => ({
      title: t.assessments?.title ?? '—',
      total: Number(t.total_score ?? 0),
      max: Number(t.max_score ?? 0),
      weight: Number(t.assessments?.weight ?? 100),
      contribution: assessmentContribution(
        Number(t.total_score ?? 0),
        Number(t.max_score ?? 0),
        Number(t.assessments?.weight ?? 100),
      ),
    })),
  }
}
