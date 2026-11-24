/**
 * Davomat hisobi (toza mantiq, Vitest bilan sinalgan). Server dars tugaganda shu funksiyalar bilan
 * har bir ishtirokchining holatini ('present' | 'nb') hisoblaydi.
 *
 *  - Dars davomiyligi = (tugash − boshlanish) − tanaffuslar.
 *  - Masofaviy talaba: faqat sahifa KO'RINIB turgan vaqt (heartbeat) hisoblanadi.
 *  - Auditoriyadagi talaba: QR bilan joyida ekani tasdiqlangan; telefon uxlab qolishi uni "yo'q" qilmasin,
 *    shuning uchun qo'shilgandan dars oxirigacha (tanaffussiz) hisoblanadi. CHEKLOV: erta ketib qolishni bilib bo'lmaydi
 *    (docs/limitations.md), o'qituvchi qo'lda tuzatishi mumkin.
 *  - Nisbat ≥ MIN_ATTENDANCE_RATIO → 'present', aks holda 'nb'.
 */
export const DEFAULT_MIN_ATTENDANCE_RATIO = 0.8
/** Juda qisqa dars (sinov/xato bilan boshlangan): qo'shilgan har kim 'present' */
export const MIN_MEANINGFUL_LESSON_SEC = 60

export interface Interval {
  start: Date
  end: Date | null // null — hali davom etyapti
}

const sec = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 1000)

/** [from, to] oralig'ining tanaffuslar bilan kesishgan soniyalari. */
export function overlapSeconds(from: Date, to: Date, breaks: Interval[]): number {
  let total = 0
  for (const b of breaks) {
    const s = Math.max(from.getTime(), b.start.getTime())
    const e = Math.min(to.getTime(), (b.end ?? to).getTime())
    if (e > s) total += (e - s) / 1000
  }
  return total
}

export function lessonSeconds(start: Date, end: Date, breaks: Interval[]): number {
  return Math.max(0, Math.floor(sec(start, end) - overlapSeconds(start, end, breaks)))
}

export interface ParticipantTimes {
  mode: 'auditorium' | 'remote' | null
  joinedAt: Date
  /** heartbeat bilan hisoblangan, sahifa ko'rinib turgan soniyalar */
  visibleSeconds: number
}

/** Ishtirokchining "darsda bo'lgan" soniyalari (yuqoridagi qoidalar bo'yicha). */
export function attendedSeconds(
  p: ParticipantTimes,
  lessonStart: Date,
  lessonEnd: Date,
  breaks: Interval[],
): number {
  const total = lessonSeconds(lessonStart, lessonEnd, breaks)
  if (p.mode === 'auditorium') {
    const from = p.joinedAt > lessonStart ? p.joinedAt : lessonStart
    return Math.min(total, lessonSeconds(from, lessonEnd, breaks))
  }
  return Math.min(total, Math.max(0, Math.floor(p.visibleSeconds)))
}

export type AttendanceStatus = 'present' | 'nb'

export function computeAttendance(
  attended: number,
  lesson: number,
  minRatio: number = DEFAULT_MIN_ATTENDANCE_RATIO,
): { ratio: number; status: AttendanceStatus } {
  if (lesson < MIN_MEANINGFUL_LESSON_SEC) return { ratio: attended > 0 ? 1 : 0, status: 'present' }
  const ratio = Math.min(1, Math.max(0, attended / lesson))
  const r = Math.round(ratio * 1000) / 1000
  return { ratio: r, status: ratio >= minRatio ? 'present' : 'nb' }
}

/** O'qituvchi tuzatishi bor bo'lsa — o'sha, bo'lmasa avtomatik holat. */
export const effectiveStatus = (
  status: AttendanceStatus,
  override: AttendanceStatus | null | undefined,
): AttendanceStatus => override ?? status
