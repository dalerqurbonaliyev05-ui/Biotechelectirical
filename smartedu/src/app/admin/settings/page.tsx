import { requireRole } from '@/lib/server/session'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  await requireRole('admin')
  const supabase = await createClient()
  const { data } = await supabase.from('app_settings').select('key, value')
  const values: Record<string, number> = {}
  for (const r of data ?? []) values[String(r.key)] = Number(r.value)
  return <SettingsForm initial={values} />
}
