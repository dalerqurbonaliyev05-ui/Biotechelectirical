import Link from 'next/link'
import { t } from '@/lib/i18n'

export default function AdminHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.adminHome.title}</h1>
      <p className="text-slate-600">{t.adminHome.lead}</p>
      <Link href="/admin/students" className="btn-primary">
        {t.nav.admin[1]?.label}
      </Link>
    </div>
  )
}
