import { notFound } from 'next/navigation'
import { CrudManager, type OptionsMap } from '@/components/crud-manager'
import { RESOURCES } from '@/lib/admin/resources'
import { createClient } from '@/lib/supabase/server'

export default async function ResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  const def = RESOURCES[resource]
  if (!def) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from(def.table)
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1000)

  const options: OptionsMap = {}
  for (const f of def.fields) {
    if (f.type === 'select' && f.optionsFrom) {
      const { data: opts } = await supabase.from(f.optionsFrom).select('id, name').order('name')
      options[f.key] = (opts ?? []).map((o) => ({ value: String(o.id), label: String(o.name) }))
    }
  }

  return (
    <CrudManager
      table={def.table}
      title={def.title}
      singular={def.singular}
      fields={def.fields}
      rows={(data ?? []) as { id: string }[]}
      options={options}
    />
  )
}
