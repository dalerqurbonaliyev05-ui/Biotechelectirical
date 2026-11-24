import { notFound } from 'next/navigation'
import { getSessionProfile } from '@/lib/server/session'
import { LiveRoom } from './live-room'

export default async function LiveCodePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { code } = await params
  const { t } = await searchParams
  if (!/^\d{6}$/.test(code)) notFound()
  const profile = await getSessionProfile()
  // 'student' — ro'yxatdagi talaba; 'visitor' — kirmagan (mehmon sifatida qo'shilishi mumkin); 'staff' — o'qituvchi/admin
  const kind = !profile ? 'visitor' : profile.role === 'student' ? 'student' : 'staff'
  return (
    <LiveRoom
      code={code}
      qrToken={typeof t === 'string' ? t.slice(0, 100) : undefined}
      kind={kind}
    />
  )
}
