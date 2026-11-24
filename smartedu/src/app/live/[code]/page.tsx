import { notFound } from 'next/navigation'
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
  return <LiveRoom code={code} qrToken={typeof t === 'string' ? t.slice(0, 100) : undefined} />
}
