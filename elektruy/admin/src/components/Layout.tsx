import {
  BookOpen, Bot, ClipboardList, FileText, Flag, LayoutDashboard, LogOut, Package, Settings2, ShieldCheck, Star, Users, Wrench,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/lessons', label: 'Lessons', icon: BookOpen },
  { to: '/materials', label: 'Materials & prices', icon: Package },
  { to: '/config', label: 'Calc config', icon: Settings2 },
  { to: '/electricians', label: 'Electricians', icon: Wrench },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/reports', label: 'Reports', icon: Flag },
  { to: '/ai', label: 'AI checks', icon: Bot },
  { to: '/legal', label: 'Legal texts', icon: FileText },
  { to: '/audit', label: 'Audit log', icon: ClipboardList },
  { to: '/admins', label: 'Admins', icon: ShieldCheck },
]

export function Layout() {
  const { session } = useAuth()
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-muted/40 p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 py-1">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
          <div>
            <div className="font-bold leading-tight">ElektrUy</div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted', isActive && 'bg-primary/10 font-semibold text-primary')
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-3 border-t border-border pt-3">
          <div className="truncate px-2 text-xs text-muted-foreground" title={session?.user.email}>
            {session?.user.email}
          </div>
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={() => supabase.auth.signOut()}>
            <LogOut /> Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b border-border p-2 md:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('rounded px-2 py-1 text-xs whitespace-nowrap', isActive && 'bg-primary/10 text-primary')}>
              {label}
            </NavLink>
          ))}
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Loading() {
  return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
}

export function Empty({ text = 'Nothing here yet.' }: { text?: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>
}
